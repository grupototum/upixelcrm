import { useEffect, useState } from "react";
import { useMetaOAuth } from "@/hooks/useMetaOAuth";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

// Callback page hit on the ROOT domain (e.g. https://upixel.app/oauth/meta/callback)
// after Meta redirects back from the OAuth dialog. We exchange the code for a
// long-lived token, then bounce the user to their tenant subdomain so they can
// pick which WABA / IG account / Ad account to actually connect.
export default function MetaCallbackPage() {
  const { exchangeCode } = useMetaOAuth();
  const [status, setStatus] = useState<"working" | "success" | "error">("working");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const errorParam = params.get("error");
    const errorDescription = params.get("error_description");

    if (errorParam) {
      setStatus("error");
      setErrorMsg(errorDescription || errorParam);
      return;
    }

    if (!code || !state) {
      setStatus("error");
      setErrorMsg("Parâmetros 'code' ou 'state' ausentes na URL de retorno.");
      return;
    }

    (async () => {
      try {
        const result = await exchangeCode(code, state);
        setStatus("success");

        // Build redirect URL on tenant subdomain
        const rootDomain =
          window.location.hostname.split(".").slice(-2).join(".") || window.location.hostname;
        const target = result.tenant_subdomain
          ? `https://${result.tenant_subdomain}.${rootDomain}/oauth/meta/select?session=${result.oauth_session_id}&type=${result.type}`
          : `/oauth/meta/select?session=${result.oauth_session_id}&type=${result.type}`;

        // Tiny delay so the user sees the success state
        setTimeout(() => {
          window.location.href = target;
        }, 800);
      } catch (err: any) {
        setStatus("error");
        setErrorMsg(err.message || "Falha desconhecida");
      }
    })();
  }, [exchangeCode]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center space-y-4">
        {status === "working" && (
          <>
            <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <h1 className="text-lg font-bold">Conectando com a Meta…</h1>
            <p className="text-xs text-muted-foreground">
              Trocando o código de autorização por um token de longa duração e descobrindo suas
              contas. Não feche esta janela.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="h-16 w-16 mx-auto rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h1 className="text-lg font-bold">Autorização concluída!</h1>
            <p className="text-xs text-muted-foreground">
              Redirecionando para escolher qual conta conectar…
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="h-16 w-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-lg font-bold">Erro na autorização</h1>
            <p className="text-xs text-muted-foreground break-words">{errorMsg}</p>
            <a
              href="/"
              className="inline-block text-xs text-primary hover:underline mt-2"
            >
              Voltar
            </a>
          </>
        )}
      </div>
    </div>
  );
}
