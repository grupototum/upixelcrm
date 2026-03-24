import { mockLeads } from "@/lib/mock-data";
import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const ORIGIN_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(210, 70%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(340, 65%, 55%)",
  "hsl(160, 55%, 45%)",
  "hsl(30, 80%, 55%)",
];

export function LeadsByPeriodChart() {
  const data = useMemo(() => {
    const months: Record<string, number> = {};
    mockLeads.forEach((lead) => {
      const d = new Date(lead.created_at || "");
      const key = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      const sortKey = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      if (!months[sortKey]) months[sortKey] = 0;
      months[sortKey]++;
    });
    // Build array sorted by key
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => {
        const [y, m] = key.split("-");
        const d = new Date(Number(y), Number(m));
        return {
          name: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
          leads: count,
        };
      });
  }, []);

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">Leads por Período</h2>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
                color: "hsl(var(--foreground))",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Bar dataKey="leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function LeadsByOriginChart() {
  const data = useMemo(() => {
    const origins: Record<string, number> = {};
    mockLeads.forEach((lead) => {
      const o = lead.origin || "Desconhecida";
      origins[o] = (origins[o] || 0) + 1;
    });
    return Object.entries(origins).map(([name, value]) => ({ name, value }));
  }, []);

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">Distribuição por Origem</h2>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={ORIGIN_COLORS[i % ORIGIN_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
                color: "hsl(var(--foreground))",
              }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "11px" }}
              formatter={(value: string) => (
                <span style={{ color: "hsl(var(--foreground))" }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
