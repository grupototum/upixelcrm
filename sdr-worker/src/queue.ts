// Acesso à fila (whatsapp_message_queue) e às tabelas de leitura necessárias
// (conversations, integrations, messages). O worker usa a service role key e
// SÓ escreve na própria fila — nunca altera o CRM (leads/conversas/mensagens).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { WorkerConfig } from "./config.ts";
import type { EvolutionConfig } from "./whatsapp.ts";
import type { ChatMessage } from "./llm.ts";

export interface QueueItem {
  id: string;
  client_id: string; // tenant — preservado ponta a ponta
  conversation_id: string | null;
  message_data: Record<string, unknown>;
  source: string;
  status: string;
  attempt_count: number;
  max_attempts: number;
}

export interface ConversationContext {
  phone: string;
  senderName: string;
  evolution: EvolutionConfig;
  history: ChatMessage[];
}

export function createSupabase(config: WorkerConfig): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Busca itens pendentes da rota SDR. O filtro por route='sdr' garante que o
// worker externo só toca no que é dele — o cron do salesbot continua com os seus.
export async function fetchPending(
  supabase: SupabaseClient,
  batchSize: number,
  maxAttempts: number,
): Promise<QueueItem[]> {
  const { data, error } = await supabase
    .from("whatsapp_message_queue")
    .select("id, client_id, conversation_id, message_data, source, status, attempt_count, max_attempts")
    .eq("status", "pending")
    .eq("route", "sdr")
    .lt("attempt_count", maxAttempts)
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (error) throw new Error(`Falha ao buscar fila: ${error.message}`);
  return (data ?? []) as QueueItem[];
}

