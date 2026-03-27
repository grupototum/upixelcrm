import { Badge } from "@/components/ui/badge";
import { Megaphone } from "lucide-react";
import type { Campaign } from "./types";

function statusLabel(s: Campaign["status"]) {
  if (s === "active") return <Badge className="bg-success/15 text-success border-success/30 text-[10px]">Ativa</Badge>;
  if (s === "paused") return <Badge className="bg-warning/15 text-warning border-warning/30 text-[10px]">Pausada</Badge>;
  return <Badge variant="outline" className="text-[10px] text-muted-foreground">Encerrada</Badge>;
}

interface CampaignTableProps {
  campaigns: Campaign[];
  columns?: { spend?: boolean; leads?: boolean; cpl?: boolean; roi?: boolean; cpc?: boolean; ctr?: boolean; impressions?: boolean; clicks?: boolean };
}

export function CampaignTable({ campaigns, columns }: CampaignTableProps) {
  const show = {
    spend: columns?.spend !== false,
    leads: columns?.leads !== false,
    cpl: columns?.cpl !== false,
    roi: columns?.roi !== false,
    cpc: columns?.cpc ?? false,
    ctr: columns?.ctr ?? false,
    impressions: columns?.impressions ?? false,
    clicks: columns?.clicks ?? false,
  };

  return (
    <div className="bg-card ghost-border rounded-xl overflow-hidden shadow-card">
      <div className="flex items-center gap-4 px-5 py-3 bg-secondary/50 ghost-border border-b">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex-1">Campanha</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-20 text-center">Status</span>
        {show.spend && <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-24 text-right">Investido</span>}
        {show.leads && <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-16 text-center">Leads</span>}
        {show.cpl && <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-20 text-right">CPL</span>}
        {show.cpc && <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-20 text-right">CPC</span>}
        {show.ctr && <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-16 text-right">CTR</span>}
        {show.impressions && <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-24 text-right">Impressões</span>}
        {show.clicks && <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-16 text-right">Cliques</span>}
        {show.roi && <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-16 text-right">ROI</span>}
      </div>
      <div className="divide-y divide-border/50">
        {campaigns.map((c) => (
          <div key={c.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-card-hover transition-colors">
            <div className="min-w-0 flex-1 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${c.platform === "Meta Ads" ? "bg-primary/10" : "bg-accent/10"}`}>
                <Megaphone className={`h-4 w-4 ${c.platform === "Meta Ads" ? "text-primary" : "text-accent"}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                <p className="text-[10px] text-muted-foreground">{c.platform}</p>
              </div>
            </div>
            <div className="w-20 flex justify-center">{statusLabel(c.status)}</div>
            {show.spend && <div className="w-24 text-right"><span className="text-sm text-foreground">R$ {c.spend.toLocaleString("pt-BR")}</span></div>}
            {show.leads && <div className="w-16 text-center"><span className="text-sm font-bold text-foreground">{c.leads}</span></div>}
            {show.cpl && <div className="w-20 text-right"><span className="text-sm text-muted-foreground">R$ {c.cpl.toFixed(2).replace(".", ",")}</span></div>}
            {show.cpc && <div className="w-20 text-right"><span className="text-sm text-muted-foreground">R$ {c.cpc.toFixed(2).replace(".", ",")}</span></div>}
            {show.ctr && <div className="w-16 text-right"><span className="text-sm text-muted-foreground">{c.ctr.toFixed(2)}%</span></div>}
            {show.impressions && <div className="w-24 text-right"><span className="text-sm text-muted-foreground">{c.impressions.toLocaleString("pt-BR")}</span></div>}
            {show.clicks && <div className="w-16 text-right"><span className="text-sm text-muted-foreground">{c.clicks.toLocaleString("pt-BR")}</span></div>}
            {show.roi && <div className="w-16 text-right"><span className="text-sm font-bold text-success">{c.roi}%</span></div>}
          </div>
        ))}
      </div>
    </div>
  );
}
