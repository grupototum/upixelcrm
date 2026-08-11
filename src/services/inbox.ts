import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { logger } from "@/lib/logger";

// Repositório do domínio inbox (inbox_templates, macros, contadores de
// conversations/tasks). Funções puras de acesso a dados; toast/estado/realtime
// ficam nos hooks. As demais queries de conversations/messages do useInbox
// migram para cá no Lote 3, quando o hook for desmontado.

// ---- conversas (lista do inbox) ----

/**
 * Reacorda conversas cuja soneca expirou. Self-healing barato que roda a cada
 * load do inbox (evita pg_cron). Erros são ignorados de propósito — mesmo
 * comportamento do código original, que não checava o resultado.
 */
export async function reawakenExpiredSnoozes(clientId: string): Promise<void> {
  const { error } = await supabase
    .from("conversations")
    .update({ status: "open", snoozed_until: null })
    .eq("client_id", clientId)
    .eq("status", "snoozed")
    .lte("snoozed_until", new Date().toISOString());
  if (error) logger.error("[reawakenExpiredSnoozes]", error.message);
}

export async function listConversations(clientId: string): Promise<Tables<"conversations">[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("client_id", clientId)
    .order("last_message_at", { ascending: false })
    // Cap defensivo: o Inbox recarrega essa lista a cada evento realtime.
    .limit(1000);
  if (error) throw error;
  return data ?? [];
}

/** Dados básicos dos leads exibidos na lista do inbox (RLS filtra o tenant). */
export async function listLeadBasicsByIds(
  ids: string[]
): Promise<Pick<Tables<"leads">, "id" | "name" | "phone" | "email" | "company" | "origin" | "category">[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("leads")
    .select("id, name, phone, email, company, origin, category")
    .in("id", ids);
  if (error) throw error;
  return data ?? [];
}

// ---- mensagens de um lead ----

/** Referências (id, channel) das conversas de um lead; "unassigned" = sem lead. */
export async function listLeadConversationRefs(
  clientId: string,
  leadId: string
): Promise<Pick<Tables<"conversations">, "id" | "channel">[]> {
  let query = supabase.from("conversations").select("id, channel").eq("client_id", clientId);
  query = (leadId === "unassigned" ? query.is("lead_id", null) : query.eq("lead_id", leadId)) as typeof query;
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export const MESSAGE_PAGE_SIZE = 100;

/**
 * Página de mensagens em ordem cronológica. `before` é o `created_at` da
 * mensagem mais antiga já carregada — passe-o para buscar o trecho anterior.
 *
 * Antes isto trazia as 500 mais recentes sem cursor: histórico acima disso era
 * inacessível de forma permanente (não havia "carregar mais" em lugar nenhum).
 */
export async function listMessagesByConversationIds(
  convIds: string[],
  before?: string,
): Promise<Tables<"messages">[]> {
  let query = supabase
    .from("messages")
    .select("*")
    .in("conversation_id", convIds)
    .order("created_at", { ascending: false })
    .limit(MESSAGE_PAGE_SIZE);
  if (before) query = query.lt("created_at", before);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).reverse();
}

export async function markConversationsRead(convIds: string[]): Promise<void> {
  const { error } = await supabase.from("conversations").update({ unread_count: 0 }).in("id", convIds);
  if (error) throw error;
}

// ---- lookups do callback de realtime ----

