// Carrega e valida a configuração do worker a partir do ambiente.
// Node 20.6+ carrega `.env` automaticamente com `node --env-file=.env`; com tsx
// use `tsx --env-file=.env src/index.ts` (ver README). Aqui só lemos process.env.

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value.trim();
}

function optionalInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function optionalFloat(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

const DEFAULT_SYSTEM_PROMPT = [
  "Você é um SDR (Sales Development Representative) da uPixel, respondendo por WhatsApp em português do Brasil.",
  "Seu objetivo é entender a necessidade do lead, responder dúvidas de forma cordial e objetiva e qualificar o interesse.",
  "Regras:",
  "- Seja breve e natural, como uma conversa real de WhatsApp (evite textões).",
  "- Nunca invente preços, prazos ou informações que você não tem certeza; ofereça encaminhar para um humano quando necessário.",
  "- Não peça dados sensíveis (senha, cartão, documentos).",
  "- Escreva sempre em português do Brasil.",
].join("\n");

export interface WorkerConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  llmBaseUrl: string;
  llmApiKey: string;
  llmModel: string;
  pollIntervalMs: number;
  batchSize: number;
  maxAttempts: number;
  historyLimit: number;
  llmTemperature: number;
  systemPrompt: string;
}

export function loadConfig(): WorkerConfig {
  return {
    supabaseUrl: required("SUPABASE_URL"),
    supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
    llmBaseUrl: required("LLM_BASE_URL").replace(/\/+$/, ""),
    llmApiKey: required("LLM_API_KEY"),
    llmModel: required("LLM_MODEL"),
    pollIntervalMs: optionalInt("SDR_POLL_INTERVAL_MS", 5000),
    batchSize: optionalInt("SDR_BATCH_SIZE", 5),
    maxAttempts: optionalInt("SDR_MAX_ATTEMPTS", 5),
    historyLimit: optionalInt("SDR_HISTORY_LIMIT", 10),
    llmTemperature: optionalFloat("SDR_LLM_TEMPERATURE", 0.5),
    systemPrompt: (process.env.SDR_SYSTEM_PROMPT || "").trim() || DEFAULT_SYSTEM_PROMPT,
  };
}
