import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { Campaign } from "./types";

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
  color: "hsl(var(--foreground))",
};

interface CampaignChartProps {
  campaigns: Campaign[];
  dataKey?: "leads" | "spend" | "revenue" | "roi";
  title: string;
}

export function CampaignChart({ campaigns, dataKey = "leads", title }: CampaignChartProps) {
  const data = campaigns.map((c) => ({
    name: c.name.length > 18 ? c.name.slice(0, 18) + "…" : c.name,
    [dataKey]: c[dataKey],
    platform: c.platform,
  }));

  return (
    <div className="bg-card ghost-border rounded-xl p-5 shadow-card">
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "hsl(var(--foreground))" }} />
            <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
              {data.map((entry, i) => (
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
  );
}
