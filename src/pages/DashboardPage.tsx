import { AppLayout } from "@/components/layout/AppLayout";
import { useAppState } from "@/contexts/AppContext";
import {
  TrendingUp, TrendingDown, Users, CheckSquare, Clock, Activity,
  Loader2, DollarSign, Brain, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { ComingSoonBadge } from "@/components/ui/coming-soon";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadsByPeriodChart, LeadsByOriginChart } from "@/components/dashboard/DashboardCharts";
import { useState, useEffect, useMemo } from "react";

export default function DashboardPage() {
  const { leads, tasks, columns, timeline } = useAppState();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  const leadsInProgress = useMemo(() =>
    leads.filter(l => ["col2", "col3", "col4"].includes(l.column_id || "")).length
  , [leads]);
  const leadsWon = useMemo(() => leads.filter(l => l.column_id === "col5").length, [leads]);

  const stats = useMemo(() => [
    { label: "Total de Leads", value: leads.length.toString(), change: "+12%", up: true, icon: Users, accent: "primary" },
    { label: "Em andamento", value: leadsInProgress.toString(), change: "+4%", up: true, icon: Loader2, accent: "accent" },
    { label: "Leads Ganhos", value: String(leadsWon), change: "+8%", up: true, icon: TrendingUp, accent: "success" },
    { label: "Leads Perdidos", value: "1", change: "-5%", up: false, icon: TrendingDown, accent: "destructive" },
    { label: "Tarefas Pendentes", value: tasks.filter(t => t.status === "pending").length.toString(), change: `${tasks.filter(t => t.status === "overdue").length} atrasadas`, up: false, icon: CheckSquare, accent: "warning" },
  ], [leads, leadsInProgress, leadsWon, tasks]);

  const comingSoonCards = [
    { label: "ROI de Campanhas", value: "—", icon: DollarSign, description: "Retorno sobre investimento em ads" },
    { label: "Custos de IA", value: "—", icon: Brain, description: "Consumo de tokens e agentes" },
  ];

  const recentActivities = useMemo(() => {
    return timeline.slice(0, 6).map((ev) => ({
      text: ev.content,
      time: formatRelativeTime(ev.created_at),
      type: ev.type === "stage_change" ? "lead" : ev.type === "task" ? "task" : ev.type === "automation" ? "automation" : "action",
    }));
  }, [timeline]);

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

  const accentBgMap: Record<string, string> = {
    primary: "bg-primary/10",
    success: "bg-success/10",
    accent: "bg-accent/10",
    destructive: "bg-destructive/10",
    warning: "bg-warning/10",
  };

  if (loading) {
    return (
      <AppLayout title="Dashboard" subtitle="Visão geral da operação">
        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl ghost-border p-5 space-y-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-14" />
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard" subtitle="Visão geral da operação">
      <div className="p-8 space-y-8 animate-fade-in">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-card rounded-xl ghost-border p-5 hover:shadow-card-hover transition-all duration-200 group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                <s.icon className="h-16 w-16" />
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{s.label}</span>
                <div className={`h-8 w-8 rounded-lg ${accentBgMap[s.accent]} flex items-center justify-center`}>
                  <s.icon className={`h-4 w-4 ${accentColorMap[s.accent] ?? "text-muted-foreground"}`} />
                </div>
              </div>
              <span className="text-3xl font-extrabold text-foreground block tracking-tight">{s.value}</span>
              <span className={`text-[11px] font-semibold flex items-center gap-0.5 mt-1.5 ${s.up ? "text-success" : "text-muted-foreground"}`}>
                {s.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {s.change}
              </span>
            </div>
          ))}
        </div>

        {/* Coming Soon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {comingSoonCards.map((c) => (
            <div key={c.label} className="bg-card rounded-xl ghost-border p-5 relative overflow-hidden opacity-60">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{c.label}</span>
                <ComingSoonBadge />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
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

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LeadsByPeriodChart />
          <LeadsByOriginChart />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pipeline Summary */}
          <div className="lg:col-span-2 bg-card rounded-xl ghost-border p-6">
            <h2 className="text-sm font-bold text-foreground mb-5 tracking-tight">Resumo do Pipeline</h2>
            <div className="space-y-4">
              {columns.map((col) => {
                const count = leads.filter((l) => l.column_id === col.id).length;
                const total = leads.length;
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={col.id} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                    <span className="text-sm text-foreground w-32 truncate font-medium">{col.name}</span>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div className="h-2 rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, backgroundColor: col.color }} />
                    </div>
                    <span className="text-sm font-bold text-foreground w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 pt-4 ghost-border border-t flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total no pipeline</span>
              <span className="text-sm font-bold text-foreground">{leads.length} leads</span>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-card rounded-xl ghost-border p-6">
            <h2 className="text-sm font-bold text-foreground mb-5 flex items-center gap-2 tracking-tight">
              <Activity className="h-4 w-4 text-primary" /> Atividades Recentes
            </h2>
            <div className="space-y-3">
              {recentActivities.length > 0 ? recentActivities.map((a, i) => (
                <div key={i} className="flex gap-3 group">
                  <div className="flex flex-col items-center">
                    <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${typeColors[a.type] || "bg-primary"}`} />
                    {i < recentActivities.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                  </div>
                  <div className="pb-3">
                    <p className="text-sm text-foreground group-hover:text-primary transition-colors">{a.text}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" /> {a.time}
                    </p>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">Nenhuma atividade recente</p>
              )}
            </div>
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="bg-card rounded-xl ghost-border p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-foreground tracking-tight">Tarefas Pendentes</h2>
            <span className="text-[11px] text-muted-foreground">{tasks.filter(t => t.status !== "completed").length} pendentes</span>
          </div>
          <div className="space-y-2">
            {tasks.filter(t => t.status !== "completed").slice(0, 5).map((task) => {
              const lead = leads.find(l => l.id === task.lead_id);
              return (
                <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${task.status === "overdue" ? "bg-destructive animate-pulse" : "bg-accent"}`} />
                    <div>
                      <span className="text-sm text-foreground font-medium">{task.title}</span>
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

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Agora";
  if (minutes < 60) return `Há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Há ${days}d`;
}
