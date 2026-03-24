import { AppLayout } from "@/components/layout/AppLayout";
import { mockLeads, mockTasks, mockColumns } from "@/lib/mock-data";
import {
  TrendingUp, TrendingDown, Users, CheckSquare, Clock, Activity,
  Loader2, DollarSign, Brain, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { ComingSoonBadge } from "@/components/ui/coming-soon";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadsByPeriodChart, LeadsByOriginChart } from "@/components/dashboard/DashboardCharts";
import { useState, useEffect } from "react";

const leadsInProgress = mockLeads.filter(l =>
  ["col2", "col3", "col4"].includes(l.column_id || "")
).length;

const leadsWon = mockLeads.filter(l => l.column_id === "col5").length;
const leadsLost = 1; // mock

const stats = [
  { label: "Total de Leads", value: mockLeads.length.toString(), change: "+12%", up: true, icon: Users, accent: "primary" },
  { label: "Em andamento", value: leadsInProgress.toString(), change: "+4%", up: true, icon: Loader2, accent: "accent" },
  { label: "Leads Ganhos", value: String(leadsWon), change: "+8%", up: true, icon: TrendingUp, accent: "success" },
  { label: "Leads Perdidos", value: String(leadsLost), change: "-5%", up: false, icon: TrendingDown, accent: "destructive" },
  { label: "Tarefas Pendentes", value: mockTasks.filter(t => t.status === "pending").length.toString(), change: `${mockTasks.filter(t => t.status === "overdue").length} atrasadas`, up: false, icon: CheckSquare, accent: "warning" },
];

const comingSoonCards = [
  { label: "ROI de Campanhas", value: "—", icon: DollarSign, description: "Retorno sobre investimento em ads" },
  { label: "Custos de IA", value: "—", icon: Brain, description: "Consumo de tokens e agentes" },
];

const recentActivities = [
  { text: "Maria Silva entrou em Novos Leads", time: "Há 2 min", type: "lead" as const },
  { text: "Proposta enviada para Ana Oliveira", time: "Há 15 min", type: "action" as const },
  { text: "Tarefa concluída: Call com Patricia", time: "Há 1h", type: "task" as const },
  { text: "Automação executada: Follow-up 48h", time: "Há 2h", type: "automation" as const },
  { text: "João Santos movido para Qualificação", time: "Há 3h", type: "lead" as const },
  { text: "Lead importado via CSV: Roberto Alves", time: "Há 4h", type: "lead" as const },
];

const typeColors: Record<string, string> = {
  lead: "bg-primary",
  action: "bg-accent",
  task: "bg-success",
  automation: "bg-warning",
};

const accentColorMap: Record<string, string> = {
  primary: "text-primary",
  success: "text-success",
  accent: "text-accent",
  destructive: "text-destructive",
  warning: "text-warning",
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  if (loading) {
    return (
      <AppLayout title="Dashboard" subtitle="Visão geral da operação">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-4 shadow-card space-y-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-14" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5 shadow-card space-y-4">
              <Skeleton className="h-4 w-40" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-2 flex-1 rounded-full" />
                  <Skeleton className="h-3 w-6" />
                </div>
              ))}
            </div>
            <div className="bg-card border border-border rounded-lg p-5 shadow-card space-y-4">
              <Skeleton className="h-4 w-36" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-2 w-2 rounded-full mt-1.5" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-2.5 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard" subtitle="Visão geral da operação">
      <div className="p-6 space-y-6 animate-fade-in">
        {/* ─── KPI Cards ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-lg p-4 shadow-card hover:shadow-card-hover hover:border-border-hover transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</span>
                <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
                  <s.icon className={`h-4 w-4 ${accentColorMap[s.accent] ?? "text-muted-foreground"}`} />
                </div>
              </div>
              <span className="text-2xl font-bold text-foreground block">{s.value}</span>
              <span className={`text-[11px] font-medium flex items-center gap-0.5 mt-1 ${s.up ? "text-success" : "text-muted-foreground"}`}>
                {s.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {s.change}
              </span>
            </div>
          ))}
        </div>

        {/* ─── Coming Soon Cards ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {comingSoonCards.map((c) => (
            <div key={c.label} className="bg-card border border-border rounded-lg p-4 shadow-card relative overflow-hidden opacity-70">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{c.label}</span>
                <ComingSoonBadge />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                  <c.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <span className="text-xl font-bold text-muted-foreground">{c.value}</span>
                  <p className="text-[11px] text-muted-foreground">{c.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Charts ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LeadsByPeriodChart />
          <LeadsByOriginChart />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ─── Pipeline Summary ─── */}
          <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5 shadow-card">
            <h2 className="text-sm font-semibold text-foreground mb-4">Resumo do Pipeline</h2>
            <div className="space-y-3">
              {mockColumns.map((col) => {
                const count = mockLeads.filter((l) => l.column_id === col.id).length;
                const total = mockLeads.length;
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={col.id} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                    <span className="text-sm text-foreground w-32 truncate">{col.name}</span>
                    <div className="flex-1 bg-secondary rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-2.5 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${pct}%`, backgroundColor: col.color }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-foreground w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total no pipeline</span>
              <span className="text-sm font-bold text-foreground">{mockLeads.length} leads</span>
            </div>
          </div>

          {/* ─── Recent Activity ─── */}
          <div className="bg-card border border-border rounded-lg p-5 shadow-card">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Atividades Recentes
            </h2>
            <div className="space-y-3">
              {recentActivities.map((a, i) => (
                <div key={i} className="flex gap-3 group">
                  <div className="flex flex-col items-center">
                    <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${typeColors[a.type] || "bg-primary"}`} />
                    {i < recentActivities.length - 1 && (
                      <div className="w-px flex-1 bg-border mt-1" />
                    )}
                  </div>
                  <div className="pb-3">
                    <p className="text-sm text-foreground group-hover:text-primary transition-colors">{a.text}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" /> {a.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Pending Tasks ─── */}
        <div className="bg-card border border-border rounded-lg p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Tarefas Pendentes</h2>
            <span className="text-[11px] text-muted-foreground">{mockTasks.filter(t => t.status !== "completed").length} pendentes</span>
          </div>
          <div className="space-y-2">
            {mockTasks.filter(t => t.status !== "completed").map((task) => {
              const lead = mockLeads.find(l => l.id === task.lead_id);
              return (
                <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${task.status === "overdue" ? "bg-destructive animate-pulse" : "bg-accent"}`} />
                    <div>
                      <span className="text-sm text-foreground">{task.title}</span>
                      {lead && <p className="text-[11px] text-muted-foreground mt-0.5">{lead.name} · {lead.company}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.status === "overdue" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive font-medium">Atrasada</span>
                    )}
                    <span className="text-xs text-muted-foreground">{task.due_date}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
