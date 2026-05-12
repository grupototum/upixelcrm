import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, AlertCircle, Facebook } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ensureFbSdkLoaded, isMetaOrigin, type FBLoginResponse } from "@/lib/facebook-sdk";

// As env vars são INJETADAS no build pelo Vite. Sem ambas, o caminho Embedded
// fica oculto e o usuário cai no fluxo manual. Por isso o admin precisa setá-las.
const META_APP_ID = import.meta.env.VITE_META_APP_ID as string | undefined;
const META_CONFIG_ID = import.meta.env.VITE_META_WHATSAPP_CONFIG_ID as string | undefined;

interface SessionInfoMessage {
  type: "WA_EMBEDDED_SIGNUP";
  event: "FINISH" | "CANCEL" | "ERROR";
  data?: {
    phone_number_id?: string;
    waba_id?: string;
    business_id?: string;
    current_step?: string;
    error_message?: string;
    error_id?: string;
  };
}

interface Props {
  onConnected?: () => void;
}

export function CloudEmbeddedSignup({ onConnected }: Props) {
  const configured = !!(META_APP_ID && META_CONFIG_ID);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"idle" | "loading_sdk" | "popup" | "exchanging" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<{
    display_phone_number?: string;
    verified_name?: string;
    webhook_auto_registered?: boolean;
    webhook_error?: string | null;
  } | null>(null);
  const sessionInfoRef = useRef<SessionInfoMessage["data"] | null>(null);

  // Listener da janela: a Meta posta `sessionInfoVersion: 3` durante o flow,
  // entregando phone_number_id e waba_id MESMO antes do callback de FB.login.
  useEffect(() => {
    if (!configured) return;
    const handler = (event: MessageEvent) => {
      if (!isMetaOrigin(event.origin)) return;
      try {
        const payload: SessionInfoMessage = typeof event.data === "string"
          ? JSON.parse(event.data)
          : event.data;
        if (payload?.type !== "WA_EMBEDDED_SIGNUP") return;
        if (payload.event === "FINISH" && payload.data) {
          sessionInfoRef.current = payload.data;
        } else if (payload.event === "CANCEL") {
          setPhase("idle");
          setLoading(false);
        } else if (payload.event === "ERROR" && payload.data?.error_message) {
          setError(`Meta retornou erro: ${payload.data.error_message}`);
          setPhase("idle");
          setLoading(false);
        }
      } catch {
        /* ignora mensagens não-JSON */
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [configured]);

  const handleLaunch = useCallback(async () => {
    if (!configured || !META_APP_ID || !META_CONFIG_ID) {
      toast.error("Embedded Signup não configurado. Use o cadastro manual.");
      return;
    }
    setError(null);
    setInfo(null);
    sessionInfoRef.current = null;
    setLoading(true);
    setPhase("loading_sdk");

    try {
      await ensureFbSdkLoaded(META_APP_ID);
    } catch (err: any) {
      setError(`Falha ao carregar Facebook SDK: ${err?.message ?? "erro desconhecido"}`);
      setPhase("idle");
      setLoading(false);
      return;
    }

    setPhase("popup");

    window.FB!.login(
      (response: FBLoginResponse) => {
        const code = response.authResponse?.code;
        if (!code) {
          setPhase("idle");
          setLoading(false);
          if (response.status !== "unknown") {
            setError("Conexão cancelada antes de finalizar.");
          }
          return;
        }

        const sessionInfo = sessionInfoRef.current;
        const phone_number_id = sessionInfo?.phone_number_id;
        const waba_id = sessionInfo?.waba_id ?? sessionInfo?.business_id;

        if (!phone_number_id || !waba_id) {
          setError("A Meta não devolveu phone_number_id/waba_id. Tente de novo ou use o cadastro manual.");
          setPhase("idle");
          setLoading(false);
          return;
        }

        // Backend troca code → token + cria integration + registra webhook
        setPhase("exchanging");
        (async () => {
          try {
            const { data, error } = await supabase.functions.invoke(
              "whatsapp-cloud-exchange-token",
              { body: { code, phone_number_id, waba_id } },
            );
            if (error) throw new Error(error.message);
            if (!data?.success) throw new Error(data?.error ?? "Falha desconhecida");

            setInfo({
              display_phone_number: data.display_phone_number,
              verified_name: data.verified_name,
              webhook_auto_registered: data.webhook_auto_registered,
              webhook_error: data.webhook_error,
            });
            setPhase("success");
            toast.success("WhatsApp Cloud conectado!");
            onConnected?.();
          } catch (err: any) {
            setError(err?.message ?? "Falha ao finalizar conexão.");
            setPhase("idle");
          } finally {
            setLoading(false);
          }
        })();
      },
      {
        config_id: META_CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          feature: "whatsapp_embedded_signup",
          sessionInfoVersion: 3,
        },
      },
    );
  }, [configured, onConnected]);

  if (!configured) {
    return (
      <div className="rounded-lg border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground mb-1">Conexão automática indisponível</p>
        <p className="leading-relaxed">
          O administrador do uPixel precisa configurar <code className="text-foreground">VITE_META_APP_ID</code> e
          {" "}<code className="text-foreground">VITE_META_WHATSAPP_CONFIG_ID</code>. Por enquanto, use o cadastro manual abaixo.
        </p>
      </div>
    );
  }

  if (phase === "success" && info) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/5 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <p className="text-sm font-bold text-success">WhatsApp conectado!</p>
        </div>
        <div className="text-xs space-y-1 text-foreground/80 pl-7">
          <p><strong>Número:</strong> {info.display_phone_number || "—"}</p>
          <p><strong>Nome verificado:</strong> {info.verified_name || "—"}</p>
          <p>
            <strong>Webhook:</strong>{" "}
            {info.webhook_auto_registered ? "✅ registrado automaticamente" : `⚠️ falhou (${info.webhook_error ?? "tentar manualmente"})`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleLaunch}
        disabled={loading}
        className="w-full bg-[#1877F2] hover:bg-[#155bcc] text-white gap-2 h-11 text-sm font-semibold"
      >
        {phase === "loading_sdk" && <><Loader2 className="h-4 w-4 animate-spin" /> Carregando Facebook…</>}
        {phase === "popup" && <><Loader2 className="h-4 w-4 animate-spin" /> Aguardando seleção…</>}
        {phase === "exchanging" && <><Loader2 className="h-4 w-4 animate-spin" /> Conectando ao uPixel…</>}
        {phase === "idle" && <><Facebook className="h-4 w-4" /> Continuar com Facebook</>}
      </Button>
      <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
        Você será redirecionado pra Meta. Selecione sua conta WhatsApp Business e o número desejado.
      </p>
      {error && (
        <div className="flex items-start gap-2 bg-destructive/5 border border-destructive/30 rounded-lg p-3">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}
