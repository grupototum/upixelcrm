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
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError) {
      result = await supabase.functions.invoke(functionName, options);
    }
  }

  return result;
}
