import { FunctionsHttpError } from "@supabase/supabase-js";

/**
 * Extrai a mensagem real de erro de uma Edge Function chamada via
 * `supabase.functions.invoke`. Sem isto, o cliente só recebe
 * "Edge Function returned a non-2xx status code".
 */
export async function extractEdgeError(
  error: unknown,
  fallback = "Erro desconhecido",
): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (typeof body === "string") return body;
      if (body?.error) return String(body.error);
      if (body?.message) return String(body.message);
      return JSON.stringify(body);
    } catch {
      try {
        const text = await error.context.text();
        if (text) return text;
      } catch {
        /* noop */
      }
    }
    return `Edge Function HTTP ${error.context?.status ?? "?"}`;
  }
  if (error instanceof Error) return error.message || fallback;
  return fallback;
}
