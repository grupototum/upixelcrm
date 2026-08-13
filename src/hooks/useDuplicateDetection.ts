import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { logger } from "@/lib/logger";
import { Lead } from "@/types";
import { useAppState } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { resolveClientId } from "@/lib/tenant-utils";
import { normalizePhoneKey } from "@/utils/phone";
import {
  listAllLeads,
  reassignLeadRelations,
  reassignAndMergePrimary,
  updateLead,
  bulkDeleteLeads,
  bulkDeleteLeadsLogOnly,
  listDismissedDuplicateGroupKeys,
  insertDuplicateException,
  insertTimelineEvent,
} from "@/services/leads";

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

interface LeadNoteLike {
  id: string;
  lead_id: string;
  content: string;
  created_at: string;
  user_name: string;
  updated_at?: string;
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

function parseNotesLocal(raw: string | undefined | null): LeadNoteLike[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Junta as notas reais (não só o texto legado `.notes`) de primary + duplicatas. */
function mergeNotesLocal(primary: Lead, duplicates: Lead[]): string {
  const merged = [...parseNotesLocal(primary.notes_local)];
  for (const d of duplicates) {
    merged.push(...parseNotesLocal(d.notes_local));
  }
  return JSON.stringify(merged);
}

export function useDuplicateDetection() {
  const { leads: stateLeads } = useAppState();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const clientId = resolveClientId(tenant?.id, user?.client_id) ?? "";

  const { data: dbLeads = [] } = useQuery<Lead[]>({
    queryKey: ["all-leads-dedup", clientId],
    queryFn: () => listAllLeads(clientId),
    enabled: !!clientId && stateLeads.length === 0,
    staleTime: 60_000,
  });

  const leads = stateLeads.length > 0 ? stateLeads : dbLeads;

  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [scanning, setScanning] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Carrega os grupos já ignorados persistentemente (1x por client_id) — antes
  // era só useState local, e o mesmo par voltava a ser sugerido a cada F5.
  useEffect(() => {
    if (!clientId) return;
    let alive = true;
    listDismissedDuplicateGroupKeys(clientId)
      .then((keys) => { if (alive) setDismissed((prev) => new Set([...prev, ...keys])); })
      .catch((err) => logger.error("[useDuplicateDetection] load exceptions", err));
    return () => { alive = false; };
  }, [clientId]);

  const scan = useCallback(() => {
    setScanning(true);

    // Work on leads that have at least one contact field
    const candidates = leads.filter((l) => l.phone || l.email || l.name);

    const found: DuplicateGroup[] = [];
    const seenLeadIds = new Set<string>();

    // 1. Phone match (HIGH confidence) — normalizePhoneKey é a mesma função
    // usada na importação (utils/phone.ts), lida com +55/55/com-9/sem-9.
    // Antes esta tela tinha sua própria normalização (só últimos 8 dígitos
    // crus, sem DDD), divergente da usada no fluxo de importação.
    const byPhone = groupByKey(
      candidates.filter((l) => l.phone),
      (l) => normalizePhoneKey(l.phone!)
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
    await reassignLeadRelations(sourceIds, primaryId);

    // Merge tags, notas legadas (.notes) e notas reais (.notes_local) das
    // duplicatas no primary.
    const primary = group.leads.find((l) => l.id === primaryId)!;
    const duplicates = group.leads.filter((l) => l.id !== primaryId);

    const mergedTags = [...(primary.tags || [])];
    let mergedNotes = primary.notes || "";
    duplicates.forEach((d) => {
      (d.tags || []).forEach((t) => { if (!mergedTags.includes(t)) mergedTags.push(t); });
      if (d.notes) mergedNotes += `\n[Nota mesclada]: ${d.notes}`;
    });
    const mergedNotesLocal = mergeNotesLocal(primary, duplicates);

    // Falha em qualquer passo aborta: o grupo continua na lista e o caller
    // (DuplicatesPage) mostra o toast de erro — antes a UI dizia "mesclado"
    // mesmo com as duplicatas intactas no banco.
    await updateLead(primaryId, { tags: mergedTags, notes: mergedNotes || null, notes_local: mergedNotesLocal });
    await bulkDeleteLeads(sourceIds);

    // Best-effort: rastro na timeline do lead que sobreviveu.
    await insertTimelineEvent({
      client_id: primary.client_id,
      lead_id: primaryId,
      type: "note",
      content: `${duplicates.length} lead(s) duplicado(s) mesclado(s) neste lead (${duplicates.map((d) => d.name).join(", ")}).`,
      user_name: "Mesclagem de duplicatas",
    }).catch((err) => logger.error("[useDuplicateDetection] merge timeline event", err));

    setGroups((prev) => prev.filter((g) => g.id !== group.id));
  }, []);

  const dismiss = useCallback((groupId: string) => {
    setDismissed((prev) => new Set([...prev, groupId]));
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    if (clientId) {
      insertDuplicateException(clientId, tenant?.id ?? null, groupId)
        .catch((err) => logger.error("[useDuplicateDetection] persist exception", err));
    }
  }, [clientId, tenant?.id]);

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
    const timelineEvents: { client_id: string; lead_id: string; type: "note"; content: string; user_name: string }[] = [];

    const processGroup = async (g: DuplicateGroup): Promise<boolean> => {
      try {
        const primaryId = pickPrimary(g.leads);
        const sourceIds = g.leads.filter((l) => l.id !== primaryId).map((l) => l.id);
        if (sourceIds.length === 0) return true;

        const primary = g.leads.find((l) => l.id === primaryId)!;
        const duplicates = g.leads.filter((l) => l.id !== primaryId);

        // Merge tags + notes (cálculo local)
        const mergedTags = [...(primary.tags || [])];
        let mergedNotes = primary.notes || "";
        duplicates.forEach((d) => {
          (d.tags || []).forEach((t) => { if (!mergedTags.includes(t)) mergedTags.push(t); });
          if (d.notes) mergedNotes += `\n[Nota mesclada]: ${d.notes}`;
        });
        const mergedNotesLocal = mergeNotesLocal(primary, duplicates);

        // Reassign + update primary em paralelo (4 ops por grupo)
        const results = await reassignAndMergePrimary(sourceIds, primaryId, mergedTags, mergedNotes, mergedNotesLocal);

        results.forEach((r, idx) => {
          if (r.status === "rejected") {
            console.warn(`Group ${g.id} op ${idx} failed:`, r.reason);
          }
        });

        groupSourceIds.set(g.id, sourceIds);
        timelineEvents.push({
          client_id: primary.client_id,
          lead_id: primaryId,
          type: "note",
          content: `${duplicates.length} lead(s) duplicado(s) mesclado(s) neste lead (${duplicates.map((d) => d.name).join(", ")}).`,
          user_name: "Mesclagem de duplicatas",
        });
        return true;
      } catch (err) {
        console.error(`Group ${g.id} merge failed:`, err);
        return false;
      }
    };

    // Processa em batches de 50 grupos paralelos
    const BATCH_SIZE = 50;
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
      await bulkDeleteLeadsLogOnly(allSourceIds);
    }

    // Best-effort, em paralelo — não bloqueia o retorno da mesclagem em lote.
    void Promise.allSettled(timelineEvents.map((e) => insertTimelineEvent(e)));

    setGroups((prev) => prev.filter((g) => !successIds.includes(g.id)));
    return { merged, failed };
  }, [pickPrimary]);

  const totalDuplicates = groups.reduce((sum, g) => sum + g.leads.length - 1, 0);

  return { groups, scanning, scan, merge, mergeMany, dismiss, totalDuplicates, pickPrimary };
}
