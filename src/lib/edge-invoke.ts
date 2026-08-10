import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Refresca a sessão se o JWT expira em menos de 60s,
// evitando que o invoke chegue à edge function com token vencido.
async function ensureFreshSession(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return false;

  const expiresAt = session.expires_at ?? 0;
  const now = Math.floor(Date.now() / 1000);
  if (expiresAt - now < 60) {
    const { error } = await supabase.auth.refreshSession();
    if (error) return false;
  }
  return true;
}

type InvokeOptions = Parameters<typeof supabase.functions.invoke>[1];
type InvokeResult = Awaited<ReturnType<typeof supabase.functions.invoke>>;

// Invoke com pre-flight refresh + retry uma vez no 401 (sessão renovada entre as tentativas).
export async function invokeEdge(
  functionName: string,
  options?: InvokeOptions,
): Promise<InvokeResult> {
  const fresh = await ensureFreshSession();
  if (!fresh) {
    return { data: null, error: new Error("Sessão expirada. Faça login novamente.") } as InvokeResult;
  }

  let result = await supabase.functions.invoke(functionName, options);

  if (result.error instanceof FunctionsHttpError && result.error.context?.status === 401) {
    // Lê o body do erro para diagnosticar a causa real (missing_header vs invalid_jwt vs outro).
    let firstAttemptBody: unknown = null;
    try {
      firstAttemptBody = await result.error.context.clone().json();
    } catch {
      try { firstAttemptBody = await result.error.context.clone().text(); } catch { /* noop */ }
    }
    // Loga só o código/mensagem do erro — o body completo pode conter detalhes de sessão/JWT.
    const bodySummary =
      typeof firstAttemptBody === "object" && firstAttemptBody !== null
        ? (firstAttemptBody as { code?: unknown; error_code?: unknown; msg?: unknown; message?: unknown; error?: unknown })
        : null;
    console.warn("[invokeEdge] 401 on first attempt", {
      functionName,
      code: bodySummary?.code ?? bodySummary?.error_code,
      message: String(bodySummary?.msg ?? bodySummary?.message ?? bodySummary?.error ?? firstAttemptBody ?? "").slice(0, 200),
    });

    const { error: refreshError, data: refreshed } = await supabase.auth.refreshSession();
    console.warn("[invokeEdge] refreshSession result", {
      ok: !refreshError,
      hasNewSession: !!refreshed?.session,
      error: refreshError?.message,
    });

    if (!refreshError) {
      result = await supabase.functions.invoke(functionName, options);
      if (result.error instanceof FunctionsHttpError && result.error.context?.status === 401) {
        let retryBody: unknown = null;
        try { retryBody = await result.error.context.clone().json(); } catch { /* noop */ }
        console.error("[invokeEdge] 401 after refresh+retry — session likely revoked", {
          functionName,
          body: retryBody,
        });
      }
    }
  }

  return result;
}
