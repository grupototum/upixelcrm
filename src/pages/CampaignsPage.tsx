import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ComingSoonBadge, ComingSoonOverlay } from "@/components/ui/coming-soon";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Megaphone, BarChart3, Trophy, Calendar, Download,
  DollarSign, Target,
} from "lucide-react";
import { CampaignKPICards } from "@/components/campaigns/CampaignKPICards";
import { CampaignTable } from "@/components/campaigns/CampaignTable";
import { CampaignChart } from "@/components/campaigns/CampaignChart";
import { CampaignRanking } from "@/components/campaigns/CampaignRanking";
import type { Campaign } from "@/components/campaigns/types";

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
              <div className="bg-card border border-border rounded-lg p-8">
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
        </Tabs>
      </div>
    </AppLayout>
  );
}
