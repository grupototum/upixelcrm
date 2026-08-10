// PC-029 — rate limiting compartilhado das edge functions.
//
// Desenhado para FALHAR ABERTO: se o banco não responder, a checagem deixa a
// request passar. Um webhook de inbound derrubado por indisponibilidade da
// tabela de rate limit perderia mensagem de cliente — o custo de errar para o
// lado permissivo é muito menor que o de errar para o lado restritivo.

export interface RateLimitResult {
  allowed: boolean;
  hits: number;
  limit: number;
}

/** Deriva um identificador do chamador. Cai para "unknown" quando não há proxy header. */
export function callerKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim();
  return ip || req.headers.get("cf-connecting-ip") || "unknown";
}

/**
 * Conta a request na janela corrente e diz se passou do teto.
 *
 * @param adminClient  cliente com service role (a tabela é fechada para anon/authenticated)
 * @param key          identificador do balde, ex.: "whatsapp-webhook:203.0.113.7"
 * @param limit        máximo de hits na janela
 * @param windowSeconds tamanho da janela em segundos
 */
export async function checkRateLimit(
  adminClient: any,
  key: string,
  limit: number,
  windowSeconds = 60,
): Promise<RateLimitResult> {
  try {
    const { data, error } = await adminClient.rpc("bump_rate_limit", {
      p_key: key,
      p_window_seconds: windowSeconds,
    });

    if (error) {
      console.error("[rate-limit] bump falhou, liberando:", error.message);
      return { allowed: true, hits: 0, limit };
    }

    const hits = Number(data ?? 0);
    return { allowed: hits <= limit, hits, limit };
  } catch (err) {
    console.error("[rate-limit] exceção, liberando:", err);
    return { allowed: true, hits: 0, limit };
  }
}

/** Resposta 429 padrão, com Retry-After. */
export function tooManyRequests(headers: Record<string, string>, windowSeconds = 60): Response {
  return new Response(JSON.stringify({ error: "rate_limited" }), {
    status: 429,
    headers: { ...headers, "Content-Type": "application/json", "Retry-After": String(windowSeconds) },
  });
}

/** Teto configurável por env, com default generoso para não cortar tráfego real. */
export function limitFromEnv(envVar: string, fallback: number): number {
  const raw = Deno.env.get(envVar);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
