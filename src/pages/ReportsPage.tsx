import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { mockColumns, mockLeads, mockTasks } from "@/lib/mock-data";
import {
  TrendingUp, ArrowDownRight, BarChart3, PieChart as PieChartIcon,
  Download, Calendar, Target, Users, DollarSign,
  Clock, Zap, ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ComingSoonBadge } from "@/components/ui/coming-soon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area,
} from "recharts";

const ORIGIN_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(210, 70%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(340, 65%, 55%)",
  "hsl(160, 55%, 45%)",
];

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
  color: "hsl(var(--foreground))",
};

export default function ReportsPage() {
  const [period, setPeriod] = useState("all");

  const conversionData = useMemo(() =>
    mockColumns.map((col, i) => {
      const count = mockLeads.filter((l) => l.column_id === col.id).length;
      const prevCount = i === 0
        ? mockLeads.length
        : mockLeads.filter((l) => l.column_id === mockColumns[i - 1].id).length;
      const rate = prevCount > 0 ? Math.round((count / prevCount) * 100) : 100;
      return { name: col.name, count, rate, color: col.color || "hsl(var(--primary))" };
    }), []
  );

  const leadsByPeriod = useMemo(() => {
    const months: Record<string, number> = {};
    mockLeads.forEach((lead) => {
      const d = new Date(lead.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      months[key] = (months[key] || 0) + 1;
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => {
        const [y, m] = key.split("-");
        return {
          name: new Date(Number(y), Number(m)).toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
          leads: count,
        };
      });
  }, []);

  const leadsByOrigin = useMemo(() => {
    const origins: Record<string, number> = {};
    mockLeads.forEach((l) => { origins[l.origin || "Outro"] = (origins[l.origin || "Outro"] || 0) + 1; });
    return Object.entries(origins).map(([name, value]) => ({ name, value }));
  }, []);

  const funnelData = useMemo(() =>
    mockColumns.map((col) => ({
      name: col.name,
      value: mockLeads.filter((l) => l.column_id === col.id).length,
      fill: col.color || "hsl(var(--primary))",
    })), []
  );

  const totalValue = useMemo(
    () => mockLeads.reduce((sum, l) => sum + (l.value || 0), 0), []
  );

  const avgTicket = useMemo(
    () => mockLeads.length > 0 ? Math.round(totalValue / mockLeads.length) : 0, [totalValue]
  );

  const overdueCount = useMemo(() => mockTasks.filter((t) => t.status === "overdue").length, []);
  const overdueRate = useMemo(() => {
    return mockTasks.length > 0 ? Math.round((overdueCount / mockTasks.length) * 100) : 0;
  }, [overdueCount]);

  const conversionRate = useMemo(() => {
    const wonCount = mockLeads.filter((l) => l.column_id === mockColumns[mockColumns.length - 1]?.id).length;
    return mockLeads.length > 0 ? ((wonCount / mockLeads.length) * 100).toFixed(1) : "0";
  }, []);

  return (
    <AppLayout
      title="Relatórios"
      subtitle="Analytics e métricas da operação"
      actions={
        <div className="flex items-center gap-2">
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
          <KPICard
            label="Taxa de Conversão"
            value={`${conversionRate}%`}
            change="+3.2%"
            positive
            icon={Target}
            accent="primary"
          />
          <KPICard
            label="Leads Totais"
            value={String(mockLeads.length)}
            change="+12%"
            positive
            icon={Users}
            accent="success"
          />
          <KPICard
            label="Ticket Médio"
            value={`R$ ${avgTicket.toLocaleString("pt-BR")}`}
            change="-2.1%"
            positive={false}
            icon={DollarSign}
            accent="accent"
          />
          <KPICard
            label="Tarefas Atrasadas"
            value={`${overdueRate}%`}
            change={`${overdueCount} tarefa${overdueCount !== 1 ? "s" : ""}`}
            positive={false}
            icon={Clock}
            accent="destructive"
          />
        </div>

        {/* ─── Tabs ─── */}
        <Tabs defaultValue="conversion">
          <TabsList className="bg-secondary">
            <TabsTrigger value="conversion" className="text-xs gap-1.5">
              <BarChart3 className="h-3 w-3" /> Conversão por Etapa
            </TabsTrigger>
            <TabsTrigger value="leads" className="text-xs gap-1.5">
              <TrendingUp className="h-3 w-3" /> Leads por Período
            </TabsTrigger>
            <TabsTrigger value="origin" className="text-xs gap-1.5">
              <PieChartIcon className="h-3 w-3" /> Por Origem
            </TabsTrigger>
            <TabsTrigger value="advanced" className="text-xs gap-1.5">
              <Zap className="h-3 w-3" /> Avançado <ComingSoonBadge />
            </TabsTrigger>
          </TabsList>

          {/* ─── Conversão por Etapa ─── */}
          <TabsContent value="conversion" className="mt-5 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-card ghost-border rounded-xl p-5 shadow-card">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-4">Funil de Conversão</h3>
                <div className="space-y-3">
                  {conversionData.map((col) => (
                    <div key={col.name} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                          <span className="text-sm text-foreground">{col.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-[10px]">{col.count} leads</Badge>
                          <span className="text-sm font-semibold text-foreground w-12 text-right">{col.rate}%</span>
                        </div>
                      </div>
                      <div className="bg-secondary rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{ width: `${col.rate}%`, backgroundColor: col.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card ghost-border rounded-xl p-5 shadow-card">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-4">Visualização do Funil</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnelData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} className="fill-muted-foreground" width={90} />
                      <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "hsl(var(--foreground))" }} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {funnelData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ─── Leads por Período ─── */}
          <TabsContent value="leads" className="mt-5">
            <div className="bg-card ghost-border rounded-xl p-5 shadow-card">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-4">Volume de Leads por Mês</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={leadsByPeriod} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="leadGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "hsl(var(--foreground))" }} />
                    <Area
                      type="monotone"
                      dataKey="leads"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#leadGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          {/* ─── Por Origem ─── */}
          <TabsContent value="origin" className="mt-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-card ghost-border rounded-xl p-5 shadow-card">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-4">Distribuição por Origem</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={leadsByOrigin}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {leadsByOrigin.map((_, i) => (
                          <Cell key={i} fill={ORIGIN_COLORS[i % ORIGIN_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
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

              <div className="bg-card ghost-border rounded-xl p-5 shadow-card">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-4">Detalhamento por Origem</h3>
                <div className="space-y-3">
                  {leadsByOrigin
                    .sort((a, b) => b.value - a.value)
                    .map((origin, i) => {
                      const pct = Math.round((origin.value / mockLeads.length) * 100);
                      return (
                        <div key={origin.name} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: ORIGIN_COLORS[i % ORIGIN_COLORS.length] }}
                              />
                              <span className="text-sm text-foreground">{origin.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{origin.value} leads</span>
                              <span className="text-sm font-semibold text-foreground">{pct}%</span>
                            </div>
                          </div>
                          <div className="bg-secondary rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full transition-all duration-500"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: ORIGIN_COLORS[i % ORIGIN_COLORS.length],
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ─── Avançado (Em breve) ─── */}
          <TabsContent value="advanced" className="mt-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ComingSoonCard
                icon={DollarSign}
                title="ROI por Campanha"
                description="Analise o retorno sobre investimento de cada campanha com métricas detalhadas de custo por lead e receita gerada."
              />
              <ComingSoonCard
                icon={Zap}
                title="Custos de IA"
                description="Acompanhe o consumo de tokens, transcrições e respostas automáticas geradas pelos agentes de IA."
              />
              <ComingSoonCard
                icon={TrendingUp}
                title="Comparativos Avançados"
                description="Compare períodos, equipes e canais lado a lado para identificar tendências e oportunidades."
              />
              <ComingSoonCard
                icon={Users}
                title="Performance por Operador"
                description="Visualize métricas individuais de tempo de resposta, conversão e volume de atendimentos."
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

/* ─── KPI Card ─── */
function KPICard({
  label, value, change, positive, icon: Icon, accent,
}: {
  label: string; value: string; change: string; positive: boolean; icon: typeof Target; accent: string;
}) {
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
    <div className="bg-card ghost-border rounded-xl p-5 shadow-card hover:shadow-card-hover transition-all duration-200 hover:border-border-hover">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <div className={`h-8 w-8 rounded-lg ${bgMap[accent] ?? "bg-secondary"} flex items-center justify-center`}>
          <Icon className={`h-4 w-4 ${colorMap[accent] ?? "text-muted-foreground"}`} />
        </div>
      </div>
      <p className="text-3xl font-extrabold text-foreground tracking-tight">{value}</p>
      <p className={`text-xs flex items-center gap-1 mt-1.5 ${positive ? "text-success" : "text-destructive"}`}>
        {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {change}
      </p>
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
    <div className="bg-card ghost-border rounded-xl p-6 flex flex-col items-center text-center shadow-card opacity-70 hover:opacity-80 transition-all duration-200">
      <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
        <Icon className="h-6 w-6 text-accent" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground mb-3 max-w-xs">{description}</p>
      <ComingSoonBadge />
    </div>
  );
}
