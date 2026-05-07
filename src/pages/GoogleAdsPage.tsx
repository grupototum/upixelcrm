import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGoogleAds } from "@/hooks/useGoogleAds";
import {
  ArrowLeft, CheckCircle2, XCircle, RefreshCw, Unplug,
  TrendingUp, MousePointerClick, DollarSign, Users, Info,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function GoogleAdsPage() {
  const navigate = useNavigate();
  const { isConnected, status, campaigns, loadingCampaigns, connecting, syncing, connect, disconnect, sync } = useGoogleAds();

  const [developerToken, setDeveloperToken] = useState("");
  const [customerId, setCustomerId] = useState("");

  const handleConnect = async () => {
    if (!developerToken.trim() || !customerId.trim()) {
      toast.error("Preencha o Developer Token e o Customer ID");
      return;
    }
    const ok = await connect({ developer_token: developerToken.trim(), customer_id: customerId.trim() });
    if (ok) {
      setDeveloperToken("");
      setCustomerId("");
      await sync();
    }
  };

  const totalSpend = campaigns.reduce((s, c) => s + (c.spend ?? 0), 0);
  const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions ?? 0), 0);
  const totalClicks = campaigns.reduce((s, c) => s + (c.clicks ?? 0), 0);
  const totalConversions = campaigns.reduce((s, c) => s + (c.conversions ?? 0), 0);

  const googleOAuthConnected = (status as any)?.google_oauth_connected;

  return (
    <AppLayout
      title="Google Ads"
      subtitle="Integração com campanhas do Google"
      actions={
        <Button variant="ghost" size="sm" className="text-xs gap-1.5" onClick={() => navigate("/integrations")}>
          <ArrowLeft className="h-3.5 w-3.5" /> Integrações
        </Button>
      }
    >
      <div className="p-6 max-w-4xl space-y-6 animate-fade-in">

        {/* OAuth prereq warning */}
        {!googleOAuthConnected && !isConnected && (
          <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
            <Info className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
              <p className="font-semibold">Google OAuth necessário</p>
              <p>Conecte sua conta Google primeiro em <b>Integrações → Google</b> para que o Google Ads possa usar o token OAuth.</p>
              <Button variant="outline" size="sm" className="text-xs h-7 mt-2" onClick={() => navigate("/google")}>
                Conectar Google <ArrowLeft className="h-3 w-3 rotate-180 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Status banner */}
        <div className={`flex items-center justify-between p-4 rounded-xl border ${isConnected ? "border-success/30 bg-success/5" : "border-border bg-card"}`}>
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${isConnected ? "bg-success/15" : "bg-muted"}`}>
              {isConnected ? <CheckCircle2 className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-muted-foreground" />}
            </div>
            <div>
              <p className="text-sm font-semibold">{isConnected ? "Conectado ao Google Ads" : "Google Ads não conectado"}</p>
              <p className="text-xs text-muted-foreground">
                {isConnected
                  ? `Customer: ${(status as any)?.customerId ?? "—"} · Sync: ${campaigns[0]?.synced_at ? format(new Date(campaigns[0].synced_at), "dd/MM HH:mm", { locale: ptBR }) : "—"}`
                  : "Configure suas credenciais da Google Ads API abaixo"}
              </p>
            </div>
          </div>
          {isConnected && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8" onClick={() => sync()} disabled={syncing}>
                <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Sincronizando..." : "Sincronizar"}
              </Button>
              <Button variant="ghost" size="sm" className="text-xs gap-1.5 h-8 text-destructive hover:bg-destructive/10" onClick={disconnect}>
                <Unplug className="h-3 w-3" /> Desconectar
              </Button>
            </div>
          )}
        </div>

        {/* KPI cards */}
        {isConnected && campaigns.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Investimento", value: `R$ ${totalSpend.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "text-primary" },
              { label: "Impressões", value: totalImpressions.toLocaleString("pt-BR"), icon: TrendingUp, color: "text-blue-500" },
              { label: "Cliques", value: totalClicks.toLocaleString("pt-BR"), icon: MousePointerClick, color: "text-accent" },
              { label: "Conversões", value: totalConversions.toLocaleString("pt-BR"), icon: Users, color: "text-success" },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-card border border-[hsl(var(--border-strong))] rounded-xl p-4">
                <kpi.icon className={`h-4 w-4 ${kpi.color} mb-2`} />
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">{kpi.label}</p>
                <p className="text-xl font-heading font-black text-foreground mt-0.5">{kpi.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Connection form */}
        {!isConnected && (
          <div className="bg-card border border-[hsl(var(--border-strong))] rounded-xl p-5 space-y-5">
            <div className="flex items-start gap-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <p className="font-semibold">Como obter as credenciais</p>
                <p>1. Acesse <span className="font-mono">console.cloud.google.com</span> → APIs → <b>Google Ads API</b> → Ativar</p>
                <p>2. Em <span className="font-mono">ads.google.com/aw/apicenter</span> → solicite o <b>Developer Token</b></p>
                <p>3. O <b>Customer ID</b> está em Conta de anúncios → Menu superior (formato: 123-456-7890)</p>
                <p>4. O Google OAuth já deve estar conectado em Integrações → Google</p>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Developer Token</Label>
                <Input
                  value={developerToken}
                  onChange={e => setDeveloperToken(e.target.value)}
                  placeholder="ABcDeFgHiJkLmNoPqRsTuVwXyZ1234"
                  className="text-xs h-9 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Customer ID (MCC ou conta principal)</Label>
                <Input
                  value={customerId}
                  onChange={e => setCustomerId(e.target.value)}
                  placeholder="1234567890"
                  className="text-xs h-9 font-mono"
                />
              </div>
            </div>

            <Button className="w-full text-xs font-bold gap-2" onClick={handleConnect} disabled={connecting || !googleOAuthConnected}>
              {connecting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {connecting ? "Conectando..." : "Conectar ao Google Ads"}
            </Button>
          </div>
        )}

        {/* Campaigns table */}
        {isConnected && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold">Campanhas ({campaigns.length})</h3>

            {loadingCampaigns ? (
              <div className="h-32 bg-card rounded-xl border border-[hsl(var(--border-strong))] animate-pulse" />
            ) : campaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 border border-dashed border-border rounded-xl text-muted-foreground text-sm gap-2">
                <TrendingUp className="h-6 w-6 opacity-30" />
                <p>Nenhuma campanha encontrada. Clique em Sincronizar.</p>
              </div>
            ) : (
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="text-left p-2.5 text-[10px] font-semibold text-muted-foreground uppercase">Campanha</th>
                      <th className="text-left p-2.5 text-[10px] font-semibold text-muted-foreground uppercase">Tipo</th>
                      <th className="text-left p-2.5 text-[10px] font-semibold text-muted-foreground uppercase">Status</th>
                      <th className="text-right p-2.5 text-[10px] font-semibold text-muted-foreground uppercase">Investido</th>
                      <th className="text-right p-2.5 text-[10px] font-semibold text-muted-foreground uppercase">Impressões</th>
                      <th className="text-right p-2.5 text-[10px] font-semibold text-muted-foreground uppercase">Cliques</th>
                      <th className="text-right p-2.5 text-[10px] font-semibold text-muted-foreground uppercase">CTR</th>
                      <th className="text-right p-2.5 text-[10px] font-semibold text-muted-foreground uppercase">CPC</th>
                      <th className="text-right p-2.5 text-[10px] font-semibold text-muted-foreground uppercase">Conversões</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c) => (
                      <tr key={c.id} className="border-t border-[hsl(var(--border-strong))] hover:bg-secondary/20">
                        <td className="p-2.5 font-medium max-w-[180px] truncate">{c.name}</td>
                        <td className="p-2.5 text-muted-foreground">{c.channel_type ?? "—"}</td>
                        <td className="p-2.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.status === "active" ? "bg-success/15 text-success" : c.status === "paused" ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"}`}>
                            {c.status === "active" ? "Ativa" : c.status === "paused" ? "Pausada" : "Encerrada"}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-mono font-semibold">R$ {(c.spend ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                        <td className="p-2.5 text-right text-muted-foreground">{(c.impressions ?? 0).toLocaleString("pt-BR")}</td>
                        <td className="p-2.5 text-right text-muted-foreground">{(c.clicks ?? 0).toLocaleString("pt-BR")}</td>
                        <td className="p-2.5 text-right text-muted-foreground">{(c.ctr ?? 0).toFixed(2)}%</td>
                        <td className="p-2.5 text-right text-muted-foreground">R$ {(c.cpc ?? 0).toFixed(2)}</td>
                        <td className="p-2.5 text-right font-semibold text-primary">{(c.conversions ?? 0).toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
