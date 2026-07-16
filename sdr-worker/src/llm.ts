// Cliente mínimo para LLMs compatíveis com a API OpenAI (/chat/completions).
// Funciona com OpenAI, NVIDIA NIM, Groq, OpenRouter, vLLM local, etc.

import type { WorkerConfig } from "./config.ts";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function generateReply(
  config: WorkerConfig,
  messages: ChatMessage[],
): Promise<string> {
  const url = `${config.llmBaseUrl}/chat/completions`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.llmApiKey}`,
      },
      body: JSON.stringify({
        model: config.llmModel,
        temperature: config.llmTemperature,
        messages,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`LLM HTTP ${res.status}: ${body.slice(0, 500)}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("LLM retornou resposta vazia");
    }
    return content;
  } finally {
    clearTimeout(timeout);
  }
}
