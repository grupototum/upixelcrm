import { useEffect, useRef, useState } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    FB?: {
      init: (params: Record<string, unknown>) => void;
      login: (
        cb: (response: { authResponse?: { code?: string }; status: string }) => void,
        params: Record<string, unknown>
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

const SDK_SRC = "https://connect.facebook.net/en_US/sdk.js";
const SDK_SCRIPT_ID = "facebook-jssdk";

let sdkPromise: Promise<void> | null = null;

function loadFacebookSdk(appId: string, version: string): Promise<void> {
  if (window.FB) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    window.fbAsyncInit = () => {
      if (!window.FB) return reject(new Error("FB ausente após init"));
      window.FB.init({ appId, cookie: true, xfbml: false, version });
      resolve();
    };
    const script = document.createElement("script");
    script.id = SDK_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.src = SDK_SRC;
    script.onerror = () => reject(new Error("Falha ao carregar Facebook SDK"));
    document.body.appendChild(script);
  });

  return sdkPromise;
}

// Public popup page rendered on the ROOT domain (e.g. upixel.app/oauth/whatsapp/connect).
// The tenant subdomain opens this in window.open() carrying a HMAC-signed
// state param. Here we run FB.login() with the Embedded Signup config and
// hand the result back to the parent via postMessage, then close.
export default function WhatsAppConnectPage() {
  const [status, setStatus] = useState<"working" | "success" | "error" | "cancelled">("working");
  const [errorMsg, setErrorMsg] = useState("");
  const [details, setDetails] = useState<string>("");
  const sessionDataRef = useRef<{ waba_id?: string; phone_number_id?: string }>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const state = params.get("state");

    if (!state) {
      setStatus("error");
      setErrorMsg("Parâmetro 'state' ausente na URL.");
      return;
    }

    let cancelled = false;
    let messageListener: ((event: MessageEvent) => void) | null = null;

    const post = (payload: Record<string, unknown>) => {
      if (window.opener) {
        try {
          window.opener.postMessage({ type: "WA_EMBEDDED_SIGNUP_RESULT", ...payload }, "*");
        } catch {
          // ignore — the opener may have navigated away
        }
      }
    };

    (async () => {
      try {
        const { data: cfg, error: cfgErr } = await supabase.functions.invoke(
          "whatsapp-embedded-signup?action=config"
        );
        if (cfgErr || cfg?.error) throw new Error(cfg?.error || cfgErr?.message);
        if (!cfg?.app_id || !cfg?.config_id) {
          throw new Error("META_WA_EMBEDDED_SIGNUP_CONFIG_ID não configurado");
        }

        await loadFacebookSdk(cfg.app_id, cfg.graph_version || "v21.0");
        if (cancelled || !window.FB) return;

        sessionDataRef.current = {};
        messageListener = (event: MessageEvent) => {
          if (
            event.origin !== "https://www.facebook.com" &&
            event.origin !== "https://web.facebook.com"
          ) return;
          try {
            const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
            if (data?.type !== "WA_EMBEDDED_SIGNUP") return;
            if (data?.event === "FINISH" || data?.event === "FINISH_ONLY_WABA") {
              sessionDataRef.current = {
                waba_id: data?.data?.waba_id,
                phone_number_id: data?.data?.phone_number_id,
              };
            }
          } catch {
            // ignore
          }
        };
        window.addEventListener("message", messageListener);

        const loginResult = await new Promise<{ code?: string; status: string }>((resolve) => {
          window.FB!.login(
            (response) =>
              resolve({ code: response.authResponse?.code, status: response.status }),
            {
              config_id: cfg.config_id,
              response_type: "code",
              override_default_response_type: true,
              extras: {
                setup: {},
                featureType: "whatsapp_embedded_signup",
                sessionInfoVersion: "2",
              },
            }
          );
        });

        if (messageListener) window.removeEventListener("message", messageListener);

        if (!loginResult.code) {
          setStatus("cancelled");
          post({ ok: false, cancelled: true });
          setTimeout(() => window.close(), 1500);
          return;
        }

        const { waba_id, phone_number_id } = sessionDataRef.current;
        if (!waba_id || !phone_number_id) {
          throw new Error(
            "Não foi possível capturar waba_id/phone_number_id (usuário pode ter fechado antes do FINISH)."
          );
        }

        const { data: finishData, error: finishErr } = await supabase.functions.invoke(
          "whatsapp-embedded-signup?action=finish",
          { body: { state, code: loginResult.code, waba_id, phone_number_id } }
        );
        if (finishErr || finishData?.error) {
          throw new Error(finishData?.error || finishErr?.message);
        }

        if (cancelled) return;
        setStatus("success");
        setDetails(finishData.display_phone_number || finishData.verified_name || "");
        post({ ok: true, result: finishData });
        setTimeout(() => window.close(), 1500);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        setStatus("error");
        setErrorMsg(msg);
        post({ ok: false, error: msg });
      }
    })();

    return () => {
      cancelled = true;
      if (messageListener) window.removeEventListener("message", messageListener);
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center space-y-4">
        {status === "working" && (
          <>
            <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <h1 className="text-lg font-bold">Conectando ao WhatsApp…</h1>
            <p className="text-xs text-muted-foreground">
              Aguarde a janela do Meta abrir. Não feche esta aba até concluir.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="h-16 w-16 mx-auto rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h1 className="text-lg font-bold">Conectado!</h1>
            {details && (
              <p className="text-xs text-muted-foreground break-words">{details}</p>
            )}
            <p className="text-[10px] text-muted-foreground">Fechando janela…</p>
          </>
        )}

        {status === "cancelled" && (
          <>
            <div className="h-16 w-16 mx-auto rounded-full bg-muted/40 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h1 className="text-lg font-bold">Conexão cancelada</h1>
            <p className="text-xs text-muted-foreground">Você pode tentar novamente quando quiser.</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="h-16 w-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-lg font-bold">Erro</h1>
            <p className="text-xs text-muted-foreground break-words">{errorMsg}</p>
            <button
              onClick={() => window.close()}
              className="text-xs text-primary hover:underline mt-2"
            >
              Fechar janela
            </button>
          </>
        )}
      </div>
    </div>
  );
}
