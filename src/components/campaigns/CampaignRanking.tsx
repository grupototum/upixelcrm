import { ArrowUpRight, Megaphone } from "lucide-react";
import type { Campaign } from "./types";

interface CampaignRankingProps {
  campaigns: Campaign[];
  sortBy?: "roi" | "leads" | "revenue";
}

export function CampaignRanking({ campaigns, sortBy = "roi" }: CampaignRankingProps) {
  const sorted = [...campaigns].sort((a, b) => b[sortBy] - a[sortBy]);
  const labels: Record<string, string> = { roi: "ROI", leads: "Leads", revenue: "Receita" };

  return (
    <div className="bg-card ghost-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 ghost-border border-b bg-secondary/50">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ranking por {labels[sortBy]}</h3>
      </div>
      <div className="divide-y divide-border">
        {sorted.map((c, i) => {
          const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
          return (
            <div key={c.id} className="flex items-center gap-4 px-4 py-4 hover:bg-card-hover transition-colors">
              <div className="w-8 text-center shrink-0">
                {medal ? <span className="text-lg">{medal}</span> : <span className="text-sm font-bold text-muted-foreground">#{i + 1}</span>}
              </div>
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${c.platform === "Meta Ads" ? "bg-primary/10" : "bg-accent/10"}`}>
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
                <p className="text-[10px] text-muted-foreground">R$ {c.revenue.toLocaleString("pt-BR")} receita</p>
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
  );
}
