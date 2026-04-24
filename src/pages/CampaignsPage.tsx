import { useState, useMemo } from "react";
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

const mockCampaigns: Campaign[] = [
  { id: "c1", name: "Black Friday 2024", platform: "Meta Ads", status: "active", spend: 5200, leads: 142, cpl: 36.62, cpc: 2.18, impressions: 84500, clicks: 2385, ctr: 2.82, conversions: 28, revenue: 42000, roi: 707, startDate: "2024-11-01" },
  { id: "c2", name: "Lançamento Enterprise", platform: "Google Ads", status: "active", spend: 3800, leads: 89, cpl: 42.70, cpc: 3.45, impressions: 62000, clicks: 1101, ctr: 1.78, conversions: 15, revenue: 33750, roi: 788, startDate: "2024-10-15" },
  { id: "c3", name: "Remarketing Q1", platform: "Meta Ads", status: "paused", spend: 1200, leads: 34, cpl: 35.29, cpc: 1.95, impressions: 28000, clicks: 615, ctr: 2.20, conversions: 8, revenue: 9600, roi: 700, startDate: "2024-01-10" },
  { id: "c4", name: "Captação Leads B2B", platform: "Google Ads", status: "active", spend: 2900, leads: 67, cpl: 43.28, cpc: 4.12, impressions: 41000, clicks: 704, ctr: 1.72, conversions: 12, revenue: 21600, roi: 645, startDate: "2024-09-01" },
  { id: "c5", name: "Brand Awareness", platform: "Meta Ads", status: "ended", spend: 800, leads: 18, cpl: 44.44, cpc: 1.60, impressions: 120000, clicks: 500, ctr: 0.42, conversions: 3, revenue: 4500, roi: 462, startDate: "2024-06-01" },
];

