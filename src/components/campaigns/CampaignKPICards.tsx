import { DollarSign, Users, Target, TrendingUp, type LucideIcon } from "lucide-react";

interface KPICardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  accent: string;
}

function KPICard({ label, value, icon: Icon, accent }: KPICardProps) {
  const colorMap: Record<string, string> = {
    primary: "text-primary",
    success: "text-success",
    accent: "text-accent",
    destructive: "text-destructive",
  };
  const bgMap: Record<string, string> = {
    primary: "bg-primary/10",
    success: "bg-success/10",
    accent: "bg-accent/10",
    destructive: "bg-destructive/10",
  };
  return (
    <div className="bg-card ghost-border rounded-xl p-5 shadow-card hover:shadow-card-hover hover:border-border-hover transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <div className={`h-8 w-8 rounded-lg ${bgMap[accent] ?? "bg-secondary"} flex items-center justify-center`}>
          <Icon className={`h-4 w-4 ${colorMap[accent] ?? "text-muted-foreground"}`} />
        </div>
      </div>
      <p className="text-3xl font-extrabold text-foreground tracking-tight">{value}</p>
    </div>
  );
}

interface CampaignKPICardsProps {
  spend: number;
  leads: number;
  avgCPL: number;
  roi: number;
}

export function CampaignKPICards({ spend, leads, avgCPL, roi }: CampaignKPICardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard label="Investimento Total" value={`R$ ${spend.toLocaleString("pt-BR")}`} icon={DollarSign} accent="primary" />
      <KPICard label="Leads Gerados" value={String(leads)} icon={Users} accent="success" />
      <KPICard label="CPL Médio" value={`R$ ${avgCPL.toFixed(2).replace(".", ",")}`} icon={Target} accent="accent" />
      <KPICard label="ROI Total" value={`${roi}%`} icon={TrendingUp} accent="success" />
    </div>
  );
}
