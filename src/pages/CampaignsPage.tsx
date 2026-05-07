import { useState, useMemo } from "react";
import { downloadCSV } from "@/lib/export";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ComingSoonBadge, ComingSoonOverlay } from "@/components/ui/coming-soon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Megaphone, BarChart3, Trophy, Calendar, Download,
  DollarSign, Target, Send, CheckCircle2, XCircle, Clock, RefreshCw,
  TrendingUp, Users, MousePointerClick, Link2, Settings, AlertCircle,
} from "lucide-react";
import { CampaignKPICards } from "@/components/campaigns/CampaignKPICards";
import { CampaignTable } from "@/components/campaigns/CampaignTable";
import { CampaignChart } from "@/components/campaigns/CampaignChart";
import { CampaignRanking } from "@/components/campaigns/CampaignRanking";
import type { Campaign } from "@/components/campaigns/types";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMetaAds } from "@/hooks/useMetaAds";
import { useGoogleAds } from "@/hooks/useGoogleAds";
import type { AdCampaign } from "@/hooks/useMetaAds";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function adCampaignToMock(c: AdCampaign, platform: "Meta Ads" | "Google Ads"): Campaign {
  return {
    id: c.id,
    name: c.name,
    platform,
    status: c.status === "active" ? "active" : c.status === "paused" ? "paused" : "ended",
    spend: c.spend ?? 0,
    leads: c.leads_count ?? 0,
    cpl: c.cost_per_lead ?? 0,
    cpc: c.cpc ?? 0,
    impressions: c.impressions ?? 0,
    clicks: c.clicks ?? 0,
    ctr: c.ctr ?? 0,
    conversions: c.conversions ?? 0,
    revenue: c.revenue ?? 0,
    roi: c.spend > 0 && c.revenue > 0 ? Math.round(((c.revenue - c.spend) / c.spend) * 100) : 0,
    startDate: c.date_range?.since ?? "",
  };
}

// ─── Broadcasts tab (WhatsApp dispatch logs) ──────────────────────────────────

interface DispatchLog {
  id: string;
  campaign_name: string;
  campaign_id: string | null;
  phone: string | null;
  channel: string;
  status: string;
  error: string | null;
  sent_at: string | null;
  created_at: string;
  lead_id: string | null;
}

interface CampaignSummary {
  campaign_id: string;
  campaign_name: string;
  total: number;
  sent: number;
  failed: number;
  delivered: number;
  read: number;
  latest: string;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string; icon: typeof Send }> = {
    sent: { label: "Enviado", className: "text-success border-success/30 bg-success/5", icon: Send },
    delivered: { label: "Entregue", className: "text-primary border-[hsl(var(--border-strong))] bg-primary/5", icon: CheckCircle2 },
    read: { label: "Lido", className: "text-accent border-accent/30 bg-accent/5", icon: CheckCircle2 },
    failed: { label: "Falhou", className: "text-destructive border-destructive/30 bg-destructive/5", icon: XCircle },
    pending: { label: "Pendente", className: "text-muted-foreground border-border bg-secondary", icon: Clock },
  };
  const cfg = map[status] ?? map.pending;
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`text-[10px] gap-1 ${cfg.className}`}>
      <Icon className="h-2.5 w-2.5" /> {cfg.label}
    </Badge>
  );
}

