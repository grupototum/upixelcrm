// uPixel — Worker SDR externo (POC)
//
// Loop: busca pendentes de whatsapp_message_queue (route='sdr') -> reivindica
// (pending->processing) -> gera resposta via LLM -> envia pelo WhatsApp/Evolution
// -> marca completed/failed. Só conversa: NÃO altera o CRM.
//
// Ignora, por segurança de POC: grupos, mídia e mensagens fromMe. Na prática o
// webhook já filtra grupos e fromMe antes de enfileirar (route='sdr'); aqui
// reforçamos a checagem de mídia/texto vazio.

import { loadConfig, type WorkerConfig } from "./config.ts";
import { generateReply, type ChatMessage } from "./llm.ts";
import { sendWhatsAppText } from "./whatsapp.ts";
import {
  createSupabase,
  fetchPending,
  claim,
  loadContext,
  markCompleted,
  markSkipped,
  markFailed,
  type QueueItem,
} from "./queue.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

let running = true;

function log(level: "info" | "warn" | "error", msg: string, extra?: unknown) {
  const line = `[${new Date().toISOString()}] [sdr-worker] ${msg}`;
  if (level === "error") console.error(line, extra ?? "");
  else if (level === "warn") console.warn(line, extra ?? "");
  else console.log(line, extra ?? "");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Extrai texto processável da mensagem enfileirada. Retorna null para o que
// deve ser ignorado (mídia, tipo desconhecido, conteúdo vazio).
function extractUserText(item: QueueItem): string | null {
  const type = (item.message_data?.type as string) || "text";
  if (type !== "text") return null; // ignora mídia (image/audio/video/file/...)
  const content = (item.message_data?.content as string) || "";
  const trimmed = content.trim();
  return trimmed === "" ? null : trimmed;
}

async function processItem(
  supabase: SupabaseClient,
  config: WorkerConfig,
  item: QueueItem,
): Promise<void> {
  const claimed = await claim(supabase, item.id);
  if (!claimed) {
    // Outra instância pegou primeiro — sem problema.
    return;
  }

  try {
    const userText = extractUserText(item);
    if (userText === null) {
      log("info", `item ${item.id}: ignorado (mídia/vazio)`);
      await markSkipped(supabase, item, "non_text_or_empty");
      return;
    }

    const ctx = await loadContext(supabase, item, config.historyLimit);

    // Monta o prompt: system + histórico da conversa. A última mensagem do lead
    // costuma já estar no histórico; garantimos que ela esteja presente no fim.
    const messages: ChatMessage[] = [
      { role: "system", content: config.systemPrompt },
      ...ctx.history,
    ];
    const last = ctx.history[ctx.history.length - 1];
    if (!last || last.role !== "user" || last.content.trim() !== userText) {
      messages.push({ role: "user", content: userText });
    }

    const reply = await generateReply(config, messages);

    await sendWhatsAppText(ctx.evolution, ctx.phone, reply);

    await markCompleted(supabase, item, reply);
    log("info", `item ${item.id}: respondido (tenant=${item.client_id})`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("error", `item ${item.id}: falhou — ${msg}`);
    await markFailed(supabase, item, msg, config.maxAttempts).catch((e) =>
      log("error", `item ${item.id}: falha ao registrar erro`, e),
    );
  }
}

async function tick(supabase: SupabaseClient, config: WorkerConfig): Promise<number> {
  const items = await fetchPending(supabase, config.batchSize, config.maxAttempts);
  if (items.length === 0) return 0;

  log("info", `${items.length} item(ns) pendente(s)`);
  // Processa em sequência — POC simples e previsível. Concorrência pode ser
  // adicionada depois; a reivindicação atômica já torna o worker idempotente.
  for (const item of items) {
    if (!running) break;
    await processItem(supabase, config, item);
  }
  return items.length;
}

async function main() {
  const config = loadConfig();
  const supabase = createSupabase(config);

  log("info", `iniciado — modelo=${config.llmModel} intervalo=${config.pollIntervalMs}ms lote=${config.batchSize}`);

  const shutdown = (signal: string) => {
    log("warn", `${signal} recebido — encerrando após o ciclo atual`);
    running = false;
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  while (running) {
    try {
      const processed = await tick(supabase, config);
      // Se a fila estava cheia, encadeia o próximo ciclo sem espera longa.
      if (processed < config.batchSize) {
        await sleep(config.pollIntervalMs);
      }
    } catch (err) {
      log("error", "erro no ciclo de polling", err);
      await sleep(config.pollIntervalMs);
    }
  }

  log("info", "encerrado");
}

main().catch((err) => {
  log("error", "erro fatal", err);
  process.exit(1);
});
