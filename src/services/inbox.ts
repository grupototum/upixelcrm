import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

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
  await supabase
    .from("conversations")
    .update({ status: "open", snoozed_until: null })
    .eq("client_id", clientId)
    .eq("status", "snoozed")
    .lte("snoozed_until", new Date().toISOString());
}

export async function listConversations(clientId: string): Promise<Tables<"conversations">[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("client_id", clientId)
    .order("last_message_at", { ascending: false });
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

export async function listMessagesByConversationIds(convIds: string[]): Promise<Tables<"messages">[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .in("conversation_id", convIds)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
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