// Reivindica o item de forma atômica: só vence quem conseguir mudar de
// 'pending' -> 'processing'. Se outra instância pegou antes, retorna null.
export async function claim(
  supabase: SupabaseClient,
  itemId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("whatsapp_message_queue")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", itemId)
    .eq("status", "pending")
    .select("id");

  if (error) throw new Error(`Falha ao reivindicar item ${itemId}: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

// Resolve credenciais Evolution + telefone + histórico da conversa (somente leitura).
// Preserva tenant_id: valida que a conversa pertence ao client_id do item da fila.
export async function loadContext(
  supabase: SupabaseClient,
  item: QueueItem,
  historyLimit: number,
): Promise<ConversationContext> {
  if (!item.conversation_id) {
    throw new Error("Item sem conversation_id");
  }

  const { data: conv, error: convErr } = await supabase
    .from("conversations")
    .select("id, client_id, integration_id, metadata")
    .eq("id", item.conversation_id)
    .single();

  if (convErr || !conv) {
    throw new Error(`Conversa não encontrada: ${convErr?.message ?? "sem dados"}`);
  }

  // Isolamento multi-tenant: a conversa tem que ser do mesmo tenant do item.
  if (conv.client_id !== item.client_id) {
    throw new Error(
      `Divergência de tenant: item.client_id=${item.client_id} conv.client_id=${conv.client_id}`,
    );
  }

  const metadata = (conv.metadata ?? {}) as Record<string, unknown>;
  const phone = (metadata.phone as string) || "";
  const senderName = (metadata.lead_name as string) || phone || "Cliente";
  if (!phone) throw new Error("Conversa sem telefone em metadata.phone");

  const evolution = await resolveEvolutionConfig(
    supabase,
    item.client_id,
    conv.integration_id as string | null,
  );

  const history = await loadHistory(supabase, item.conversation_id, item.client_id, historyLimit);

  return { phone, senderName, evolution, history };
}

// Busca a config Evolution (api_url/api_key/instance_name) a partir da
// integração da conversa; se ausente, cai para a integração whatsapp do tenant.
async function resolveEvolutionConfig(
  supabase: SupabaseClient,
  clientId: string,
  integrationId: string | null,
): Promise<EvolutionConfig> {
  let config: Record<string, unknown> | null = null;

  if (integrationId) {
    const { data } = await supabase
      .from("integrations")
      .select("client_id, config")
      .eq("id", integrationId)
      .eq("provider", "whatsapp")
      .maybeSingle();
    // Preserva tenant: só aceita se a integração for do mesmo client_id.
    if (data && data.client_id === clientId) {
      config = data.config as Record<string, unknown>;
    }
  }

  if (!config) {
    const { data } = await supabase
      .from("integrations")
      .select("config")
      .eq("client_id", clientId)
      .eq("provider", "whatsapp")
      .limit(1)
      .maybeSingle();
    config = (data?.config as Record<string, unknown>) ?? null;
  }

  const api_url = config?.api_url as string | undefined;
  const api_key = config?.api_key as string | undefined;
  const instance_name = config?.instance_name as string | undefined;

  if (!api_url || !api_key || !instance_name) {
    throw new Error("Integração WhatsApp/Evolution incompleta (api_url/api_key/instance_name)");
  }

  return { api_url, api_key, instance_name };
}

// Últimas mensagens da conversa como contexto para o LLM (somente leitura).
// inbound -> user, outbound -> assistant. Mídia vira placeholder textual.
async function loadHistory(
  supabase: SupabaseClient,
  conversationId: string,
  clientId: string,
  limit: number,
): Promise<ChatMessage[]> {
  if (limit <= 0) return [];

  const { data, error } = await supabase
    .from("messages")
    .select("content, type, direction, created_at")
    .eq("conversation_id", conversationId)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data
    .slice()
    .reverse()
    .map((m): ChatMessage => {
      const isText = (m.type as string) === "text";
      const content = isText ? (m.content as string) : `[${m.type}]`;
      return {
        role: (m.direction as string) === "outbound" ? "assistant" : "user",
        content: content || "",
      };
    })
    .filter((m) => m.content.trim() !== "");
}

// Sucesso: marca completed e guarda a resposta gerada na própria fila.
// `ai_generated: true` é o marcador anti-loop — deixa explícito que o outbound
// veio da IA. (O webhook já ignora fromMe, então o envio não re-entra na fila.)
export async function markCompleted(
  supabase: SupabaseClient,
  item: QueueItem,
  reply: string,
): Promise<void> {
  const { error } = await supabase
    .from("whatsapp_message_queue")
    .update({
      status: "completed",
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message_data: {
        ...item.message_data,
        sdr_reply: reply,
        ai_generated: true,
        route: "sdr",
      },
    })
    .eq("id", item.id);

  if (error) throw new Error(`Falha ao marcar completed ${item.id}: ${error.message}`);
}

// Item que não deve gerar resposta (mídia, vazio, etc.). Fecha sem enviar nada.
export async function markSkipped(
  supabase: SupabaseClient,
  item: QueueItem,
  reason: string,
): Promise<void> {
  const { error } = await supabase
    .from("whatsapp_message_queue")
    .update({
      status: "completed",
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message_data: { ...item.message_data, sdr_skipped: reason },
    })
    .eq("id", item.id);

  if (error) throw new Error(`Falha ao marcar skipped ${item.id}: ${error.message}`);
}

// Erro: incrementa a tentativa; volta a 'pending' se ainda houver retry,
// senão 'failed'. Mantém o comportamento de retry do processor atual.
export async function markFailed(
  supabase: SupabaseClient,
  item: QueueItem,
  errorMessage: string,
  maxAttempts: number,
): Promise<void> {
  const newAttemptCount = item.attempt_count + 1;
  const shouldRetry = newAttemptCount < maxAttempts;

  const { error } = await supabase
    .from("whatsapp_message_queue")
    .update({
      status: shouldRetry ? "pending" : "failed",
      attempt_count: newAttemptCount,
      error_message: errorMessage.slice(0, 1000),
      updated_at: new Date().toISOString(),
    })
    .eq("id", item.id);

  if (error) throw new Error(`Falha ao marcar failed ${item.id}: ${error.message}`);
}
