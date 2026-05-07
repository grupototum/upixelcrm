import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useMetaAds } from "@/hooks/useMetaAds";
import {
  ArrowLeft, CheckCircle2, XCircle, RefreshCw, Unplug,
  TrendingUp, MousePointerClick, DollarSign, Users, Eye,
  ExternalLink, Copy, Info,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function MetaAdsPage() {
  const navigate = useNavigate();
  const { isConnected, status, campaigns, loadingCampaigns, connecting, syncing, connect, disconnect, sync } = useMetaAds();

  const [accessToken, setAccessToken] = useState("");
  const [adAccountId, setAdAccountId] = useState("");

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-leads-webhook`;

  const handleConnect = async () => {
    if (!accessToken.trim() || !adAccountId.trim()) {
      toast.error("Preencha o Access Token e o Ad Account ID");
      return;
    }
    const ok = await connect({ access_token: accessToken.trim(), ad_account_id: adAccountId.trim() });
    if (ok) {
      setAccessToken("");
      setAdAccountId("");
      await sync();
    }
  };

  const totalSpend = campaigns.reduce((s, c) => s + (c.spend ?? 0), 0);
  const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions ?? 0), 0);
  const totalClicks = campaigns.reduce((s, c) => s + (c.clicks ?? 0), 0);
  const totalLeads = campaigns.reduce((s, c) => s + (c.leads_count ?? 0), 0);
  const avgCPL = totalLeads > 0 ? totalSpend / totalLeads : 0;

  const statusColor = isConnected ? "bg-success/15 text-success border-success/30" : "bg-muted text-muted-foreground border-border";

  return (
    <AppLayout
      title="Meta Ads"
      subtitle="Integração com Facebook e Instagram Ads"
      actions={
        <Button variant="ghost" size="sm" className="text-xs gap-1.5" onClick={() => navigate("/integrations")}>
          <ArrowLeft className="h-3.5 w-3.5" /> Integrações
        </Button>
      }
    >
      <div className="p-6 max-w-4xl space-y-6 animate-fade-in">

        {/* Status banner */}
        <div className={`flex items-center justify-between p-4 rounded-xl border ${isConnected ? "border-success/30 bg-success/5" : "border-border bg-card"}`}>
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${isConnected ? "bg-success/15" : "bg-muted"}`}>
              {isConnected ? <CheckCircle2 className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-muted-foreground" />}
            </div>
            <div>
              <p className="text-sm font-semibold">{isConnected ? "Conectado ao Meta Ads" : "Meta Ads não conectado"}</p>
              <p className="text-xs text-muted-foreground">
                {isConnected
                  ? `Conta: ${(status as any)?.adAccountId ?? "—"} · Última sync: ${campaigns[0]?.synced_at ? format(new Date(campaigns[0].synced_at), "dd/MM HH:mm", { locale: ptBR }) : "—"}`
                  : "Configure suas credenciais do Meta Business Manager abaixo"}
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

        {/* KPI cards (only when connected and has data) */}
        {isConnected && campaigns.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Investimento", value: `R$ ${totalSpend.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "text-primary" },
              { label: "Impressões", value: totalImpressions.toLocaleString("pt-BR"), icon: Eye, color: "text-blue-500" },
              { label: "Cliques", value: totalClicks.toLocaleString("pt-BR"), icon: MousePointerClick, color: "text-accent" },
              { label: "CPL Médio", value: avgCPL > 0 ? `R$ ${avgCPL.toFixed(2)}` : "—", icon: Users, color: "text-success" },
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
                <p className="font-semibold">Como obter o Access Token</p>
                <p>1. Acesse <span className="font-mono">business.facebook.com</span> → Configurações do negócio → Usuários do Sistema</p>
                <p>2. Crie um Usuário do Sistema com permissão de <b>Administrador</b> na conta de anúncios</p>
                <p>3. Gere um token com as permissões: <code>ads_read</code>, <code>leads_retrieval</code>, <code>pages_read_engagement</code></p>
                <p>4. O Ad Account ID está em <span className="font-mono">facebook.com/adsmanager</span> → formato act_XXXXXXXX</p>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Access Token (System User)</Label>
                <Input
                  value={accessToken}
                  onChange={e => setAccessToken(e.target.value)}
                  placeholder="EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="text-xs h-9 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Ad Account ID</Label>
                <Input
                  value={adAccountId}
                  onChange={e => setAdAccountId(e.target.value)}
                  placeholder="act_123456789"
                  className="text-xs h-9 font-mono"
                />
              </div>
            </div>

            <Button className="w-full text-xs font-bold gap-2" onClick={handleConnect} disabled={connecting}>
              {connecting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {connecting ? "Conectando..." : "Conectar ao Meta Ads"}
            </Button>
          </div>
        )}

        {/* Webhook setup for Meta Lead Ads */}
        {isConnected && (
          <div className="bg-card border border-[hsl(var(--border-strong))] rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Meta Lead Ads (Captura Automática)
            </h3>
            <p className="text-xs text-muted-foreground">
              Configure este webhook no Meta Business Manager para capturar leads de formulários automaticamente no CRM com rastreio de campanha.
            </p>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">URL do Webhook</Label>
              <div className="flex items-center gap-2">
                <Input value={webhookUrl} readOnly className="text-xs h-8 font-mono bg-secondary/30" />
                <Button variant="outline" size="icon" className="h-8 w-8 shrink-0"
                  onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success("URL copiada!"); }}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Em Meta Business → Configurações → Webhooks → Página → Assinar evento <b>leadgen</b>
              </p>
            </div>
          </div>
        )}

        {/* Campaigns table */}
        {isConnected && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Campanhas ({campaigns.length})</h3>
              <Badge variant="outline" className="text-[10px]">
                {campaigns[0]?.date_range?.since ?? "—"} → {campaigns[0]?.date_range?.until ?? "—"}
              </Badge>
            </div>

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
                      <th className="text-left p-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Campanha</th>
                      <th className="text-left p-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="text-right p-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Investido</th>
                      <th className="text-right p-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Impressões</th>
                      <th className="text-right p-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Cliques</th>
                      <th className="text-right p-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">CTR</th>
                      <th className="text-right p-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">CPC</th>
                      <th className="text-right p-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Leads</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c) => (
                      <tr key={c.id} className="border-t border-[hsl(var(--border-strong))] hover:bg-secondary/20 transition-colors">
                        <td className="p-2.5 font-medium max-w-[200px] truncate">{c.name}</td>
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
                        <td className="p-2.5 text-right font-semibold text-primary">{(c.leads_count ?? 0).toLocaleString("pt-BR")}</td>
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
