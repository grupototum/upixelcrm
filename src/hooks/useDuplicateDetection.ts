import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Lead } from "@/types";
import { useAppState } from "@/contexts/AppContext";

export type DuplicateReason = "phone" | "email" | "name_company";
export type DuplicateConfidence = "alta" | "media";

export interface DuplicateGroup {
  id: string;
  reason: DuplicateReason;
  confidence: DuplicateConfidence;
  leads: Lead[];
  // The value that matched (e.g. phone suffix, email, name)
  matchValue: string;
}

// Normalize phone: keep only last 8 digits
function phoneSuffix(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8 ? digits.slice(-8) : digits;
}

// Normalize name: lowercase, remove accents, collapse whitespace
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function groupByKey<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = keyFn(item);
    if (!k) continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(item);
  }
  return map;
}

export function useDuplicateDetection() {
  const { leads } = useAppState();
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [scanning, setScanning] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const scan = useCallback(() => {
    setScanning(true);

    // Work on leads that have at least one contact field
    const candidates = leads.filter((l) => l.phone || l.email || l.name);

    const found: DuplicateGroup[] = [];
    const seenLeadIds = new Set<string>();

    // 1. Phone suffix match (HIGH confidence)
    const byPhone = groupByKey(
      candidates.filter((l) => l.phone),
      (l) => phoneSuffix(l.phone!)
    );
    for (const [suffix, group] of byPhone) {
      if (group.length < 2) continue;
      const id = `phone_${suffix}`;
      if (dismissed.has(id)) continue;
      found.push({ id, reason: "phone", confidence: "alta", leads: group, matchValue: suffix });
      group.forEach((l) => seenLeadIds.add(l.id));
    }

    // 2. Email match (HIGH confidence) — skip leads already in a phone group
    const byEmail = groupByKey(
      candidates.filter((l) => l.email && !seenLeadIds.has(l.id)),
      (l) => l.email!.toLowerCase().trim()
    );
    for (const [email, group] of byEmail) {
      if (group.length < 2) continue;
      const id = `email_${email}`;
      if (dismissed.has(id)) continue;
      found.push({ id, reason: "email", confidence: "alta", leads: group, matchValue: email });
      group.forEach((l) => seenLeadIds.add(l.id));
    }

    // 3. Name + company match (MEDIUM confidence) — skip leads already grouped
    const byNameCompany = groupByKey(
      candidates.filter((l) => l.company && !seenLeadIds.has(l.id)),
      (l) => `${normalizeName(l.name)}|${normalizeName(l.company!)}`
    );
    for (const [key, group] of byNameCompany) {
      if (group.length < 2) continue;
      const id = `name_company_${key}`;
      if (dismissed.has(id)) continue;
      const [name] = key.split("|");
      found.push({ id, reason: "name_company", confidence: "media", leads: group, matchValue: name });
      group.forEach((l) => seenLeadIds.add(l.id));
    }

    setGroups(found);
    setScanning(false);
    return found;
  }, [leads, dismissed]);

  // Merge: keep primaryId as the survivor, delete the rest
  const merge = useCallback(async (group: DuplicateGroup, primaryId: string) => {
    const sourceIds = group.leads.filter((l) => l.id !== primaryId).map((l) => l.id);
    if (sourceIds.length === 0) return;

    // Reassign related records to primary
    await Promise.all([
      supabase.from("conversations").update({ lead_id: primaryId }).in("lead_id", sourceIds),
      supabase.from("tasks").update({ lead_id: primaryId }).in("lead_id", sourceIds),
      supabase.from("timeline_events").update({ lead_id: primaryId }).in("lead_id", sourceIds),
    ]);

    // Merge tags and notes from duplicates into primary
    const primary = group.leads.find((l) => l.id === primaryId)!;
    const duplicates = group.leads.filter((l) => l.id !== primaryId);

    let mergedTags = [...(primary.tags || [])];
    let mergedNotes = primary.notes || "";
    duplicates.forEach((d) => {
      (d.tags || []).forEach((t) => { if (!mergedTags.includes(t)) mergedTags.push(t); });
      if (d.notes) mergedNotes += `\n[Nota mesclada]: ${d.notes}`;
    });

    await supabase.from("leads").update({ tags: mergedTags, notes: mergedNotes || null }).eq("id", primaryId);
    await supabase.from("leads").delete().in("id", sourceIds);

    setGroups((prev) => prev.filter((g) => g.id !== group.id));
  }, []);

  const dismiss = useCallback((groupId: string) => {
    setDismissed((prev) => new Set([...prev, groupId]));
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
  }, []);

  // Heurística para escolher o lead "principal" automaticamente:
  // - Mais campos preenchidos vence
  // - Em empate, o mais recente (created_at mais novo)
  const pickPrimary = useCallback((leads: Lead[]): string => {
    const score = (l: Lead) => {
      let s = 0;
      if (l.phone) s++;
      if (l.email) s++;
      if (l.company) s++;
      if (l.position) s++;
      if (l.city) s++;
      if (l.value) s++;
      if (l.tags?.length) s++;
      if (l.notes) s++;
      if (l.custom_fields && Object.keys(l.custom_fields).length > 0) s++;
      return s;
    };
    const sorted = [...leads].sort((a, b) => {
      const diff = score(b) - score(a);
      if (diff !== 0) return diff;
      const ad = new Date(a.created_at || 0).getTime();
      const bd = new Date(b.created_at || 0).getTime();
      return bd - ad;
    });
    return sorted[0].id;
  }, []);

  // Mescla vários grupos de uma vez. Para cada grupo, escolhe o primary
  // automaticamente (campos mais preenchidos + mais recente).
  // Processa em batches de 3 grupos paralelos (evita estourar conexões
  // simultâneas no Supabase, que tem limite de pool ~100).
  const mergeMany = useCallback(async (
    targetGroups: DuplicateGroup[],
    onProgress?: (done: number, total: number) => void,
  ): Promise<{ merged: number; failed: number }> => {
    let merged = 0;
    let failed = 0;
    const successIds: string[] = [];

    // Acumula sourceIds de todos os grupos para fazer 1 delete em lote no final
    const allSourceIds: string[] = [];
    const groupSourceIds = new Map<string, string[]>();

    const processGroup = async (g: DuplicateGroup): Promise<boolean> => {
      try {
        const primaryId = pickPrimary(g.leads);
        const sourceIds = g.leads.filter((l) => l.id !== primaryId).map((l) => l.id);
        if (sourceIds.length === 0) return true;

        const primary = g.leads.find((l) => l.id === primaryId)!;
        const duplicates = g.leads.filter((l) => l.id !== primaryId);

        // Merge tags + notes (cálculo local)
        let mergedTags = [...(primary.tags || [])];
        let mergedNotes = primary.notes || "";
        duplicates.forEach((d) => {
          (d.tags || []).forEach((t) => { if (!mergedTags.includes(t)) mergedTags.push(t); });
          if (d.notes) mergedNotes += `\n[Nota mesclada]: ${d.notes}`;
        });

        // Reassign + update primary em paralelo (4 ops por grupo)
        const results = await Promise.allSettled([
          supabase.from("conversations").update({ lead_id: primaryId }).in("lead_id", sourceIds),
          supabase.from("tasks").update({ lead_id: primaryId }).in("lead_id", sourceIds),
          supabase.from("timeline_events").update({ lead_id: primaryId }).in("lead_id", sourceIds),
          supabase.from("leads").update({ tags: mergedTags, notes: mergedNotes || null }).eq("id", primaryId),
        ]);

        results.forEach((r, idx) => {
          if (r.status === "rejected") {
            console.warn(`Group ${g.id} op ${idx} failed:`, r.reason);
          }
        });

        groupSourceIds.set(g.id, sourceIds);
        return true;
      } catch (err: any) {
        console.error(`Group ${g.id} merge failed:`, err);
        return false;
      }
    };

    // Processa em batches de 10 grupos paralelos
    // (4 ops por grupo × 10 grupos = 40 conexões — bem dentro do limite ~100)
    const BATCH_SIZE = 10;
    for (let i = 0; i < targetGroups.length; i += BATCH_SIZE) {
      const batch = targetGroups.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(processGroup));
      results.forEach((ok, idx) => {
        if (ok) {
          merged++;
          successIds.push(batch[idx].id);
        } else {
          failed++;
        }
      });
      onProgress?.(Math.min(i + BATCH_SIZE, targetGroups.length), targetGroups.length);
    }

    // Delete em lote único de TODOS os duplicados (1 query só, super rápido)
    successIds.forEach((id) => {
      const ids = groupSourceIds.get(id);
      if (ids) allSourceIds.push(...ids);
    });

    if (allSourceIds.length > 0) {
      // Delete em chunks de 500 (limite seguro do PostgREST .in())
      const DEL_CHUNK = 500;
      for (let i = 0; i < allSourceIds.length; i += DEL_CHUNK) {
        const slice = allSourceIds.slice(i, i + DEL_CHUNK);
        const { error: delError } = await supabase.from("leads").delete().in("id", slice);
        if (delError) {
          console.error("Bulk delete failed:", delError);
        }
      }
    }

    setGroups((prev) => prev.filter((g) => !successIds.includes(g.id)));
    return { merged, failed };
  }, [pickPrimary]);

  const totalDuplicates = groups.reduce((sum, g) => sum + g.leads.length - 1, 0);

  return { groups, scanning, scan, merge, mergeMany, dismiss, totalDuplicates, pickPrimary };
}