interface DispatchLog {
  id: string;
  campaign_name: string;
  campaign_id: string | null;
  phone: string | null;
  channel: string;
  status: string;
  message_content: string | null;
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
    delivered: { label: "Entregue", className: "text-primary border-primary/30 bg-primary/5", icon: CheckCircle2 },
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

function BroadcastsTab({ clientId, tenantId }: { clientId?: string; tenantId?: string }) {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("__all__");

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["campaign-dispatch-logs", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await (supabase.from("campaign_dispatch_logs") as any)
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(500);
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
      const existing = map.get(key) ?? {
        campaign_id: key,
        campaign_name: log.campaign_name,
        total: 0, sent: 0, failed: 0, delivered: 0, read: 0,
        latest: log.created_at,
      };
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
    selectedCampaignId === "__all__"
      ? logs
      : logs.filter((l) => (l.campaign_id ?? l.campaign_name) === selectedCampaignId),
    [logs, selectedCampaignId]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-xs gap-2">
        <RefreshCw className="h-4 w-4 animate-spin" /> Carregando disparos...
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2">
        <Send className="h-8 w-8 opacity-30" />
        <p>Nenhum disparo registrado ainda.</p>
        <p className="text-xs">Os disparos realizados via WhatsApp aparecerão aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {summaries.slice(0, 4).map((s) => (
          <button
            key={s.campaign_id}
            onClick={() => setSelectedCampaignId(selectedCampaignId === s.campaign_id ? "__all__" : s.campaign_id)}
            className={`text-left p-3 rounded-xl border transition-colors ${
              selectedCampaignId === s.campaign_id
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-primary/30"
            }`}
          >
            <p className="text-[10px] font-semibold truncate text-muted-foreground">{s.campaign_name}</p>
            <p className="text-lg font-heading font-black text-foreground">{s.total}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[9px] text-success font-medium">{s.sent} env</span>
              {s.failed > 0 && <span className="text-[9px] text-destructive font-medium">{s.failed} falhas</span>}
            </div>
          </button>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
          <SelectTrigger className="w-52 h-8 text-xs">
            <SelectValue placeholder="Todos os disparos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-xs">Todos os disparos</SelectItem>
            {summaries.map((s) => (
              <SelectItem key={s.campaign_id} value={s.campaign_id} className="text-xs">{s.campaign_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()}>
          <RefreshCw className="h-3 w-3" />
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">{filteredLogs.length} registros</span>
      </div>

      {/* Log table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-secondary/50">
            <tr>
              <th className="text-left p-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Campanha</th>
              <th className="text-left p-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Telefone</th>
              <th className="text-left p-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Canal</th>
              <th className="text-left p-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="text-left p-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Data</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.slice(0, 100).map((log) => (
              <tr key={log.id} className="border-t border-border/50 hover:bg-secondary/20">
                <td className="p-2 font-medium truncate max-w-[160px]">{log.campaign_name}</td>
                <td className="p-2 text-muted-foreground font-mono">{log.phone ?? "—"}</td>
                <td className="p-2 capitalize text-muted-foreground">{log.channel}</td>
                <td className="p-2"><StatusBadge status={log.status} /></td>
                <td className="p-2 text-muted-foreground whitespace-nowrap">
                  {log.created_at
                    ? format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredLogs.length > 100 && (
          <p className="text-center text-[10px] text-muted-foreground p-2 border-t border-border/50">
            Mostrando 100 de {filteredLogs.length} registros
          </p>
        )}
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const [period, setPeriod] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const { tenant } = useTenant();
  const { user } = useAuth();
  const clientId = tenant?.id ?? user?.client_id;

  const filtered = useMemo(() => {
    if (platformFilter === "all") return mockCampaigns;
    return mockCampaigns.filter((c) => c.platform === platformFilter);
  }, [platformFilter]);

  const metaCampaigns = useMemo(() => mockCampaigns.filter((c) => c.platform === "Meta Ads"), []);
  const googleCampaigns = useMemo(() => mockCampaigns.filter((c) => c.platform === "Google Ads"), []);

  const totals = useMemo(() => ({
    spend: filtered.reduce((s, c) => s + c.spend, 0),
    leads: filtered.reduce((s, c) => s + c.leads, 0),
    revenue: filtered.reduce((s, c) => s + c.revenue, 0),
    conversions: filtered.reduce((s, c) => s + c.conversions, 0),
  }), [filtered]);

  const avgCPL = totals.leads > 0 ? totals.spend / totals.leads : 0;
  const totalROI = totals.spend > 0 ? Math.round(((totals.revenue - totals.spend) / totals.spend) * 100) : 0;

  return (
    <AppLayout
      title="Campanhas"
      subtitle="Performance de mídia paga"
      actions={
        <div className="flex items-center gap-2">
          <ComingSoonBadge />
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
          <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8">
            <Download className="h-3 w-3" /> Exportar
          </Button>
        </div>
      }
    >
      <div className="p-6 space-y-6 animate-fade-in">
        <CampaignKPICards spend={totals.spend} leads={totals.leads} avgCPL={avgCPL} roi={totalROI} />

        <Tabs defaultValue="overview">
          <TabsList className="bg-secondary">
            <TabsTrigger value="overview" className="text-xs gap-1.5">
              <BarChart3 className="h-3 w-3" /> Visão Geral
            </TabsTrigger>
            <TabsTrigger value="meta" className="text-xs gap-1.5">
              <Megaphone className="h-3 w-3" /> Meta Ads
            </TabsTrigger>
            <TabsTrigger value="google" className="text-xs gap-1.5">
              <Target className="h-3 w-3" /> Google Ads
            </TabsTrigger>
            <TabsTrigger value="roi" className="text-xs gap-1.5">
              <DollarSign className="h-3 w-3" /> ROI
            </TabsTrigger>
            <TabsTrigger value="ranking" className="text-xs gap-1.5">
              <Trophy className="h-3 w-3" /> Ranking
            </TabsTrigger>
            <TabsTrigger value="broadcasts" className="text-xs gap-1.5">
              <Send className="h-3 w-3" /> Disparos
            </TabsTrigger>
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
            <CampaignChart campaigns={filtered} dataKey="leads" title="Leads por Campanha" />
            <CampaignTable campaigns={filtered} />
          </TabsContent>

          {/* ─── Meta Ads ─── */}
          <TabsContent value="meta" className="mt-5 space-y-4">
            <CampaignChart campaigns={metaCampaigns} dataKey="leads" title="Meta Ads — Leads por Campanha" />
            <CampaignTable campaigns={metaCampaigns} columns={{ impressions: true, clicks: true, ctr: true, cpc: true }} />
          </TabsContent>

          {/* ─── Google Ads ─── */}
          <TabsContent value="google" className="mt-5 space-y-4">
            <CampaignChart campaigns={googleCampaigns} dataKey="leads" title="Google Ads — Leads por Campanha" />
            <CampaignTable campaigns={googleCampaigns} columns={{ impressions: true, clicks: true, ctr: true, cpc: true }} />
          </TabsContent>

          {/* ─── ROI ─── */}
          <TabsContent value="roi" className="mt-5 space-y-4">
            <CampaignChart campaigns={filtered} dataKey="revenue" title="Receita por Campanha" />
            <ComingSoonOverlay label="ROI detalhado em breve">
              <div className="bg-card ghost-border rounded-xl p-8">
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">ROAS Geral</p>
                    <p className="text-2xl font-bold text-foreground">3.2x</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Custo por Conversão</p>
                    <p className="text-2xl font-bold text-foreground">R$ 168,00</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">LTV Médio</p>
                    <p className="text-2xl font-bold text-foreground">R$ 1.680</p>
                  </div>
                </div>
              </div>
            </ComingSoonOverlay>
          </TabsContent>

          {/* ─── Ranking ─── */}
          <TabsContent value="ranking" className="mt-5">
            <CampaignRanking campaigns={filtered} sortBy="roi" />
          </TabsContent>

          {/* ─── Disparos WhatsApp ─── */}
          <TabsContent value="broadcasts" className="mt-5">
            <BroadcastsTab clientId={clientId} tenantId={tenant?.id} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
