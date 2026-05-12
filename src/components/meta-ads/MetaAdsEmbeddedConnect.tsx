import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, AlertCircle, Facebook, Target } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ensureFbSdkLoaded, type FBLoginResponse } from "@/lib/facebook-sdk";

const META_APP_ID = import.meta.env.VITE_META_APP_ID as string | undefined;
const META_ADS_CONFIG_ID = import.meta.env.VITE_META_ADS_CONFIG_ID as string | undefined;

interface AccountOption {
  id: string;
  account_id: string;
  name: string;
  currency: string;
  business?: string | null;
}

interface ConnectedInfo {
  ad_account_id?: string;
  ad_account_name?: string;
  currency?: string;
  business_name?: string | null;
}

interface Props {
  onConnected?: () => void;
}

export function MetaAdsEmbeddedConnect({ onConnected }: Props) {
  const configured = !!(META_APP_ID && META_ADS_CONFIG_ID);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<
    "idle" | "loading_sdk" | "popup" | "exchanging" | "choose_account" | "success"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<ConnectedInfo | null>(null);
  const [accountOptions, setAccountOptions] = useState<AccountOption[]>([]);
  const [pendingToken, setPendingToken] = useState<string | null>(null);

  const finalize = useCallback(
    async (code: string | null, longLivedToken?: string, adAccountId?: string) => {
      setPhase("exchanging");
      try {
        const { data, error } = await supabase.functions.invoke(
          "meta-ads-exchange-token",
          {
            body: {
              ...(code ? { code } : {}),
              ...(longLivedToken ? { long_lived_token: longLivedToken } : {}),
              ...(adAccountId ? { ad_account_id: adAccountId } : {}),
            },
          },
        );
        if (error) throw new Error(error.message);
        if (data?.needs_selection) {
          setAccountOptions(data.accounts ?? []);
          setPendingToken(data.long_lived_token);
          setPhase("choose_account");
          setLoading(false);
          return;
        }
        if (!data?.success) throw new Error(data?.error ?? "Falha desconhecida");
        setInfo({
          ad_account_id: data.ad_account_id,
          ad_account_name: data.ad_account_name,
          currency: data.currency,
          business_name: data.business_name,
        });
        setPhase("success");
        toast.success("Meta Ads conectado!");
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
    if (!configured || !META_APP_ID || !META_ADS_CONFIG_ID) {
      toast.error("Embedded Signup do Meta Ads não configurado.");
      return;
    }
    setError(null);
    setInfo(null);
    setAccountOptions([]);
    setPendingToken(null);
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
          if (response.status !== "unknown") setError("Conexão cancelada.");
          return;
        }
        finalize(code);
      },
      {
        config_id: META_ADS_CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
      },
    );
  }, [configured, finalize]);

  const handlePickAccount = (opt: AccountOption) => {
    if (!pendingToken) return;
    setLoading(true);
    finalize(null, pendingToken, opt.id);
  };

  if (!configured) {
    return (
      <div className="rounded-lg border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground mb-1">Conexão automática indisponível</p>
        <p className="leading-relaxed">
          O administrador precisa configurar <code className="text-foreground">VITE_META_APP_ID</code> e
          {" "}<code className="text-foreground">VITE_META_ADS_CONFIG_ID</code>. Use o cadastro manual abaixo.
        </p>
      </div>
    );
  }

  if (phase === "success" && info) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/5 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <p className="text-sm font-bold text-success">Meta Ads conectado!</p>
        </div>
        <div className="text-xs space-y-0.5 text-foreground/80 pl-7">
          <p><strong>Conta:</strong> {info.ad_account_name} ({info.ad_account_id})</p>
          <p><strong>Moeda:</strong> {info.currency}</p>
          {info.business_name && <p><strong>Business:</strong> {info.business_name}</p>}
        </div>
      </div>
    );
  }

  if (phase === "choose_account" && accountOptions.length > 0) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Você tem acesso a várias contas de anúncio. Escolha qual conectar:
        </p>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {accountOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handlePickAccount(opt)}
              disabled={loading}
              className="w-full text-left rounded-lg border border-border bg-card p-3 hover:bg-secondary/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <p className="text-sm font-bold">{opt.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {opt.id} · {opt.currency}{opt.business ? ` · ${opt.business}` : ""}
              </p>
            </button>
          ))}
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
        {phase === "idle" && <><Facebook className="h-4 w-4" /> <Target className="h-4 w-4" /> Conectar Meta Ads via Facebook</>}
      </Button>
      <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
        Você será redirecionado pra Meta. Escolha qual conta de anúncio conectar.
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
