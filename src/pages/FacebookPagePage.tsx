import { AppLayout } from "@/components/layout/AppLayout";
import {
  CheckCircle2, XCircle, Loader2, ArrowLeft, Facebook, Wifi, WifiOff, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useFacebookPageIntegration } from "@/hooks/useFacebookPageIntegration";
import { FacebookPageEmbeddedSignup } from "@/components/facebook-page/FacebookPageEmbeddedSignup";

const META_EMBEDDED_AVAILABLE = !!(
  import.meta.env.VITE_META_APP_ID && import.meta.env.VITE_META_FB_PAGE_CONFIG_ID
);

export default function FacebookPagePage() {
  const navigate = useNavigate();
  const api = useFacebookPageIntegration();

  const connectedPages = api.pages.filter((p) => p.status === "connected");
  const disconnectedPages = api.pages.filter((p) => p.status !== "connected");

  const anyConnected = connectedPages.length > 0;

  return (
    <AppLayout
      title="Facebook Messenger"
      subtitle="Conecte páginas do Facebook para receber DMs no Inbox"
      actions={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs gap-1"
            onClick={() => navigate("/integrations")}
          >
            <ArrowLeft className="h-3 w-3" /> Voltar
          </Button>
        </div>
      }
    >
      <div className="p-6 animate-fade-in space-y-6">
        {/* Summary */}
        <div className="flex items-center gap-3 flex-wrap">
          <Badge
            variant="outline"
            className={`text-[10px] gap-1 ${
              anyConnected
                ? "border-success/40 text-success"
                : "border-muted-foreground/40 text-muted-foreground"
            }`}
          >
            {anyConnected ? (
              <><Wifi className="h-3 w-3" /> {connectedPages.length} página(s) conectada(s)</>
            ) : (
              <><WifiOff className="h-3 w-3" /> Nenhuma página conectada</>
            )}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-6 max-w-2xl">
          {/* Card primário — Embedded Signup */}
          {META_EMBEDDED_AVAILABLE && (
            <div className="bg-card ghost-border rounded-xl shadow-card overflow-hidden">
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-[#1877F2] flex items-center justify-center">
                      <Facebook className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        {anyConnected ? "Conectar mais páginas" : "Conexão em 1 clique"}
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Via Facebook Login for Business
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[9px] border-success/40 text-success"
                  >
                    Recomendado
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Use sua conta Facebook para escolher quais páginas conectar.
                  O webhook do Messenger é configurado automaticamente — você não
                  precisa entrar no painel da Meta.
                </p>

                <FacebookPageEmbeddedSignup
                  onConnected={() => {
                    void api.fetchPages();
                  }}
                />
              </div>
            </div>
          )}

          {/* Card — lista de páginas conectadas */}
          {connectedPages.length > 0 && (
            <div className="bg-card ghost-border rounded-xl shadow-card overflow-hidden">
              <div className="p-6 space-y-4">
                <h3 className="text-sm font-bold text-foreground">
                  Páginas conectadas ({connectedPages.length})
                </h3>
                <div className="space-y-2">
                  {connectedPages.map((page) => (
                    <div
                      key={page.id}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                    >
                      <div className="h-9 w-9 rounded-lg bg-[#1877F2]/10 flex items-center justify-center shrink-0">
                        <Facebook className="h-5 w-5 text-[#1877F2]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{page.page_name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          ID: {page.page_id}
                          {page.page_category ? ` · ${page.page_category}` : ""}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[9px] border-success/40 text-success gap-1"
                      >
                        <CheckCircle2 className="h-2.5 w-2.5" /> Conectada
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => api.disconnect(page.id)}
                        disabled={api.loading}
                        title="Desconectar"
                      >
                        {api.loading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Páginas desconectadas (histórico) */}
          {disconnectedPages.length > 0 && (
            <div className="bg-card ghost-border rounded-xl shadow-card overflow-hidden opacity-60">
              <div className="p-6 space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Histórico — desconectadas ({disconnectedPages.length})
                </h3>
                <div className="space-y-1.5">
                  {disconnectedPages.map((page) => (
                    <div
                      key={page.id}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <XCircle className="h-3 w-3" />
                      <span className="truncate">{page.page_name}</span>
                      <span className="text-[10px]">({page.page_id})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
