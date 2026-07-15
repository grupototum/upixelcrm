import { supabase } from "@/integrations/supabase/client";
import { untypedFrom } from "@/lib/supabase-untyped";
import type { CustomFieldDefinition, Lead, TagMeta } from "@/types";

// Repositório do domínio leads (leads, tags, custom_field_definitions).
// Funções puras de acesso a dados: lançam o erro do Supabase (com .code/.message);
// toast, estado e regras de UI ficam nos hooks/componentes.

// ---- tags ----
// tags.client_id existe no banco mas não nos tipos gerados (schema drift)

export async function listTags(clientId: string): Promise<TagMeta[]> {
  const { data, error } = await untypedFrom("tags")
    .select("*")
    .eq("client_id", clientId)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data as unknown as TagMeta[]) || [];
}

export async function createTag(
  clientId: string,
  params: { name: string; color?: string; category?: string }
): Promise<TagMeta> {
  const { data, error } = await untypedFrom("tags")
    .insert({
      client_id: clientId,
      name: params.name,
      color: params.color || "#6366f1",
      category: params.category || "general",
    })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as TagMeta;
}

export async function updateTag(
  id: string,
  updates: Partial<Pick<TagMeta, "name" | "color" | "category">>
): Promise<void> {
  const { error } = await supabase.from("tags").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteTag(id: string): Promise<void> {
  const { error } = await supabase.from("tags").delete().eq("id", id);
  if (error) throw error;
}

// ---- custom_field_definitions ----

export async function listCustomFieldDefinitions(clientId: string): Promise<CustomFieldDefinition[]> {
  const { data, error } = await supabase
    .from("custom_field_definitions")
    .select("*")
    .eq("client_id", clientId)
    .order("display_order", { ascending: true });
  if (error) throw error;
  return (data as unknown as CustomFieldDefinition[]) || [];
}

export async function createCustomFieldDefinition(
  row: Pick<CustomFieldDefinition, "client_id" | "name" | "slug" | "field_type"> &
    Partial<Pick<CustomFieldDefinition, "options" | "is_required" | "visible_pipelines" | "display_order">>
): Promise<CustomFieldDefinition> {
  const { data, error } = await supabase
    .from("custom_field_definitions")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as CustomFieldDefinition;
}

export async function updateCustomFieldDefinition(
  id: string,
  updates: Partial<CustomFieldDefinition>
): Promise<void> {
  const { error } = await supabase
    .from("custom_field_definitions")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteCustomFieldDefinition(id: string): Promise<void> {
  const { error } = await supabase.from("custom_field_definitions").delete().eq("id", id);
  if (error) throw error;
}

// ---- leads ----

export async function listAllLeads(clientId: string, limit = 5000): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("client_id", clientId)
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Lead[];
}

export async function bulkMoveLeads(ids: string[], columnId: string): Promise<void> {
  const { error } = await supabase.from("leads").update({ column_id: columnId }).in("id", ids);
  if (error) throw error;
}

export async function bulkDeleteLeads(ids: string[]): Promise<void> {
  // ponytail: delete em chunks de 500 (limite seguro do PostgREST .in())
  const CHUNK = 500;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { error } = await supabase.from("leads").delete().in("id", ids.slice(i, i + CHUNK));
    if (error) throw error;
  }
}

/** Adiciona uma tag a vários leads, ignorando os que já a têm. Retorna nº de falhas. */
export async function bulkAddTag(ids: string[], tag: string): Promise<number> {
  const { data: leadsData, error } = await supabase.from("leads").select("id, tags").in("id", ids);
  if (error) throw error;
  // ponytail: 1 update por lead (append em array exigiria RPC); aceitável até ~100 leads
  const updates = (leadsData ?? []).map(async (l) => {
    const current = Array.isArray(l.tags) ? (l.tags as string[]) : [];
    if (current.includes(tag)) return null;
    return supabase.from("leads").update({ tags: [...current, tag] }).eq("id", l.id);
  });
  const results = await Promise.allSettled(updates);
  return results.filter(
    (r) => r.status === "rejected" || (r.status === "fulfilled" && r.value?.error)
  ).length;
}

export async function updateLead(id: string, updates: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from("leads").update(updates).eq("id", id);
  if (error) throw error;
}

/**
 * Reaponta conversas, tarefas e timeline dos leads em sourceIds para o lead
 * primário. ponytail: erros individuais são ignorados de propósito (mesmo
 * comportamento do merge() de dedup hoje — nenhuma das 3 updates é crítica
 * o bastante pra abortar o merge do lead).
 */
export async function reassignLeadRelations(sourceIds: string[], primaryId: string): Promise<void> {
  await Promise.all([
    supabase.from("conversations").update({ lead_id: primaryId }).in("lead_id", sourceIds),
    supabase.from("tasks").update({ lead_id: primaryId }).in("lead_id", sourceIds),
    supabase.from("timeline_events").update({ lead_id: primaryId }).in("lead_id", sourceIds),
  ]);
}

/**
 * Reaponta conversas/tarefas/timeline e atualiza tags+notes do lead primário
 * numa única leva (usado pelo merge em lote — mergeMany). Retorna os
 * settled results para quem chamar decidir o que logar; nenhuma falha
 * individual aborta o grupo (mesmo comportamento atual).
 */
export async function reassignAndMergePrimary(
  sourceIds: string[],
  primaryId: string,
  mergedTags: string[],
  mergedNotes: string
): Promise<PromiseSettledResult<unknown>[]> {
  return Promise.allSettled([
    supabase.from("conversations").update({ lead_id: primaryId }).in("lead_id", sourceIds),
    supabase.from("tasks").update({ lead_id: primaryId }).in("lead_id", sourceIds),
    supabase.from("timeline_events").update({ lead_id: primaryId }).in("lead_id", sourceIds),
    supabase.from("leads").update({ tags: mergedTags, notes: mergedNotes || null }).eq("id", primaryId),
  ]);
}

/** Delete em chunks que loga e segue em erro, sem abortar os chunks restantes. */
export async function bulkDeleteLeadsLogOnly(ids: string[]): Promise<void> {
  const CHUNK = 500;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { error } = await supabase.from("leads").delete().in("id", ids.slice(i, i + CHUNK));
    if (error) {
      console.error("Bulk delete failed:", error);
    }
  }
}