function BroadcastsTab({ clientId }: { clientId?: string }) {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("__all__");

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["campaign-dispatch-logs", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await (supabase.from("campaign_dispatch_logs") as any)
        .select("*").eq("client_id", clientId)
        .order("created_at", { ascending: false }).limit(500);
      if (error) { console.error(error); return []; }
      return (data || []) as DispatchLog[];
    },
    enabled: !!clientId,
    refetchInterval: 15000,
  });

  const summaries = useMemo<CampaignSummary[]>(() => {
    const map = new Map<string, CampaignSummary>();
    for (const log of logs) {
      const key = log.campaign_id ?? log.campaign_name;
      const existing = map.get(key) ?? { campaign_id: key, campaign_name: log.campaign_name, total: 0, sent: 0, failed: 0, delivered: 0, read: 0, latest: log.created_at };
      existing.total++;
      if (log.status === "sent") existing.sent++;
      else if (log.status === "failed") existing.failed++;
      else if (log.status === "delivered") existing.delivered++;
      else if (log.status === "read") existing.read++;
      if (log.created_at > existing.latest) existing.latest = log.created_at;
      map.set(key, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.latest.localeCompare(a.latest));
  }, [logs]);

  const filteredLogs = useMemo(() =>
    selectedCampaignId === "__all__" ? logs : logs.filter((l) => (l.campaign_id ?? l.campaign_name) === selectedCampaignId),
    [logs, selectedCampaignId]
  );

  if (isLoading) return <div className="flex items-center justify-center h-40 text-muted-foreground text-xs gap-2"><RefreshCw className="h-4 w-4 animate-spin" /> Carregando...</div>;

  if (logs.length === 0) return (
    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2">
      <Send className="h-8 w-8 opacity-30" /><p>Nenhum disparo registrado ainda.</p>
      <p className="text-xs">Os disparos via WhatsApp aparecerão aqui.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {summaries.slice(0, 4).map((s) => (
          <button key={s.campaign_id} onClick={() => setSelectedCampaignId(selectedCampaignId === s.campaign_id ? "__all__" : s.campaign_id)}
            className={`text-left p-3 rounded-xl border transition-colors ${selectedCampaignId === s.campaign_id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-[hsl(var(--border-strong))]"}`}>
            <p className="text-[10px] font-semibold truncate text-muted-foreground">{s.campaign_name}</p>
            <p className="text-lg font-heading font-black text-foreground">{s.total}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[9px] text-success font-medium">{s.sent} env</span>
              {s.failed > 0 && <span className="text-[9px] text-destructive font-medium">{s.failed} falhas</span>}
            </div>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
          <SelectTrigger className="w-52 h-8 text-xs"><SelectValue placeholder="Todos os disparos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-xs">Todos os disparos</SelectItem>
            {summaries.map((s) => <SelectItem key={s.campaign_id} value={s.campaign_id} className="text-xs">{s.campaign_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()}><RefreshCw className="h-3 w-3" /></Button>
        <span className="text-xs text-muted-foreground ml-auto">{filteredLogs.length} registros</span>
      </div>
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-secondary/50">
            <tr>
              <th className="text-left p-2 text-[10px] font-semibold text-muted-foreground uppercase">Campanha</th>
              <th className="text-left p-2 text-[10px] font-semibold text-muted-foreground uppercase">Telefone</th>
              <th className="text-left p-2 text-[10px] font-semibold text-muted-foreground uppercase">Canal</th>
              <th className="text-left p-2 text-[10px] font-semibold text-muted-foreground uppercase">Status</th>
              <th className="text-left p-2 text-[10px] font-semibold text-muted-foreground uppercase">Data</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.slice(0, 100).map((log) => (
              <tr key={log.id} className="border-t border-[hsl(var(--border-strong))] hover:bg-secondary/20">
                <td className="p-2 font-medium truncate max-w-[160px]">{log.campaign_name}</td>
                <td className="p-2 text-muted-foreground font-mono">{log.phone ?? "—"}</td>
                <td className="p-2 capitalize text-muted-foreground">{log.channel}</td>
                <td className="p-2"><StatusBadge status={log.status} /></td>
                <td className="p-2 text-muted-foreground whitespace-nowrap">{log.created_at ? format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR }) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredLogs.length > 100 && <p className="text-center text-[10px] text-muted-foreground p-2 border-t border-[hsl(var(--border-strong))]">Mostrando 100 de {filteredLogs.length} registros</p>}
      </div>
    </div>
  );
}

// ─── Lead Attribution tab ──────────────────────────────────────────────────────

function AttributionTab({ clientId }: { clientId?: string }) {
  const { data: attributedLeads = [], isLoading } = useQuery({
    queryKey: ["leads-attribution", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data } = await supabase.from("leads")
        .select("id,name,phone,email,origin,utm_source,utm_medium,utm_campaign,utm_content,ad_campaign_id,fbclid,gclid,created_at")
        .eq("client_id", clientId)
        .or("utm_campaign.not.is.null,ad_campaign_id.not.is.null,fbclid.not.is.null,gclid.not.is.null")
        .order("created_at", { ascending: false })
        .limit(200) as any;
      return data ?? [];
    },
    enabled: !!clientId,
  });

  // Group by campaign
  const byCampaign = useMemo(() => {
    const map = new Map<string, { name: string; platform: string; leads: any[] }>();
    for (const lead of attributedLeads) {
      const key = lead.utm_campaign ?? lead.ad_campaign_id ?? "Desconhecida";
      const platform = lead.gclid ? "google" : lead.fbclid || lead.utm_source === "facebook" ? "meta" : lead.utm_source ?? "—";
      const existing = map.get(key) ?? { name: key, platform, leads: [] };
      existing.leads.push(lead);
      map.set(key, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.leads.length - a.leads.length);
  }, [attributedLeads]);

  if (isLoading) return <div className="flex items-center justify-center h-40 text-muted-foreground text-xs gap-2"><RefreshCw className="h-4 w-4 animate-spin" /> Carregando...</div>;

  if (attributedLeads.length === 0) return (
    <div className="flex flex-col items-center justify-center h-48 border border-dashed border-border rounded-xl text-muted-foreground text-sm gap-2">
      <Link2 className="h-8 w-8 opacity-30" />
      <p className="font-semibold">Nenhum lead com atribuição de campanha</p>
      <p className="text-xs text-center max-w-xs">Leads capturados via Meta Lead Ads, UTMs em links ou integração com Google Ads aparecerão aqui.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <div className="bg-card border border-[hsl(var(--border-strong))] rounded-xl p-4">
          <Users className="h-4 w-4 text-primary mb-2" />
          <p className="text-xs text-muted-foreground uppercase font-semibold">Leads rastreados</p>
          <p className="text-2xl font-heading font-black">{attributedLeads.length}</p>
        </div>
        <div className="bg-card border border-[hsl(var(--border-strong))] rounded-xl p-4">
          <Megaphone className="h-4 w-4 text-blue-500 mb-2" />
          <p className="text-xs text-muted-foreground uppercase font-semibold">Campanhas únicas</p>
          <p className="text-2xl font-heading font-black">{byCampaign.length}</p>
        </div>
        <div className="bg-card border border-[hsl(var(--border-strong))] rounded-xl p-4">
          <MousePointerClick className="h-4 w-4 text-success mb-2" />
          <p className="text-xs text-muted-foreground uppercase font-semibold">Via Meta Ads</p>
          <p className="text-2xl font-heading font-black">{attributedLeads.filter((l: any) => l.fbclid || l.utm_source === "facebook").length}</p>
        </div>
      </div>

      <div className="space-y-3">
        {byCampaign.map((camp) => (
          <div key={camp.name} className="bg-card border border-[hsl(var(--border-strong))] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border-strong))] bg-secondary/20">
              <div className="flex items-center gap-2.5">
                <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold ${camp.platform === "meta" ? "bg-blue-600" : camp.platform === "google" ? "bg-orange-500" : "bg-muted-foreground"}`}>
                  {camp.platform === "meta" ? "M" : camp.platform === "google" ? "G" : "?"}
                </div>
                <div>
                  <p className="text-sm font-bold">{camp.name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{camp.platform}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold">{camp.leads.length} leads</Badge>
            </div>
            <div className="divide-y divide-border/30">
              {camp.leads.slice(0, 5).map((lead: any) => (
                <div key={lead.id} className="flex items-center justify-between px-4 py-2 hover:bg-secondary/20 transition-colors">
                  <div>
                    <p className="text-xs font-medium">{lead.name}</p>
                    <p className="text-[10px] text-muted-foreground">{lead.phone ?? lead.email ?? "—"}</p>
                  </div>
                  <div className="text-right">
                    {lead.utm_medium && <p className="text-[9px] text-muted-foreground">via {lead.utm_medium}</p>}
                    <p className="text-[9px] text-muted-foreground">{format(new Date(lead.created_at), "dd/MM/yy", { locale: ptBR })}</p>
                  </div>
                </div>
              ))}
              {camp.leads.length > 5 && (
                <p className="text-[10px] text-muted-foreground text-center py-2">+ {camp.leads.length - 5} outros leads</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sync banner ──────────────────────────────────────────────────────────────

function NotConnectedBanner({ platform, configRoute, navigate }: { platform: string; configRoute: string; navigate: (p: string) => void }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl mb-4">
      <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
      <p className="text-xs text-amber-700 dark:text-amber-300 flex-1">
        {platform} não conectado. Configure em Integrações para ver dados reais.
      </p>
      <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => navigate(configRoute)}>
        <Settings className="h-3 w-3" /> Conectar
      </Button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const { tenant } = useTenant();
  const { user } = useAuth();
  const clientId = tenant?.id ?? user?.client_id;

  const meta = useMetaAds();
  const google = useGoogleAds();

  // Convert real ad campaigns to the Campaign format used by existing components
  const realMetaCampaigns: Campaign[] = useMemo(() =>
    meta.campaigns.map((c) => adCampaignToMock(c, "Meta Ads")),
    [meta.campaigns]
  );

  const realGoogleCampaigns: Campaign[] = useMemo(() =>
    google.campaigns.map((c) => adCampaignToMock(c, "Google Ads")),
    [google.campaigns]
  );

  // Use real data if available, otherwise no data (we removed mocks)
  const allCampaigns: Campaign[] = useMemo(() => [
    ...realMetaCampaigns,
    ...realGoogleCampaigns,
  ], [realMetaCampaigns, realGoogleCampaigns]);

  const filtered = useMemo(() => {
    let result = allCampaigns;
    if (platformFilter === "Meta Ads") result = result.filter((c) => c.platform === "Meta Ads");
    else if (platformFilter === "Google Ads") result = result.filter((c) => c.platform === "Google Ads");
    return result;
  }, [allCampaigns, platformFilter]);

  const totals = useMemo(() => ({
    spend: filtered.reduce((s, c) => s + c.spend, 0),
    leads: filtered.reduce((s, c) => s + c.leads, 0),
    revenue: filtered.reduce((s, c) => s + c.revenue, 0),
    conversions: filtered.reduce((s, c) => s + c.conversions, 0),
  }), [filtered]);

  const avgCPL = totals.leads > 0 ? totals.spend / totals.leads : 0;
  const totalROI = totals.spend > 0 ? Math.round(((totals.revenue - totals.spend) / totals.spend) * 100) : 0;

  const noData = allCampaigns.length === 0;

  return (
    <AppLayout
      title="Campanhas"
      subtitle="Performance de mídia paga"
      actions={
        <div className="flex items-center gap-2">
          {noData && <ComingSoonBadge />}
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <Calendar className="h-3 w-3 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Todo período</SelectItem>
              <SelectItem value="7d" className="text-xs">Últimos 7 dias</SelectItem>
              <SelectItem value="30d" className="text-xs">Últimos 30 dias</SelectItem>
              <SelectItem value="90d" className="text-xs">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          {(meta.isConnected || google.isConnected) && (
            <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8"
              onClick={() => { if (meta.isConnected) meta.sync(); if (google.isConnected) google.sync(); }}
              disabled={meta.syncing || google.syncing}>
              <RefreshCw className={`h-3 w-3 ${(meta.syncing || google.syncing) ? "animate-spin" : ""}`} />
              Sincronizar
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 h-8"
            onClick={() =>
              downloadCSV(
                filtered.map((c) => ({
                  "Nome": c.name,
                  "Plataforma": c.platform,
                  "Status": c.status,
                  "Investido (R$)": c.spend.toFixed(2),
                  "Leads": c.leads,
                  "CPL (R$)": c.cpl.toFixed(2),
                  "Conversões": c.conversions,
                  "Receita (R$)": c.revenue.toFixed(2),
                  "ROI (%)": c.roi,
                })),
                `campanhas-${new Date().toISOString().slice(0, 10)}.csv`
              )
            }
          >
            <Download className="h-3 w-3" /> Exportar
          </Button>
        </div>
      }
    >
      <div className="p-6 space-y-6 animate-fade-in">
        <CampaignKPICards spend={totals.spend} leads={totals.leads} avgCPL={avgCPL} roi={totalROI} />

        <Tabs defaultValue="overview">
          <TabsList className="bg-secondary">
            <TabsTrigger value="overview" className="text-xs gap-1.5"><BarChart3 className="h-3 w-3" /> Visão Geral</TabsTrigger>
            <TabsTrigger value="meta" className="text-xs gap-1.5"><Megaphone className="h-3 w-3" /> Meta Ads</TabsTrigger>
            <TabsTrigger value="google" className="text-xs gap-1.5"><Target className="h-3 w-3" /> Google Ads</TabsTrigger>
            <TabsTrigger value="attribution" className="text-xs gap-1.5"><Link2 className="h-3 w-3" /> Atribuição</TabsTrigger>
            <TabsTrigger value="roi" className="text-xs gap-1.5"><DollarSign className="h-3 w-3" /> ROI</TabsTrigger>
            <TabsTrigger value="ranking" className="text-xs gap-1.5"><Trophy className="h-3 w-3" /> Ranking</TabsTrigger>
            <TabsTrigger value="broadcasts" className="text-xs gap-1.5"><Send className="h-3 w-3" /> Disparos</TabsTrigger>
          </TabsList>

          {/* ─── Visão Geral ─── */}
          <TabsContent value="overview" className="mt-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="w-40 h-8 text-xs">
                  <Megaphone className="h-3 w-3 mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Todas plataformas</SelectItem>
                  <SelectItem value="Meta Ads" className="text-xs">Meta Ads</SelectItem>
                  <SelectItem value="Google Ads" className="text-xs">Google Ads</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {noData ? (
              <div className="flex flex-col items-center justify-center h-48 border border-dashed border-border rounded-xl text-muted-foreground text-sm gap-3">
                <TrendingUp className="h-10 w-10 opacity-20" />
                <p className="font-semibold">Nenhuma campanha importada</p>
                <p className="text-xs text-center max-w-xs">Conecte o Meta Ads ou Google Ads em Integrações para ver seus dados de campanha reais.</p>
                <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => navigate("/integrations")}>
                  <Settings className="h-3.5 w-3.5" /> Ir para Integrações
                </Button>
              </div>
            ) : (
              <>
                <CampaignChart campaigns={filtered} dataKey="leads" title="Leads por Campanha" />
                <CampaignTable campaigns={filtered} />
              </>
            )}
          </TabsContent>

          {/* ─── Meta Ads ─── */}
          <TabsContent value="meta" className="mt-5 space-y-4">
            {!meta.isConnected && <NotConnectedBanner platform="Meta Ads" configRoute="/meta-ads" navigate={navigate} />}
            {realMetaCampaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-36 border border-dashed border-border rounded-xl text-muted-foreground text-sm gap-2">
                <Megaphone className="h-8 w-8 opacity-20" />
                <p>{meta.isConnected ? "Nenhuma campanha. Clique em Sincronizar." : "Conecte o Meta Ads para ver dados reais."}</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{realMetaCampaigns.length} campanhas · Sync: {meta.campaigns[0]?.synced_at ? format(new Date(meta.campaigns[0].synced_at), "dd/MM HH:mm", { locale: ptBR }) : "—"}</p>
                  <Button variant="ghost" size="sm" className="text-xs gap-1.5 h-7" onClick={() => meta.sync()} disabled={meta.syncing}>
                    <RefreshCw className={`h-3 w-3 ${meta.syncing ? "animate-spin" : ""}`} /> Sincronizar
                  </Button>
                </div>
                <CampaignChart campaigns={realMetaCampaigns} dataKey="leads" title="Meta Ads — Leads por Campanha" />
                <CampaignTable campaigns={realMetaCampaigns} columns={{ impressions: true, clicks: true, ctr: true, cpc: true }} />
              </>
            )}
          </TabsContent>

          {/* ─── Google Ads ─── */}
          <TabsContent value="google" className="mt-5 space-y-4">
            {!google.isConnected && <NotConnectedBanner platform="Google Ads" configRoute="/google-ads" navigate={navigate} />}
            {realGoogleCampaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-36 border border-dashed border-border rounded-xl text-muted-foreground text-sm gap-2">
                <Target className="h-8 w-8 opacity-20" />
                <p>{google.isConnected ? "Nenhuma campanha. Clique em Sincronizar." : "Conecte o Google Ads para ver dados reais."}</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{realGoogleCampaigns.length} campanhas · Sync: {google.campaigns[0]?.synced_at ? format(new Date(google.campaigns[0].synced_at), "dd/MM HH:mm", { locale: ptBR }) : "—"}</p>
                  <Button variant="ghost" size="sm" className="text-xs gap-1.5 h-7" onClick={() => google.sync()} disabled={google.syncing}>
                    <RefreshCw className={`h-3 w-3 ${google.syncing ? "animate-spin" : ""}`} /> Sincronizar
                  </Button>
                </div>
                <CampaignChart campaigns={realGoogleCampaigns} dataKey="clicks" title="Google Ads — Cliques por Campanha" />
                <CampaignTable campaigns={realGoogleCampaigns} columns={{ impressions: true, clicks: true, ctr: true, cpc: true }} />
              </>
            )}
          </TabsContent>

          {/* ─── Atribuição de Leads ─── */}
          <TabsContent value="attribution" className="mt-5">
            <AttributionTab clientId={clientId} />
          </TabsContent>

          {/* ─── ROI ─── */}
          <TabsContent value="roi" className="mt-5 space-y-4">
            <CampaignChart campaigns={filtered} dataKey="revenue" title="Receita por Campanha" />
            <ComingSoonOverlay label="ROI detalhado em breve">
              <div className="bg-card ghost-border rounded-xl p-8">
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">ROAS Geral</p><p className="text-2xl font-bold text-foreground">{totalROI > 0 ? `${(totalROI / 100).toFixed(1)}x` : "—"}</p></div>
                  <div><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Custo por Conversão</p><p className="text-2xl font-bold text-foreground">{totals.conversions > 0 ? `R$ ${(totals.spend / totals.conversions).toFixed(2)}` : "—"}</p></div>
                  <div><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Leads Capturados</p><p className="text-2xl font-bold text-foreground">{totals.leads.toLocaleString("pt-BR")}</p></div>
                </div>
              </div>
            </ComingSoonOverlay>
          </TabsContent>

          {/* ─── Ranking ─── */}
          <TabsContent value="ranking" className="mt-5">
            {filtered.length > 0 ? <CampaignRanking campaigns={filtered} sortBy="roi" /> : (
              <div className="flex flex-col items-center justify-center h-36 border border-dashed border-border rounded-xl text-muted-foreground text-sm gap-2">
                <Trophy className="h-8 w-8 opacity-20" /><p>Nenhuma campanha para rankear.</p>
              </div>
            )}
          </TabsContent>

          {/* ─── Disparos WhatsApp ─── */}
          <TabsContent value="broadcasts" className="mt-5">
            <BroadcastsTab clientId={clientId} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
