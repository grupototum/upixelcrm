import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Customer {
  id: string;
  name: string;
  currency: string;
  manager: boolean;
  test_account?: boolean;
}

interface Props {
  /** Indica se o usuário já fez OAuth Google com scope adwords */
  googleOAuthConnected: boolean;
  onConnected?: () => void;
  /** Caminho pra reconectar Google OAuth com scope adwords (incluindo `?adwords=1`) */
  onReconnectGoogle?: () => void;
}

export function GoogleAdsAutoConnect({ googleOAuthConnected, onConnected, onReconnectGoogle }: Props) {
  const [phase, setPhase] = useState<"idle" | "loading" | "choose" | "saving" | "success">("idle");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [needsDevToken, setNeedsDevToken] = useState(false);
  const [manualDevToken, setManualDevToken] = useState("");

  const fetchCustomers = useCallback(async (devToken?: string) => {
    setPhase("loading");
    setError(null);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke(
        "google-ads?action=list-customers",
        { body: devToken ? { developer_token: devToken } : {} },
      );
      if (invokeErr) throw new Error(invokeErr.message);
      if (data?.code === "NO_GOOGLE_OAUTH") {
        setError("Conecte o Google OAuth com permissão Google Ads primeiro.");
        setPhase("idle");
        return;
      }
      if (data?.code === "NO_DEVELOPER_TOKEN") {
        setNeedsDevToken(true);
        setError("Developer Token do Google Ads não configurado pelo admin do uPixel. Informe o seu manualmente.");
        setPhase("idle");
        return;
      }
      if (data?.error) {
        setError(data.error);
        setPhase("idle");
        return;
      }
      const list = (data?.customers ?? []) as Customer[];
      if (list.length === 0) {
        setError("Nenhuma conta Google Ads vinculada. Crie/vincule uma em ads.google.com.");
        setPhase("idle");
        return;
      }
      setCustomers(list);
      setPhase("choose");
    } catch (err: any) {
      setError(err?.message ?? "Erro inesperado");
      setPhase("idle");
    }
  }, []);

  const handleConnect = (cust: Customer) => {
    setPhase("saving");
    void (async () => {
      try {
        const { data, error: invokeErr } = await supabase.functions.invoke(
          "google-ads?action=save-credentials",
          {
            body: {
              customer_id: cust.id,
              ...(manualDevToken ? { developer_token: manualDevToken } : {}),
            },
          },
        );
        if (invokeErr) throw new Error(invokeErr.message);
        if (data?.error) throw new Error(data.error);
        setPhase("success");
        toast.success(`Conta ${cust.name || cust.id} conectada!`);
        onConnected?.();
      } catch (err: any) {
        setError(err?.message ?? "Erro ao salvar credenciais");
        setPhase("choose");
      }
    })();
  };

  if (!googleOAuthConnected) {
    return (
      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-foreground">Google OAuth necessário</p>
            <p className="text-muted-foreground">
              Pra listar suas contas Google Ads automaticamente, você precisa autorizar o uPixel com a permissão{" "}
              <code className="text-foreground">adwords</code> no Google.
            </p>
          </div>
        </div>
        {onReconnectGoogle && (
          <Button size="sm" onClick={onReconnectGoogle} className="text-xs gap-1.5 w-full">
            <Sparkles className="h-3.5 w-3.5" /> Conectar Google com permissão Ads
          </Button>
        )}
      </div>
    );
  }

  if (phase === "success") {
    return (
      <div className="rounded-lg border border-success/30 bg-success/5 p-4 flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-success" />
        <p className="text-sm font-bold text-success">Conta Google Ads conectada!</p>
      </div>
    );
  }

  if (phase === "idle" && needsDevToken) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 text-xs">
          <p className="font-semibold text-foreground mb-1">Developer Token necessário</p>
          <p className="text-muted-foreground">
            O admin do uPixel ainda não configurou um Developer Token compartilhado. Por enquanto, informe o seu — pegue em{" "}
            <a href="https://ads.google.com/aw/apicenter" target="_blank" rel="noreferrer" className="text-primary underline">
              ads.google.com/aw/apicenter
            </a>.
          </p>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold">Developer Token</label>
          <input
            type="password"
            value={manualDevToken}
            onChange={(e) => setManualDevToken(e.target.value)}
            placeholder="abc1XyZ..."
            className="w-full h-9 px-3 text-xs rounded-md border border-border bg-secondary/30"
          />
        </div>
        <Button
          size="sm"
          onClick={() => fetchCustomers(manualDevToken)}
          disabled={!manualDevToken.trim()}
          className="text-xs gap-1.5 w-full"
        >
          Continuar
        </Button>
      </div>
    );
  }

  if (phase === "choose") {
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Selecione qual conta Google Ads conectar ao uPixel:
        </p>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {customers.map((c) => (
            <button
              key={c.id}
              onClick={() => handleConnect(c)}
              disabled={c.manager}
              title={c.manager ? "Manager Accounts (MCC) não podem ser usadas diretamente — escolha uma conta cliente" : ""}
              className="w-full text-left rounded-lg border border-border bg-card p-3 hover:bg-secondary/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <p className="text-sm font-bold">{c.name || `Conta ${c.id}`}</p>
              <p className="text-[11px] text-muted-foreground">
                ID: {c.id}{c.currency ? ` · ${c.currency}` : ""}
                {c.manager && " · MCC (manager)"}
                {c.test_account && " · Teste"}
              </p>
            </button>
          ))}
        </div>
        {error && (
          <div className="flex items-start gap-2 bg-destructive/5 border border-destructive/30 rounded-lg p-3">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button onClick={() => fetchCustomers()} disabled={phase === "loading" || phase === "saving"} className="w-full gap-2">
        {phase === "loading" && <><Loader2 className="h-4 w-4 animate-spin" /> Listando contas…</>}
        {phase === "saving" && <><Loader2 className="h-4 w-4 animate-spin" /> Conectando…</>}
        {phase === "idle" && <><Sparkles className="h-4 w-4" /> Listar contas Google Ads</>}
      </Button>
      {error && (
        <div className="flex items-start gap-2 bg-destructive/5 border border-destructive/30 rounded-lg p-3">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}
