import { supabase } from "@/integrations/supabase/client";
import { untypedFrom } from "@/lib/supabase-untyped";
import { logger } from "@/lib/logger";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import type { CustomFieldDefinition, Lead, TagMeta } from "@/types";

// Repositório do domínio leads (leads, tags, custom_field_definitions).
// Funções puras de acesso a dados: lançam o erro do Supabase (com .code/.message);
// toast, estado e regras de UI ficam nos hooks/componentes.

// ---- tags ----
// tags é escopada por tenant_id (UUID) — client_id foi removida da tabela
// numa migração de schema que não passou pelo repo (drift). RLS já reforça
// tenant_id = profiles.tenant_id; o filtro aqui é defesa em profundidade,
// igual ao resto do código.

export async function listTags(tenantId: string): Promise<TagMeta[]> {
  const { data, error } = await untypedFrom("tags")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data as unknown as TagMeta[]) || [];
}

export async function createTag(
  tenantId: string,
  params: { name: string; color?: string; category?: string }
): Promise<TagMeta> {
  const { data, error } = await untypedFrom("tags")
    .insert({
      tenant_id: tenantId,
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

/**
 * Página de telefones existentes, para dedup na importação (ImportPage).
 * Retorna null em caso de erro (o caller decide se para a paginação ou trata
 * como falha — comportamento herdado do código original).
 */
export async function listLeadPhonesPage(
  clientId: string,
  from: number,
  to: number
): Promise<{ phone: string | null }[] | null> {
  const { data, error } = await supabase
    .from("leads")
    .select("phone")
    .eq("client_id", clientId)
    .not("phone", "is", null)
    .range(from, to);
  if (error) return null;
  return data ?? [];
}

/**
 * Insert em chunk sem throw — ImportPage decide retry com base em error.code.
 * Usa untypedFrom pois o payload pode conter import_batch_id (coluna ainda fora
 * dos tipos gerados). Retorna os ids inseridos (para enfileirar automações /
 * aplicar tags pós-importação). Se a SELECT pós-insert falhar, ids vem vazio.
 */
export async function insertLeadsChunk(
  chunk: Record<string, unknown>[]
): Promise<{ error: { code?: string; message?: string } | null; ids: string[] }> {
  const { data, error } = await untypedFrom("leads").insert(chunk).select("id");
  const ids = ((data as unknown as { id: string }[]) ?? []).map((r) => r.id);
  return { error, ids };
}

/** Leads com atribuição de campanha (UTM/fbclid/gclid) — CampaignsPage/AttributionTab. */
export async function listAttributedLeads(clientId: string, limit = 200) {
  const { data } = await supabase
    .from("leads")
    .select("id,name,phone,email,origin,utm_source,utm_medium,utm_campaign,utm_content,ad_campaign_id,fbclid,gclid,created_at")
    .eq("client_id", clientId)
    .or("utm_campaign.not.is.null,ad_campaign_id.not.is.null,fbclid.not.is.null,gclid.not.is.null")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

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
  // Move em chunks de 500 (limite seguro do PostgREST .in()), como bulkDeleteLeads.
  // columnId determina o funil de destino também (o funil do lead é derivado da
  // coluna: lead.column_id -> pipeline_columns.pipeline_id).
  const CHUNK = 500;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { error } = await supabase
      .from("leads")
      .update({ column_id: columnId })
      .in("id", ids.slice(i, i + CHUNK));
    if (error) throw error;
  }
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
  const { data: leadsData, error: selectError } = await supabase
    .from("leads")
    .select("id, tags")
    .in("id", ids);
  if (selectError) {
    // Sem o select nada foi atualizado: reporta tudo como falha em vez de "0 falhas".
    logger.error("[bulkAddTag]", selectError.message);
    return ids.length;
  }
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

// ---- findOrCreateLead / deleteLead / mergeLeads (usado pelo useInbox) ----

/** Leads cujo telefone contém o sufixo, do mais antigo pro mais novo. Lança em erro. */
export async function findLeadIdsByPhoneSuffix(
  clientId: string,
  phoneSuffix: string
): Promise<{ id: string }[]> {
  const { data, error } = await supabase
    .from("leads")
    .select("id")
    .eq("client_id", clientId)
    .ilike("phone", `%${phoneSuffix}%`)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function findLeadIdsByEmail(clientId: string, email: string): Promise<{ id: string }[]> {
  const { data, error } = await supabase
    .from("leads")
    .select("id")
    .eq("client_id", clientId)
    .ilike("email", email)
    .limit(1);
  if (error) throw error;
  return data ?? [];
}

export async function getFirstPipelineColumnId(clientId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("pipeline_columns")
    .select("id")
    .eq("client_id", clientId)
    .order("order", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

/** Cria um lead automático (origem inbox). */
export async function insertAutoLead(row: {
  client_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  column_id: string;
  tags: string[];
  origin: string;
}): Promise<{ id: string } | null> {
  const { data, error } = await supabase.from("leads").insert(row).select("id").single();
  if (error) throw error;
  return data;
}

export async function deleteLeadById(id: string): Promise<void> {
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) throw error;
}

/** Move tasks de um lead para outro (passo do merge do inbox). */
export async function reassignTasksToLead(fromLeadId: string, toLeadId: string): Promise<void> {
  const { error } = await supabase.from("tasks").update({ lead_id: toLeadId }).eq("lead_id", fromLeadId);
  if (error) throw error;
}

/** Move notes de um lead para outro (passo do merge do inbox; tabela fora dos tipos gerados). */
export async function reassignNotesToLead(fromLeadId: string, toLeadId: string): Promise<void> {
  const { error } = await untypedFrom("notes").update({ lead_id: toLeadId }).eq("lead_id", fromLeadId);
  if (error) throw error;
}

/** Move timeline_events de um lead para outro (merge do CRM/AppContext). */
export async function reassignTimelineToLead(fromLeadId: string, toLeadId: string): Promise<void> {
  const { error } = await supabase
    .from("timeline_events")
    .update({ lead_id: toLeadId })
    .eq("lead_id", fromLeadId);
  if (error) throw error;
}

/** Cria um lead com payload completo e retorna a linha (usado pelo board do CRM). */
export async function insertLead(row: TablesInsert<"leads">): Promise<Tables<"leads"> | null> {
  const { data, error } = await supabase.from("leads").insert(row).select().single();
  if (error) throw error;
  return data ?? null;
}

// ---- carga inicial do board (fetchAll/refreshData do AppContext) ----
// masterView = usuário master no subdomínio "master": sem filtro de client_id
// (RLS permite ver todos os tenants). Mesmas queries do fetchAll original.

export async function listPipelines(clientId: string, masterView = false): Promise<Tables<"pipelines">[]> {
  let q = supabase.from("pipelines").select("*");
  if (!masterView) q = q.eq("client_id", clientId);
  const { data, error } = await q.order("name");
  if (error) throw error;
  return data ?? [];
}

export async function listPipelineColumns(
  clientId: string,
  masterView = false
): Promise<Tables<"pipeline_columns">[]> {
  let q = supabase.from("pipeline_columns").select("*");
  if (!masterView) q = q.eq("client_id", clientId);
  const { data, error } = await q.order("order");
  if (error) throw error;
  return data ?? [];
}

export async function listTasks(clientId: string, masterView = false): Promise<Tables<"tasks">[]> {
  let q = supabase.from("tasks").select("*");
  if (!masterView) q = q.eq("client_id", clientId);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(5000);
  if (error) throw error;
  return data ?? [];
}

export async function listTimelineEvents(
  clientId: string,
  masterView = false
): Promise<Tables<"timeline_events">[]> {
  let q = supabase.from("timeline_events").select("*");
  if (!masterView) q = q.eq("client_id", clientId);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function countLeads(clientId: string, masterView = false): Promise<number> {
  let q = supabase.from("leads").select("*", { count: "exact", head: true });
  if (!masterView) q = q.eq("client_id", clientId);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

/** Página só com column_id (contagem por funil antes de baixar tudo). */
export async function listLeadColumnIdsPage(
  clientId: string,
  masterView: boolean,
  from: number,
  to: number
): Promise<{ column_id: string | null }[]> {
  let q = supabase.from("leads").select("column_id");
  if (!masterView) q = q.eq("client_id", clientId);
  const { data, error } = await q.range(from, to);
  if (error) throw error;
  return data ?? [];
}

/** Página completa de leads, mais recentes primeiro. */
export async function listLeadsPage(
  clientId: string,
  masterView: boolean,
  from: number,
  to: number
): Promise<Tables<"leads">[]> {
  let q = supabase.from("leads").select("*");
  if (!masterView) q = q.eq("client_id", clientId);
  const { data, error } = await q.order("created_at", { ascending: false }).range(from, to);
  if (error) throw error;
  return data ?? [];
}

// ---- tasks e timeline (CRM) ----

export async function insertTaskReturning(row: TablesInsert<"tasks">): Promise<Tables<"tasks"> | null> {
  const { data, error } = await supabase.from("tasks").insert(row).select().single();
  if (error) throw error;
  return data ?? null;
}

export async function updateTaskRow(id: string, updates: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from("tasks").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteTaskById(id: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function insertTimelineEvent(
  row: TablesInsert<"timeline_events">
): Promise<Tables<"timeline_events"> | null> {
  const { data, error } = await supabase.from("timeline_events").insert(row).select().single();
  if (error) throw error;
  return data ?? null;
}

// ---- pipelines e colunas (board do CRM) ----

export async function insertPipeline(row: TablesInsert<"pipelines">): Promise<Tables<"pipelines"> | null> {
  const { data, error } = await supabase.from("pipelines").insert(row).select().single();
  if (error) throw error;
  return data ?? null;
}

export async function updatePipeline(id: string, updates: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from("pipelines").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deletePipelineById(id: string): Promise<void> {
  const { error } = await supabase.from("pipelines").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteColumnsByPipeline(pipelineId: string): Promise<void> {
  const { error } = await supabase.from("pipeline_columns").delete().eq("pipeline_id", pipelineId);
  if (error) throw error;
}

export async function insertPipelineColumns(
  rows: TablesInsert<"pipeline_columns">[]
): Promise<Tables<"pipeline_columns">[]> {
  const { data, error } = await supabase.from("pipeline_columns").insert(rows).select();
  if (error) throw error;
  return data ?? [];
}

export async function insertPipelineColumn(
  row: TablesInsert<"pipeline_columns">
): Promise<Tables<"pipeline_columns"> | null> {
  const { data, error } = await supabase.from("pipeline_columns").insert(row).select().single();
  if (error) throw error;
  return data ?? null;
}

export async function updatePipelineColumn(id: string, updates: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from("pipeline_columns").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deletePipelineColumn(id: string): Promise<void> {
  const { error } = await supabase.from("pipeline_columns").delete().eq("id", id);
  if (error) throw error;
}

/** Todas as colunas visíveis pelo usuário (RLS filtra), ordenadas. */
export async function listAllPipelineColumns(): Promise<Tables<"pipeline_columns">[]> {
  const { data, error } = await supabase.from("pipeline_columns").select("*").order("order");
  if (error) throw error;
  return data ?? [];
}