/** lead_id/channel de uma conversa, escopada ao tenant. */
export async function getConversationRef(
  conversationId: string,
  clientId: string
): Promise<Pick<Tables<"conversations">, "lead_id" | "channel"> | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select("lead_id, channel")
    .eq("id", conversationId)
    .eq("client_id", clientId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function getConversationCsatInfo(
  conversationId: string
): Promise<Pick<Tables<"conversations">, "csat_sent_at" | "lead_id"> | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select("csat_sent_at, lead_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function insertCsatResponse(row: TablesInsert<"csat_responses">): Promise<void> {
  const { error } = await supabase.from("csat_responses").insert(row);
  if (error) throw error;
}

export async function assignLeadToConversation(conversationId: string, leadId: string): Promise<void> {
  const { error } = await supabase.from("conversations").update({ lead_id: leadId }).eq("id", conversationId);
  if (error) throw error;
}

// ---- envio de mensagem (persistência outbound) ----

/** Insere uma mensagem. Lança em erro — quem quiser ignorar usa .catch(). */
export async function insertMessage(row: TablesInsert<"messages">): Promise<void> {
  const { error } = await supabase.from("messages").insert(row);
  if (error) throw error;
}

/** Atualiza last_message/last_message_at de uma conversa. */
export async function updateConversationLastMessage(
  conversationId: string,
  lastMessage: string,
  lastMessageAt: string = new Date().toISOString(),
): Promise<void> {
  const { error } = await supabase
    .from("conversations")
    .update({ last_message: lastMessage, last_message_at: lastMessageAt })
    .eq("id", conversationId);
  if (error) throw error;
}

// ---- ações de conversa (status/snooze/metadata) ----

/** Atualiza status (e opcionalmente snoozed_until) de várias conversas. */
export async function updateConversationsStatus(
  convIds: string[],
  status: string,
  snoozedUntil?: string,
): Promise<void> {
  const patch: TablesUpdate<"conversations"> = { status, updated_at: new Date().toISOString() };
  if (snoozedUntil !== undefined) patch.snoozed_until = snoozedUntil;
  const { error } = await supabase.from("conversations").update(patch).in("id", convIds);
  if (error) throw error;
}

/** Atualiza o metadata de uma conversa; `touch` também bumpa updated_at. */
export async function updateConversationMetadata(
  conversationId: string,
  metadata: TablesUpdate<"conversations">["metadata"],
  touch = false,
): Promise<void> {
  const patch: TablesUpdate<"conversations"> = { metadata };
  if (touch) patch.updated_at = new Date().toISOString();
  const { error } = await supabase.from("conversations").update(patch).eq("id", conversationId);
  if (error) throw error;
}

// ---- criar conversa / transcrição / merge (inbox) ----

/** Cria uma conversa e retorna o id. Lança em erro. */
export async function insertConversation(
  row: TablesInsert<"conversations">,
): Promise<{ id: string }> {
  const { data, error } = await supabase.from("conversations").insert(row).select("id").single();
  if (error) throw error;
  return data;
}

/** content/metadata de uma mensagem (usado na transcrição). Lança em erro. */
export async function getMessageContentMeta(
  messageId: string,
): Promise<Pick<Tables<"messages">, "content" | "metadata"> | null> {
  const { data, error } = await supabase
    .from("messages")
    .select("content, metadata")
    .eq("id", messageId)
    .single();
  if (error) throw error;
  return data ?? null;
}

export async function updateMessageMetadata(
  messageId: string,
  metadata: TablesUpdate<"messages">["metadata"],
): Promise<void> {
  const { error } = await supabase.from("messages").update({ metadata }).eq("id", messageId);
  if (error) throw error;
}

/** Move todas as conversas de um lead para outro (passo do merge). Lança em erro. */
export async function reassignConversationsToLead(
  fromLeadId: string,
  toLeadId: string,
): Promise<void> {
  const { error } = await supabase
    .from("conversations")
    .update({ lead_id: toLeadId })
    .eq("lead_id", fromLeadId);
  if (error) throw error;
}

// ---- inbox_templates (respostas rápidas) ----

export async function listInboxTemplates(clientId: string): Promise<Tables<"inbox_templates">[]> {
  const { data, error } = await supabase
    .from("inbox_templates")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createInboxTemplate(
  row: TablesInsert<"inbox_templates">
): Promise<Tables<"inbox_templates">> {
  const { data, error } = await supabase.from("inbox_templates").insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function updateInboxTemplate(id: string, updates: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from("inbox_templates").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteInboxTemplate(id: string): Promise<void> {
  const { error } = await supabase.from("inbox_templates").delete().eq("id", id);
  if (error) throw error;
}

// ---- macros ----

export async function listMacros(
  clientId: string
): Promise<Pick<Tables<"macros">, "id" | "name" | "description" | "actions">[]> {
  const { data, error } = await supabase
    .from("macros")
    .select("id, name, description, actions")
    .eq("client_id", clientId)
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function logMacroExecution(entry: {
  macro_id: string;
  conversation_id: string | null;
  lead_id: string;
  executed_by: string | null;
  results: { action: string; success: boolean; error?: string }[];
}): Promise<void> {
  const { error } = await supabase.from("macro_executions").insert(entry);
  if (error) throw error;
}

// ---- tasks ----

export async function createTask(row: TablesInsert<"tasks">): Promise<void> {
  const { error } = await supabase.from("tasks").insert(row);
  if (error) throw error;
}

// ---- contadores (badges do sidebar) ----

/** Conversas abertas com mensagens não lidas. */
/** Conversas com CSAT pendente de envio (útil pra useCsatSender). */
export async function listPendingCsatConversations(
  clientId: string,
  nowIso: string
): Promise<Pick<Tables<"conversations">, "id" | "channel" | "metadata" | "lead_id">[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, channel, metadata, lead_id")
    .eq("client_id", clientId)
    .lte("csat_requested_at", nowIso)
    .is("csat_sent_at", null)
    .not("csat_requested_at", "is", null);
  if (error || !data) return [];
  return data;
}

export async function markCsatSent(conversationId: string, sentAt: string): Promise<void> {
  const { error } = await supabase
    .from("conversations")
    .update({ csat_sent_at: sentAt })
    .eq("id", conversationId);
  // Falha aqui faz o CSAT ser reenviado no próximo ciclo do useCsatSender.
  if (error) logger.error("[markCsatSent]", conversationId, error.message);
}

export async function countOpenUnreadConversations(clientId: string): Promise<number> {
  const { count, error } = await supabase
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .gt("unread_count", 0)
    .eq("status", "open");
  if (error) throw error;
  return count ?? 0;
}

/** Tarefas do tenant ainda não concluídas/canceladas. */
export async function countPendingTasks(clientId: string): Promise<number> {
  const { count, error } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .not("status", "in", "(completed,done,cancelled)");
  if (error) throw error;
  return count ?? 0;
}
