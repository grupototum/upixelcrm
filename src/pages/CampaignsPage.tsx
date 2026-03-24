import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ComingSoonBadge } from "@/components/ui/coming-soon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Megaphone, TrendingUp, ArrowDownRight, DollarSign, BarChart3,
  Target, Users, Calendar, Download, ExternalLink, Pause, Play,
  Trophy, ArrowUpRight, Zap, Clock,
} from "lucide-react";

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
  color: "hsl(var(--foreground))",
};

type Campaign = {
  id: string;
  name: string;
  platform: "Meta Ads" | "Google Ads";
  status: "active" | "paused" | "ended";
  spend: number;
  leads: number;
  cpl: number;
  cpc: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  revenue: number;
  roi: number;
  startDate: string;
};

const mockCampaigns: Campaign[] = [
  { id: "c1", name: "Black Friday 2024", platform: "Meta Ads", status: "active", spend: 5200, leads: 142, cpl: 36.62, cpc: 2.18, impressions: 84500, clicks: 2385, ctr: 2.82, conversions: 28, revenue: 42000, roi: 707, startDate: "2024-11-01" },
  { id: "c2", name: "Lançamento Enterprise", platform: "Google Ads", status: "active", spend: 3800, leads: 89, cpl: 42.70, cpc: 3.45, impressions: 62000, clicks: 1101, ctr: 1.78, conversions: 15, revenue: 33750, roi: 788, startDate: "2024-10-15" },
  { id: "c3", name: "Remarketing Q1", platform: "Meta Ads", status: "paused", spend: 1200, leads: 34, cpl: 35.29, cpc: 1.95, impressions: 28000, clicks: 615, ctr: 2.20, conversions: 8, revenue: 9600, roi: 700, startDate: "2024-01-10" },
  { id: "c4", name: "Captação Leads B2B", platform: "Google Ads", status: "active", spend: 2900, leads: 67, cpl: 43.28, cpc: 4.12, impressions: 41000, clicks: 704, ctr: 1.72, conversions: 12, revenue: 21600, roi: 645, startDate: "2024-09-01" },
  { id: "c5", name: "Brand Awareness", platform: "Meta Ads", status: "ended", spend: 800, leads: 18, cpl: 44.44, cpc: 1.60, impressions: 120000, clicks: 500, ctr: 0.42, conversions: 3, revenue: 4500, roi: 462, startDate: "2024-06-01" },
];

