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
  // Usa paralelização agressiva para rapidez: reassign todos em paralelo,
  // depois merge de todos em paralelo, depois delete de todos em lote.
  // Retorna { merged, failed } com a contagem.
  const mergeMany = useCallback(async (
    targetGroups: DuplicateGroup[],
    onProgress?: (done: number, total: number) => void,
  ): Promise<{ merged: number; failed: number }> => {
    let merged = 0;
    let failed = 0;
    const successIds: string[] = [];
    const allSourceIds: string[] = [];

    // Prepare all groups
    const prepared = targetGroups.map((g) => ({
      group: g,
      primaryId: pickPrimary(g.leads),
      sourceIds: g.leads.filter((l) => l.id !== pickPrimary(g.leads)).map((l) => l.id),
    }));

    try {
      // Reassign ALL records in parallel (conversations, tasks, timeline_events)
      const reassignTasks = prepared.flatMap(({ primaryId, sourceIds }) => [
        supabase.from("conversations").update({ lead_id: primaryId }).in("lead_id", sourceIds),
        supabase.from("tasks").update({ lead_id: primaryId }).in("lead_id", sourceIds),
        supabase.from("timeline_events").update({ lead_id: primaryId }).in("lead_id", sourceIds),
      ]);

      onProgress?.(0, targetGroups.length);
      await Promise.all(reassignTasks);
      onProgress?.(Math.round(targetGroups.length * 0.33), targetGroups.length);

      // Merge tags/notes in parallel
      const mergeTasks = prepared.map(async ({ group, primaryId }) => {
        const primary = group.leads.find((l) => l.id === primaryId)!;
        const duplicates = group.leads.filter((l) => l.id !== primaryId);

        let mergedTags = [...(primary.tags || [])];
        let mergedNotes = primary.notes || "";
        duplicates.forEach((d) => {
          (d.tags || []).forEach((t) => { if (!mergedTags.includes(t)) mergedTags.push(t); });
          if (d.notes) mergedNotes += `\n[Nota mesclada]: ${d.notes}`;
        });

        return supabase.from("leads")
          .update({ tags: mergedTags, notes: mergedNotes || null })
          .eq("id", primaryId);
      });

      await Promise.all(mergeTasks);
      onProgress?.(Math.round(targetGroups.length * 0.66), targetGroups.length);

      // Collect all source IDs and delete in one batch
      prepared.forEach(({ sourceIds }) => allSourceIds.push(...sourceIds));
      if (allSourceIds.length > 0) {
        await supabase.from("leads").delete().in("id", allSourceIds);
      }

      merged = targetGroups.length;
      successIds.push(...targetGroups.map((g) => g.id));
    } catch (err: any) {
      console.error("mergeMany error:", err);
      failed = targetGroups.length - merged;
    }

    onProgress?.(targetGroups.length, targetGroups.length);
    setGroups((prev) => prev.filter((g) => !successIds.includes(g.id)));
    return { merged, failed };
  }, [pickPrimary]);

  const totalDuplicates = groups.reduce((sum, g) => sum + g.leads.length - 1, 0);

  return { groups, scanning, scan, merge, mergeMany, dismiss, totalDuplicates, pickPrimary };
}
