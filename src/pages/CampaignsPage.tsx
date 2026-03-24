import { AppLayout } from "@/components/layout/AppLayout";
import { ComingSoonOverlay } from "@/components/ui/coming-soon";
import { Megaphone, TrendingUp, DollarSign, BarChart3, Eye } from "lucide-react";

const campaigns = [
  { name: "Black Friday 2024", platform: "Meta Ads", spend: 5200, leads: 142, cpl: 36.62, status: "active" },
  { name: "Lançamento Enterprise", platform: "Google Ads", spend: 3800, leads: 89, cpl: 42.70, status: "active" },
  { name: "Remarketing Q1", platform: "Meta Ads", spend: 1200, leads: 34, cpl: 35.29, status: "paused" },
];

export default function CampaignsPage() {
  return (
    <AppLayout title="Campanhas" subtitle="Performance de mídia paga">
      <div className="p-6 animate-fade-in">
        <ComingSoonOverlay label="Campanhas">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Investimento Total</p>
              <p className="text-xl font-bold text-foreground flex items-center gap-1"><DollarSign className="h-5 w-5 text-primary" /> R$ 10.200</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Leads Gerados</p>
              <p className="text-xl font-bold text-foreground flex items-center gap-1"><TrendingUp className="h-5 w-5 text-success" /> 265</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">CPL Médio</p>
              <p className="text-xl font-bold text-foreground flex items-center gap-1"><BarChart3 className="h-5 w-5 text-accent" /> R$ 38,49</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg divide-y divide-border">
            {campaigns.map((c) => (
              <div key={c.name} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Megaphone className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.platform}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-xs">
                  <span className="text-muted-foreground">R$ {c.spend.toLocaleString("pt-BR")}</span>
                  <span className="text-foreground font-medium">{c.leads} leads</span>
                  <span className={`px-2 py-0.5 rounded-full ${c.status === "active" ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                    {c.status === "active" ? "Ativa" : "Pausada"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ComingSoonOverlay>
      </div>
    </AppLayout>
  );
}
