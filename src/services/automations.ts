import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

// Repositório do domínio automations (message_sequences, message_sequence_steps,
// automation_runs, automation_runs_summary). Funções puras de acesso a dados;
// toast/estado/realtime ficam nos hooks (useSequences, useAutomationRuns).

// ---- message_sequences ----

export async function listSequences(clientId: string): Promise<Tables<"message_sequences">[]> {
  const { data, error } = await supabase
    .from("message_sequences")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listSequenceSteps(sequenceIds: string[]): Promise<Tables<"message_sequence_steps">[]> {
  if (sequenceIds.length === 0) return [];
  const { data, error } = await supabase
    .from("message_sequence_steps")
    .select("*")
    .in("sequence_id", sequenceIds)
    .order("step_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createSequence(
  row: TablesInsert<"message_sequences">
): Promise<Tables<"message_sequences">> {
  const { data, error } = await supabase.from("message_sequences").insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function updateSequence(id: string, updates: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from("message_sequences").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteSequence(id: string): Promise<void> {
  const { error } = await supabase.from("message_sequences").delete().eq("id", id);
  if (error) throw error;
}

// ---- message_sequence_steps ----

export async function createSequenceStep(
  row: TablesInsert<"message_sequence_steps">
): Promise<Tables<"message_sequence_steps">> {
  const { data, error } = await supabase.from("message_sequence_steps").insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function updateSequenceStep(id: string, updates: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from("message_sequence_steps").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteSequenceStep(id: string): Promise<void> {
  const { error } = await supabase.from("message_sequence_steps").delete().eq("id", id);
  if (error) throw error;
}

// ---- automations (visual builder) e automation_rules (regras básicas) ----

/** masterView = master no subdomínio "master": sem filtro de client_id (RLS permite). */
export async function listComplexAutomations(
  clientId: string,
  masterView = false
): Promise<Tables<"automations">[]> {
  let q = supabase.from("automations").select("*");
  if (!masterView) q = q.eq("client_id", clientId);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listAutomationRules(
  clientId: string,
  masterView = false
): Promise<Tables<"automation_rules">[]> {
  let q = supabase.from("automation_rules").select("*");
  if (!masterView) q = q.eq("client_id", clientId);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function insertComplexAutomation(
  row: TablesInsert<"automations">
): Promise<Tables<"automations"> | null> {
  const { data, error } = await supabase.from("automations").insert(row).select().single();
  if (error) throw error;
  return data ?? null;
}

export async function updateComplexAutomation(id: string, updates: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from("automations").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteComplexAutomation(id: string): Promise<void> {
  const { error } = await supabase.from("automations").delete().eq("id", id);
  if (error) throw error;
}

export async function insertAutomationRule(
  row: TablesInsert<"automation_rules">
): Promise<Tables<"automation_rules"> | null> {
  const { data, error } = await supabase.from("automation_rules").insert(row).select().single();
  if (error) throw error;
  return data ?? null;
}

export async function updateAutomationRule(id: string, updates: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from("automation_rules").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteAutomationRule(id: string): Promise<void> {
  const { error } = await supabase.from("automation_rules").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Dispara a edge automation-engine (fire-and-forget). Usa
 * supabase.functions.invoke direto, sem refresh de sessão — mesmo
 * comportamento do código original no AppContext.
 */
export function triggerAutomationEngine(body: {
  automation_id: string;
  lead_id: string;
  node_id: string;
  context: Record<string, unknown>;
}): Promise<unknown> {
  return supabase.functions.invoke("automation-engine", { body });
}

// ---- automation_runs ----

/** Runs de uma automação com nome/telefone do lead embutidos. */
export async function listAutomationRuns(automationId: string, limit = 200) {
  const { data, error } = await supabase
    .from("automation_runs")
    .select("*, leads:lead_id(name, phone)")
    .eq("automation_id", automationId)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function pauseAutomationRun(runId: string): Promise<void> {
  const { error } = await supabase
    .from("automation_runs")
    .update({ status: "paused", finished_at: new Date().toISOString() })
    .eq("id", runId);
  if (error) throw error;
}

/** Estatísticas agregadas por automação (view automation_runs_summary). */
export async function listAutomationStats(clientId: string): Promise<Tables<"automation_runs_summary">[]> {
  const { data, error } = await supabase
    .from("automation_runs_summary")
    .select("*")
    .eq("client_id", clientId);
  if (error) throw error;
  return data ?? [];
}

/** Dispara o polling do edge automation-worker (fila de delays/retries). */
export function triggerAutomationWorker(): Promise<unknown> {
  return supabase.functions.invoke("automation-worker", { body: {} });
}

// ---- bots (builder visual simples, tabela "bots") ----

export interface BotRow {
  id: string;
  name: string;
  folder: string;
  status: "published" | "draft";
  trigger_type: string;
  created_at: string;
}

export async function listBots(clientId: string): Promise<BotRow[]> {
  const { data, error } = await supabase
    .from("bots")
    .select("id, name, folder, status, trigger_type, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BotRow[];
}

export async function createBot(row: Record<string, unknown>): Promise<{ id: string }> {
  const { data, error } = await supabase.from("bots").insert(row).select("id").single();
  if (error) throw error;
  return data;
}

export async function updateBot(id: string, updates: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from("bots").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteBot(id: string): Promise<void> {
  const { error } = await supabase.from("bots").delete().eq("id", id);
  if (error) throw error;
}

export async function getBotForDuplicate(id: string) {
  const { data } = await supabase
    .from("bots")
    .select("nodes, edges, trigger_type, trigger_value")
    .eq("id", id)
    .single();
  return data;
}

export async function getBotFull(id: string) {
  const { data, error } = await supabase
    .from("bots")
    .select("id, name, status, nodes, edges, trigger_type, trigger_value")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

// ---- sequence files (storage) ----

export async function uploadSequenceFile(
  file: File,
  stepId: string
): Promise<{ path: string; publicUrl: string }> {
  const fileName = `${Date.now()}_${file.name}`;
  const { data, error } = await supabase.storage
    .from("sequence_files")
    .upload(`steps/${stepId}/${fileName}`, file);
  if (error) throw error;

  const { data: urlData } = supabase.storage.from("sequence_files").getPublicUrl(data.path);
  return { path: data.path, publicUrl: urlData.publicUrl };
}
