import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Instagram, CheckCircle2, Loader2, AlertCircle, Facebook } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ensureFbSdkLoaded, type FBLoginResponse } from "@/lib/facebook-sdk";

const META_APP_ID = import.meta.env.VITE_META_APP_ID as string | undefined;
const META_IG_CONFIG_ID = import.meta.env.VITE_META_INSTAGRAM_CONFIG_ID as string | undefined;

interface ConnectedInfo {
  ig_username?: string;
  ig_name?: string;
  ig_profile_picture_url?: string;
  page_name?: string;
  webhook_auto_registered?: boolean;
  webhook_error?: string | null;
}

interface PageOption {
  page_id: string;
  page_name: string;
  ig_user_id: string;
}

interface Props {
  onConnected?: () => void;
}

export function InstagramEmbeddedSignup({ onConnected }: Props) {
  const configured = !!(META_APP_ID && META_IG_CONFIG_ID);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<
    "idle" | "loading_sdk" | "popup" | "exchanging" | "choose_page" | "success"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<ConnectedInfo | null>(null);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [pageOptions, setPageOptions] = useState<PageOption[]>([]);

  const finalizeWithCode = useCallback(
    async (code: string, pageId?: string, igUserId?: string) => {
      setPhase("exchanging");
      try {
        const { data, error } = await supabase.functions.invoke(
          "instagram-exchange-token",
          {
            body: {
              code,
              ...(pageId ? { page_id: pageId } : {}),
              ...(igUserId ? { ig_user_id: igUserId } : {}),
            },
          },
        );
        if (error) throw new Error(error.message);
        if (data?.needs_selection) {
          setPageOptions(data.pages ?? []);
          setPendingCode(code);
          setPhase("choose_page");
          setLoading(false);
          return;
        }
        if (!data?.success) throw new Error(data?.error ?? "Falha desconhecida");

        setInfo({
          ig_username: data.ig_username,
          ig_name: data.ig_name,
          ig_profile_picture_url: data.ig_profile_picture_url,
          page_name: data.page_name,
          webhook_auto_registered: data.webhook_auto_registered,
          webhook_error: data.webhook_error,
        });
        setPhase("success");
        toast.success("Instagram conectado!");
        onConnected?.();
      } catch (err: any) {
        setError(err?.message ?? "Falha ao finalizar conexão.");
        setPhase("idle");
      } finally {
        setLoading(false);
      }
    },
    [onConnected],
  );

  const handleLaunch = useCallback(async () => {
    if (!configured || !META_APP_ID || !META_IG_CONFIG_ID) {
      toast.error("Embedded Signup do Instagram não configurado.");
      return;
    }
    setError(null);
    setInfo(null);
    setPendingCode(null);
    setPageOptions([]);
    setLoading(true);
    setPhase("loading_sdk");

    try {
      await ensureFbSdkLoaded(META_APP_ID);
    } catch (err: any) {
      setError(`Falha ao carregar Facebook SDK: ${err?.message ?? "erro"}`);
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
        finalizeWithCode(code);
      },
      {
        config_id: META_IG_CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
      },
    );
  }, [configured, finalizeWithCode]);

  const handlePickPage = (opt: PageOption) => {
    if (!pendingCode) return;
    setLoading(true);
    finalizeWithCode(pendingCode, opt.page_id, opt.ig_user_id);
  };

  if (!configured) {
    return (
      <div className="rounded-lg border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground mb-1">Conexão automática indisponível</p>
        <p className="leading-relaxed">
          O administrador do uPixel precisa configurar <code className="text-foreground">VITE_META_APP_ID</code> e
          {" "}<code className="text-foreground">VITE_META_INSTAGRAM_CONFIG_ID</code>. Use o cadastro manual abaixo.
        </p>
      </div>
    );
  }

  if (phase === "success" && info) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/5 p-4 space-y-2">
        <div className="flex items-center gap-3">
          {info.ig_profile_picture_url ? (
            <img src={info.ig_profile_picture_url} alt="" className="h-10 w-10 rounded-full" />
          ) : (
            <Instagram className="h-8 w-8 text-success" />
          )}
          <div>
            <p className="text-sm font-bold text-success">Instagram conectado!</p>
            {info.ig_username && (
              <p className="text-xs text-muted-foreground">@{info.ig_username}{info.ig_name ? ` · ${info.ig_name}` : ""}</p>
            )}
          </div>
        </div>
        <div className="text-xs space-y-0.5 text-foreground/80">
          {info.page_name && <p><strong>Página Facebook:</strong> {info.page_name}</p>}
          <p>
            <strong>Webhook:</strong>{" "}
            {info.webhook_auto_registered ? "✅ registrado automaticamente" : `⚠️ falhou (${info.webhook_error ?? "registrar manualmente"})`}
          </p>
        </div>
      </div>
    );
  }

  if (phase === "choose_page" && pageOptions.length > 0) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Você gerencia mais de uma Página com conta Instagram. Escolha qual conectar:
        </p>
        {pageOptions.map((opt) => (
          <button
            key={opt.page_id}
            onClick={() => handlePickPage(opt)}
            disabled={loading}
            className="w-full text-left rounded-lg border border-border bg-card p-3 hover:bg-secondary/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <p className="text-sm font-bold">{opt.page_name}</p>
            <p className="text-[11px] text-muted-foreground">IG ID: {opt.ig_user_id}</p>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleLaunch}
        disabled={loading}
        className="w-full bg-gradient-to-r from-[#833AB4] via-[#E4405F] to-[#FCAF45] text-white gap-2 h-11 text-sm font-semibold hover:opacity-90"
      >
        {phase === "loading_sdk" && <><Loader2 className="h-4 w-4 animate-spin" /> Carregando Facebook…</>}
        {phase === "popup" && <><Loader2 className="h-4 w-4 animate-spin" /> Aguardando seleção…</>}
        {phase === "exchanging" && <><Loader2 className="h-4 w-4 animate-spin" /> Conectando ao uPixel…</>}
        {phase === "idle" && <><Facebook className="h-4 w-4" /> <Instagram className="h-4 w-4" /> Conectar Instagram via Facebook</>}
      </Button>
      <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
        Sua conta Instagram precisa ser <strong>Business</strong> e estar conectada a uma Página Facebook.
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
