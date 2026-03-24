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
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
          <Icon className={`h-4 w-4 ${colorMap[accent] ?? "text-muted-foreground"}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KPICard label="Investimento Total" value={`R$ ${spend.toLocaleString("pt-BR")}`} icon={DollarSign} accent="primary" />
      <KPICard label="Leads Gerados" value={String(leads)} icon={Users} accent="success" />
      <KPICard label="CPL Médio" value={`R$ ${avgCPL.toFixed(2).replace(".", ",")}`} icon={Target} accent="accent" />
      <KPICard label="ROI Total" value={`${roi}%`} icon={TrendingUp} accent="success" />
    </div>
  );
}
