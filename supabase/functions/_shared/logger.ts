// Logger estruturado JSON pra edge functions Deno.
//
// Emite uma linha JSON por evento via console.log/warn/error — o Supabase
// coleta automaticamente no Logs Explorer e o filtro por campo funciona
// (level, event, request_id, etc.). Sem dependência externa.
//
// Uso:
//   const log = createLogger("whatsapp-templates", { request_id, user_id, tenant_id });
//   log.info("template_create_attempt", { template_name });
//   log.error("meta_rejected", { meta_status, meta_body });
//
// Sanitização: NUNCA inclua dados sensíveis em `context` ou `data`.
// Use `redact()` pra strings que podem conter token/senha/PII.
// LGPD: e-mails, telefones, nomes completos só com consentimento explícito
//       e justificativa funcional. Prefira IDs (user_id, lead_id).

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export interface LogContext {
  request_id?: string;
  user_id?: string;
  tenant_id?: string;
  client_id?: string;
  action?: string;
  [key: string]: unknown;
}

interface LogEntry {
  ts: string;
  level: LogLevel;
  service: string;
  event: string;
  context: LogContext;
  data?: Record<string, unknown>;
}

const SENSITIVE_KEYS = new Set([
  "password", "senha", "token", "access_token", "refresh_token",
  "api_key", "apikey", "secret", "authorization",
  "phone_number_id_secret", "webhook_verify_token",
]);

/** Mascara recursivamente chaves sensíveis em objetos pra logar com segurança. */
export function redact<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((v) => redact(v)) as unknown as T;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      out[k] = typeof v === "string" && v.length > 4
        ? `***${v.slice(-4)}`
        : "***";
    } else if (typeof v === "object" && v !== null) {
      out[k] = redact(v);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

export interface Logger {
  /** Adiciona/sobrescreve campos do context — útil quando user_id/tenant_id
   *  só ficam disponíveis depois da autenticação. */
  withContext(extra: LogContext): Logger;
  debug(event: string, data?: Record<string, unknown>): void;
  info(event: string, data?: Record<string, unknown>): void;
  warn(event: string, data?: Record<string, unknown>): void;
  error(event: string, data?: Record<string, unknown>): void;
  fatal(event: string, data?: Record<string, unknown>): void;
}

function emit(entry: LogEntry): void {
  const line = JSON.stringify(entry);
  if (entry.level === "error" || entry.level === "fatal") console.error(line);
  else if (entry.level === "warn") console.warn(line);
  else console.log(line);
}

export function createLogger(service: string, initialContext: LogContext = {}): Logger {
  const context: LogContext = { ...initialContext };

  const make = (level: LogLevel) => (event: string, data?: Record<string, unknown>) => {
    emit({
      ts: new Date().toISOString(),
      level,
      service,
      event,
      context: { ...context },
      ...(data ? { data: redact(data) } : {}),
    });
  };

  const logger: Logger = {
    withContext(extra) {
      Object.assign(context, extra);
      return logger;
    },
    debug: make("debug"),
    info: make("info"),
    warn: make("warn"),
    error: make("error"),
    fatal: make("fatal"),
  };
  return logger;
}

/** Gera um request_id curto pra correlacionar logs de uma mesma requisição. */
export function newRequestId(): string {
  return crypto.randomUUID().slice(0, 8);
}
