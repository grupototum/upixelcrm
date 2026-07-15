import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

// Repositório do domínio inbox (inbox_templates, macros, contadores de
// conversations/tasks). Funções puras de acesso a dados; toast/estado/realtime
// ficam nos hooks. As demais queries de conversations/messages do useInbox
// migram para cá no Lote 3, quando o hook for desmontado.

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
