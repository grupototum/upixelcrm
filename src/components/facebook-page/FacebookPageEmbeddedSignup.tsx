import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Facebook, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ensureFbSdkLoaded, type FBLoginResponse } from "@/lib/facebook-sdk";

const META_APP_ID = import.meta.env.VITE_META_APP_ID as string | undefined;
const META_FB_PAGE_CONFIG_ID = import.meta.env.VITE_META_FB_PAGE_CONFIG_ID as string | undefined;

const REQUIRED_SCOPES =
  "pages_messaging,pages_manage_metadata,pages_show_list,pages_read_engagement";

interface PageOption {
  id: string;
  name: string;
  category?: string | null;
}

interface SavedIntegration {
  integration_id: string;
  page_id: string;
  page_name: string;
  subscribed: boolean;
  subscribe_error?: string;
}

type Phase =
  | "idle"
  | "loading_sdk"
  | "popup"
  | "listing"
  | "choose_pages"
  | "saving"
  | "success";

interface Props {
  onConnected?: () => void;
}

export function FacebookPageEmbeddedSignup({ onConnected }: Props) {
  const configured = !!(META_APP_ID && META_FB_PAGE_CONFIG_ID);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [pageOptions, setPageOptions] = useState<PageOption[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [savedIntegrations, setSavedIntegrations] = useState<SavedIntegration[]>([]);

  const callList = useCallback(async (code: string) => {
    setPhase("listing");
    const { data, error: invokeError } = await supabase.functions.invoke(
      "facebook-page-embedded-signup?action=list",
      { body: { code } },
    );
    if (invokeError) throw new Error(invokeError.message);
    if (data?.error) throw new Error(data.error);
    return (data?.pages ?? []) as PageOption[];
  }, []);

  const callFinish = useCallback(async (code: string, pageIds: string[]) => {
    setPhase("saving");
    const { data, error: invokeError } = await supabase.functions.invoke(
      "facebook-page-embedded-signup?action=finish",
      { body: { code, selected_page_ids: pageIds } },
    );
    if (invokeError) throw new Error(invokeError.message);
    if (data?.error) throw new Error(data.error);
    return (data?.integrations ?? []) as SavedIntegration[];
  }, []);

  const handleLaunch = useCallback(async () => {
    if (!configured || !META_APP_ID || !META_FB_PAGE_CONFIG_ID) {
      toast.error("Embedded Signup do Facebook Page não configurado.");
      return;
    }
    setError(null);
    setPendingCode(null);
    setPageOptions([]);
    setSelected(new Set());
    setSavedIntegrations([]);
    setLoading(true);
    setPhase("loading_sdk");

    try {
      await ensureFbSdkLoaded(META_APP_ID);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "erro";
      setError(`Falha ao carregar Facebook SDK: ${msg}`);
      setPhase("idle");
      setLoading(false);
      return;
    }

    setPhase("popup");

    window.FB!.login(
      async (response: FBLoginResponse) => {
        const code = response.authResponse?.code;
        if (!code) {
          setPhase("idle");
          setLoading(false);
          if (response.status !== "unknown") {
            setError("Conexão cancelada antes de finalizar.");
          }
          return;
        }
        try {
          const pages = await callList(code);
          if (pages.length === 0) {
            setError("Nenhuma página Facebook encontrada nesta conta.");
            setPhase("idle");
            setLoading(false);
            return;
          }
          setPendingCode(code);
          setPageOptions(pages);
          // Default: select all
          setSelected(new Set(pages.map((p) => p.id)));
          setPhase("choose_pages");
          setLoading(false);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Falha ao listar páginas.";
          setError(msg);
          setPhase("idle");
          setLoading(false);
        }
      },
      {
        config_id: META_FB_PAGE_CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        scope: REQUIRED_SCOPES,
      },
    );
  }, [configured, callList]);

  const handleConfirm = useCallback(async () => {
    if (!pendingCode) return;
    if (selected.size === 0) {
      toast.error("Selecione ao menos uma página.");
      return;
    }
    setLoading(true);
    try {
      const integrations = await callFinish(pendingCode, Array.from(selected));
      setSavedIntegrations(integrations);
      setPhase("success");
      toast.success(`${integrations.length} página(s) conectada(s)!`);
      onConnected?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao salvar páginas.";
      setError(msg);
      setPhase("choose_pages");
    } finally {
      setLoading(false);
    }
  }, [pendingCode, selected, callFinish, onConnected]);

  const toggleSelected = (pageId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      return next;
    });
  };

  if (!configured) {
    return (
      <div className="rounded-lg border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground mb-1">Conexão automática indisponível</p>
        <p className="leading-relaxed">
          O administrador do uPixel precisa configurar{" "}
          <code className="text-foreground">VITE_META_APP_ID</code> e{" "}
          <code className="text-foreground">VITE_META_FB_PAGE_CONFIG_ID</code>.
        </p>
      </div>
    );
  }

  if (phase === "success" && savedIntegrations.length > 0) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <p className="text-sm font-bold text-success">
            {savedIntegrations.length} página(s) conectada(s)!
          </p>
        </div>
        <ul className="text-xs space-y-1 text-foreground/80">
          {savedIntegrations.map((s) => (
            <li key={s.integration_id} className="flex items-center gap-2">
              <Facebook className="h-3 w-3 text-[#1877F2]" />
              <span className="font-medium">{s.page_name}</span>
              <span className="text-muted-foreground">·</span>
              <span className={s.subscribed ? "text-success" : "text-warning"}>
                {s.subscribed ? "Webhook ✅" : `Webhook ⚠️ ${s.subscribe_error ?? "subscrever manualmente"}`}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (phase === "choose_pages" && pageOptions.length > 0) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          {pageOptions.length === 1
            ? "Confirme a página que deseja conectar:"
            : `Selecione as páginas que deseja conectar (${selected.size}/${pageOptions.length}):`}
        </p>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {pageOptions.map((opt) => (
            <label
              key={opt.id}
              className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                selected.has(opt.id)
                  ? "border-[#1877F2] bg-[#1877F2]/5"
                  : "border-border bg-card hover:bg-secondary/40"
              }`}
            >
              <Checkbox
                checked={selected.has(opt.id)}
                onCheckedChange={() => toggleSelected(opt.id)}
                disabled={loading}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{opt.name}</p>
                {opt.category && (
                  <p className="text-[10px] text-muted-foreground truncate">{opt.category}</p>
                )}
              </div>
            </label>
          ))}
        </div>
        {error && (
          <div className="flex items-start gap-2 bg-destructive/5 border border-destructive/30 rounded-lg p-3">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => {
              setPhase("idle");
              setPageOptions([]);
              setPendingCode(null);
              setSelected(new Set());
            }}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            className="text-xs bg-[#1877F2] hover:bg-[#1565d8] text-white"
            onClick={handleConfirm}
            disabled={loading || selected.size === 0}
          >
            {loading ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Conectando…</>
            ) : (
              `Conectar ${selected.size} ${selected.size === 1 ? "página" : "páginas"}`
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleLaunch}
        disabled={loading}
        className="w-full bg-[#1877F2] hover:bg-[#1565d8] text-white gap-2 h-11 text-sm font-semibold"
      >
        {phase === "loading_sdk" && <><Loader2 className="h-4 w-4 animate-spin" /> Carregando Facebook…</>}
        {phase === "popup" && <><Loader2 className="h-4 w-4 animate-spin" /> Aguardando autorização…</>}
        {phase === "listing" && <><Loader2 className="h-4 w-4 animate-spin" /> Buscando suas páginas…</>}
        {phase === "saving" && <><Loader2 className="h-4 w-4 animate-spin" /> Conectando ao uPixel…</>}
        {phase === "idle" && <><Facebook className="h-4 w-4" /> Conectar Facebook Page</>}
      </Button>
      <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
        Você precisa ser <strong>administrador</strong> das páginas que vai conectar.
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
