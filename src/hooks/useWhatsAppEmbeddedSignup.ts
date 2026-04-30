import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SignupResult {
  phone_number_id: string;
  waba_id: string;
  display_phone_number: string;
  verified_name: string;
  registered: boolean;
  subscribed: boolean;
}

// Opens a popup on the ROOT domain to run Meta's Embedded Signup. The popup
// page handles FB.login() and posts the result back via window.opener.
// Multi-tenant: only the root domain needs to be allowlisted in Meta's JSSDK
// settings (Meta no longer accepts wildcard subdomains).
export function useWhatsAppEmbeddedSignup() {
  const [loading, setLoading] = useState(false);

  const startSignup = useCallback(async (): Promise<SignupResult | null> => {
    setLoading(true);

    let popup: Window | null = null;
    let messageListener: ((event: MessageEvent) => void) | null = null;
    let pollInterval: number | null = null;

    const cleanup = () => {
      if (messageListener) window.removeEventListener("message", messageListener);
      if (pollInterval !== null) window.clearInterval(pollInterval);
    };

    try {
      const tenant = window.location.hostname.split(".")[0] || "";

      const { data: initData, error: initErr } = await supabase.functions.invoke(
        "whatsapp-embedded-signup?action=initiate",
        { body: { tenant } }
      );
      if (initErr || initData?.error) {
        throw new Error(initData?.error || initErr?.message);
      }
      if (!initData?.popup_url) throw new Error("popup_url ausente na resposta");

      const popupUrl = initData.popup_url as string;
      const expectedOrigin = new URL(popupUrl).origin;

      popup = window.open(
        popupUrl,
        "wa_embedded_signup",
        "width=720,height=820,resizable=yes,scrollbars=yes,status=yes"
      );
      if (!popup) {
        throw new Error("Popup bloqueado pelo navegador. Habilite popups e tente novamente.");
      }
      popup.focus();

      const result = await new Promise<SignupResult | null>((resolve, reject) => {
        messageListener = (event: MessageEvent) => {
          if (event.origin !== expectedOrigin) return;
          const data = event.data;
          if (!data || data.type !== "WA_EMBEDDED_SIGNUP_RESULT") return;

          if (data.cancelled) return resolve(null);
          if (data.ok) return resolve(data.result as SignupResult);
          reject(new Error(data.error || "Falha desconhecida"));
        };
        window.addEventListener("message", messageListener);

        pollInterval = window.setInterval(() => {
          if (popup && popup.closed) {
            window.clearInterval(pollInterval!);
            pollInterval = null;
            resolve(null); // user closed popup without finishing
          }
        }, 500);
      });

      if (result) {
        toast.success(
          `WhatsApp conectado: ${result.display_phone_number || result.verified_name || ""}`
        );
      }
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro no signup";
      toast.error(msg);
      return null;
    } finally {
      cleanup();
      setLoading(false);
    }
  }, []);

  return { loading, startSignup };
}
