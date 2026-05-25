import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const FB_OAUTH_STATE_KEY = "fb_oauth_state";
export const FB_OAUTH_CODE_KEY = "fb_oauth_code";
export const FB_OAUTH_PAGES_KEY = "fb_oauth_pages";
export const FB_OAUTH_REDIRECT_URI_KEY = "fb_oauth_redirect_uri";

export default function FacebookOAuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const code = params.get("code");
    const state = params.get("state");
    const fbError = params.get("error") ?? params.get("error_message");

    if (fbError) {
      setError(`Facebook retornou erro: ${fbError}`);
      return;
    }
    if (!code) {
      setError("Callback do Facebook sem código de autorização.");
      return;
    }

    const expectedState = sessionStorage.getItem(FB_OAUTH_STATE_KEY);
    if (!expectedState || expectedState !== state) {
      setError("State inválido (possível CSRF). Inicie a conexão novamente.");
      return;
    }

    const redirectUri = sessionStorage.getItem(FB_OAUTH_REDIRECT_URI_KEY);
    if (!redirectUri) {
      setError("redirect_uri não encontrado em sessionStorage.");
      return;
    }

    (async () => {
      try {
        const { data, error: invokeError } = await supabase.functions.invoke(
          "facebook-page-embedded-signup?action=list",
          { body: { code, redirect_uri: redirectUri } },
        );
        if (invokeError) throw new Error(invokeError.message);
        if (data?.error) throw new Error(data.error);

        const pages = (data?.pages ?? []) as Array<{ id: string; name: string; category?: string | null }>;
        if (pages.length === 0) {
          setError("Nenhuma página Facebook encontrada nesta conta.");
          return;
        }

        sessionStorage.setItem(FB_OAUTH_CODE_KEY, code);
        sessionStorage.setItem(FB_OAUTH_PAGES_KEY, JSON.stringify(pages));
        sessionStorage.removeItem(FB_OAUTH_STATE_KEY);
        navigate("/facebook-page?fb_callback=1", { replace: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Falha ao listar páginas.";
        setError(msg);
      }
    })();
  }, [params, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4 text-center">
        {!error ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#1877F2]" />
            <p className="text-sm font-semibold">Conectando ao Facebook…</p>
            <p className="text-xs text-muted-foreground">
              Estamos buscando suas páginas. Isso leva alguns segundos.
            </p>
          </>
        ) : (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3 text-left">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-destructive">Falha na conexão</p>
                <p className="text-xs text-destructive/90 mt-1">{error}</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/facebook-page", { replace: true })}
              className="text-xs underline text-muted-foreground hover:text-foreground"
            >
              Voltar para integrações
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
