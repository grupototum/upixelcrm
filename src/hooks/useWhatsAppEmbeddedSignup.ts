import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

interface SignupResult {
  phone_number_id: string;
  waba_id: string;
  display_phone_number: string;
  verified_name: string;
  registered: boolean;
  subscribed: boolean;
}

const SDK_SRC = "https://connect.facebook.net/en_US/sdk.js";
const SDK_SCRIPT_ID = "facebook-jssdk";

let sdkPromise: Promise<void> | null = null;

function loadFacebookSdk(appId: string, version: string): Promise<void> {
  if (window.FB) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    if (document.getElementById(SDK_SCRIPT_ID)) {
      const check = setInterval(() => {
        if (window.FB) {
          clearInterval(check);
          resolve();
        }
      }, 50);
      setTimeout(() => {
        clearInterval(check);
        if (!window.FB) reject(new Error("FB SDK timeout"));
      }, 10000);
      return;
    }

    window.fbAsyncInit = () => {
      if (!window.FB) {
        reject(new Error("FB global ausente após init"));
        return;
      }
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

export function useWhatsAppEmbeddedSignup() {
  const [loading, setLoading] = useState(false);
  const sessionDataRef = useRef<{ waba_id?: string; phone_number_id?: string }>({});

  const startSignup = useCallback(async (): Promise<SignupResult | null> => {
    setLoading(true);
    try {
      // 1. Pull SDK config from backend (app_id + config_id, no secrets)
      const { data: cfg, error: cfgErr } = await supabase.functions.invoke(
        "whatsapp-embedded-signup?action=config"
      );
      if (cfgErr || cfg?.error) {
        throw new Error(cfg?.error || cfgErr?.message);
      }
      if (!cfg?.app_id || !cfg?.config_id) {
        throw new Error(
          "Embedded Signup não configurado. Defina META_WA_EMBEDDED_SIGNUP_CONFIG_ID."
        );
      }

      // 2. Load FB SDK lazily
      await loadFacebookSdk(cfg.app_id, cfg.graph_version || "v21.0");
      if (!window.FB) throw new Error("Facebook SDK indisponível");

      // 3. Listen for postMessage events from Meta's embedded UI to capture
      // waba_id + phone_number_id (these are NOT delivered via the FB.login
      // callback — only via the WA_EMBEDDED_SIGNUP message stream).
      sessionDataRef.current = {};
      const messageListener = (event: MessageEvent) => {
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
          // ignore non-JSON messages
        }
      };
      window.addEventListener("message", messageListener);

      // 4. Run FB.login with the Embedded Signup config_id
      const loginResult = await new Promise<{ code?: string; status: string }>((resolve) => {
        window.FB!.login(
          (response) => resolve({ code: response.authResponse?.code, status: response.status }),
          {
            config_id: cfg.config_id,
            response_type: "code",
            override_default_response_type: true,
            extras: { setup: {}, featureType: "whatsapp_embedded_signup", sessionInfoVersion: "2" },
          }
        );
      });

      window.removeEventListener("message", messageListener);

      if (!loginResult.code) {
        if (loginResult.status === "unknown") return null; // user cancelled
        throw new Error(`Login retornou status: ${loginResult.status}`);
      }

      const { waba_id, phone_number_id } = sessionDataRef.current;
      if (!waba_id || !phone_number_id) {
        throw new Error(
          "Não foi possível capturar waba_id/phone_number_id. O usuário pode ter fechado antes de finalizar."
        );
      }

      // 5. Hand off to backend to register phone, subscribe webhook, persist integration
      const { data: finishData, error: finishErr } = await supabase.functions.invoke(
        "whatsapp-embedded-signup?action=finish",
        { body: { code: loginResult.code, waba_id, phone_number_id } }
      );
      if (finishErr || finishData?.error) {
        throw new Error(finishData?.error || finishErr?.message);
      }

      toast.success(
        `WhatsApp conectado: ${finishData.display_phone_number || finishData.verified_name}`
      );
      return finishData as SignupResult;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro no signup";
      toast.error(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, startSignup };
}