export default function CampaignsPage() {
  const [period, setPeriod] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");

  const filtered = useMemo(() => {
    if (platformFilter === "all") return mockCampaigns;
    return mockCampaigns.filter((c) => c.platform === platformFilter);
  }, [platformFilter]);

  const totals = useMemo(() => ({
    spend: filtered.reduce((s, c) => s + c.spend, 0),
    leads: filtered.reduce((s, c) => s + c.leads, 0),
    revenue: filtered.reduce((s, c) => s + c.revenue, 0),
    conversions: filtered.reduce((s, c) => s + c.conversions, 0),
  }), [filtered]);

  const avgCPL = totals.leads > 0 ? totals.spend / totals.leads : 0;
  const totalROI = totals.spend > 0 ? Math.round(((totals.revenue - totals.spend) / totals.spend) * 100) : 0;

  const rankingData = useMemo(() =>
    [...filtered].sort((a, b) => b.roi - a.roi), [filtered]
  );

  const chartData = useMemo(() =>
    filtered.map((c) => ({
      name: c.name.length > 18 ? c.name.slice(0, 18) + "…" : c.name,
      leads: c.leads,
      spend: c.spend,
      platform: c.platform,
    })), [filtered]
  );

  const statusLabel = (s: Campaign["status"]) => {
    if (s === "active") return <Badge variant="outline" className="text-[10px] border-success/40 text-success">Ativa</Badge>;
    if (s === "paused") return <Badge variant="outline" className="text-[10px] border-warning/40 text-warning">Pausada</Badge>;
    return <Badge variant="outline" className="text-[10px] border-muted-foreground/40 text-muted-foreground">Encerrada</Badge>;
  };

  return (
    <AppLayout
      title="Campanhas"
      subtitle="Performance de mídia paga"
      actions={
        <div className="flex items-center gap-2">
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <Megaphone className="h-3 w-3 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Todas plataformas</SelectItem>
              <SelectItem value="Meta Ads" className="text-xs">Meta Ads</SelectItem>
              <SelectItem value="Google Ads" className="text-xs">Google Ads</SelectItem>
            </SelectContent>
          </Select>
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
        {/* ─── KPI Cards ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard label="Investimento Total" value={`R$ ${totals.spend.toLocaleString("pt-BR")}`} icon={DollarSign} accent="primary" />
          <KPICard label="Leads Gerados" value={String(totals.leads)} icon={Users} accent="success" />
          <KPICard label="CPL Médio" value={`R$ ${avgCPL.toFixed(2).replace(".", ",")}`} icon={Target} accent="accent" />
          <KPICard label="ROI Total" value={`${totalROI}%`} icon={TrendingUp} accent="success" />
        </div>

        {/* ─── Tabs ─── */}
        <Tabs defaultValue="overview">
          <TabsList className="bg-secondary">
            <TabsTrigger value="overview" className="text-xs gap-1.5">
              <BarChart3 className="h-3 w-3" /> Visão Geral
            </TabsTrigger>
            <TabsTrigger value="ranking" className="text-xs gap-1.5">
              <Trophy className="h-3 w-3" /> Ranking
            </TabsTrigger>
            <TabsTrigger value="advanced" className="text-xs gap-1.5">
              <Zap className="h-3 w-3" /> Avançado <ComingSoonBadge />
            </TabsTrigger>
          </TabsList>

          {/* ─── Visão Geral ─── */}
          <TabsContent value="overview" className="mt-5 space-y-4">
            {/* Chart */}
            <div className="bg-card border border-border rounded-lg p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Leads por Campanha</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "hsl(var(--foreground))" }} />
                    <Bar dataKey="leads" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.platform === "Meta Ads" ? "hsl(var(--primary))" : "hsl(var(--accent))"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-4 mt-3 justify-center">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="h-2.5 w-2.5 rounded-full bg-primary" /> Meta Ads
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="h-2.5 w-2.5 rounded-full bg-accent" /> Google Ads
                </div>
              </div>
            </div>

            {/* Campaign table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 items-center px-4 py-2.5 bg-secondary/50 border-b border-border">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Campanha</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-20 text-center">Status</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-24 text-right">Investido</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-16 text-center">Leads</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-20 text-right">CPL</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-16 text-right">ROI</span>
              </div>
              <div className="divide-y divide-border">
                {filtered.map((c) => (
                  <div key={c.id} className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 items-center px-4 py-3 hover:bg-card-hover transition-colors group">
                    <div className="min-w-0 flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${c.platform === "Meta Ads" ? "bg-primary/10" : "bg-accent/10"}`}>
                        <Megaphone className={`h-4 w-4 ${c.platform === "Meta Ads" ? "text-primary" : "text-accent"}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">{c.platform}</p>
                      </div>
                    </div>
                    <div className="w-20 flex justify-center">{statusLabel(c.status)}</div>
                    <div className="w-24 text-right">
                      <span className="text-sm text-foreground">R$ {c.spend.toLocaleString("pt-BR")}</span>
                    </div>
                    <div className="w-16 text-center">
                      <span className="text-sm font-semibold text-foreground">{c.leads}</span>
                    </div>
                    <div className="w-20 text-right">
                      <span className="text-sm text-muted-foreground">R$ {c.cpl.toFixed(2).replace(".", ",")}</span>
                    </div>
                    <div className="w-16 text-right">
                      <span className="text-sm font-semibold text-success">{c.roi}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ─── Ranking ─── */}
          <TabsContent value="ranking" className="mt-5">
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-secondary/50">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ranking por ROI</h3>
              </div>
              <div className="divide-y divide-border">
                {rankingData.map((c, i) => {
                  const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                  return (
                    <div key={c.id} className="flex items-center gap-4 px-4 py-4 hover:bg-card-hover transition-colors">
                      <div className="w-8 text-center shrink-0">
                        {medal ? (
                          <span className="text-lg">{medal}</span>
                        ) : (
                          <span className="text-sm font-bold text-muted-foreground">#{i + 1}</span>
                        )}
                      </div>
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${c.platform === "Meta Ads" ? "bg-primary/10" : "bg-accent/10"}`}>
                        <Megaphone className={`h-5 w-5 ${c.platform === "Meta Ads" ? "text-primary" : "text-accent"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">{c.platform} · {c.conversions} conversões</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-success flex items-center gap-1 justify-end">
                          <ArrowUpRight className="h-3 w-3" /> {c.roi}%
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          R$ {c.revenue.toLocaleString("pt-BR")} receita
                        </p>
                      </div>
                      <div className="text-right shrink-0 w-28">
                        <p className="text-sm text-foreground">R$ {c.spend.toLocaleString("pt-BR")}</p>
                        <p className="text-[10px] text-muted-foreground">{c.leads} leads · CPL R$ {c.cpl.toFixed(2).replace(".", ",")}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* ─── Avançado ─── */}
          <TabsContent value="advanced" className="mt-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ComingSoonCard icon={ExternalLink} title="Integração Nativa" description="Conecte suas contas de Meta Ads e Google Ads para importar dados automaticamente em tempo real." />
              <ComingSoonCard icon={DollarSign} title="ROI Detalhado" description="Visualize receita por campanha, custo por conversão e ROAS com comparativos entre períodos." />
              <ComingSoonCard icon={BarChart3} title="Atribuição Multi-touch" description="Entenda quais campanhas contribuem para cada estágio da jornada do lead até a conversão." />
              <ComingSoonCard icon={Clock} title="Relatório Automatizado" description="Agende envio automático de relatórios de performance por e-mail para sua equipe." />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

/* ─── KPI Card ─── */
function KPICard({
  label, value, icon: Icon, accent,
}: {
  label: string; value: string; icon: typeof Target; accent: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
          <Icon className={`h-4 w-4 text-${accent}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

/* ─── Coming Soon Card ─── */
function ComingSoonCard({
  icon: Icon, title, description,
}: {
  icon: typeof Target; title: string; description: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-6 flex flex-col items-center text-center">
      <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
        <Icon className="h-6 w-6 text-accent" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground mb-3 max-w-xs">{description}</p>
      <ComingSoonBadge />
    </div>
  );
}
