import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useDashboardKpis } from "@/hooks/useDashboardKpis";
import {
  TrendingUp, TrendingDown, Users, CheckSquare, Clock, Activity,
  Loader2, DollarSign, Brain, ArrowUpRight, ArrowDownRight, AlertCircle, Target,
} from "lucide-react";
import { ComingSoonBadge } from "@/components/ui/coming-soon";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import { LeadsByPeriodChart, LeadsByOriginChart } from "@/components/dashboard/DashboardCharts";
import { GoalCard } from "@/components/dashboard/GoalCard";
import { useGoalsProgress } from "@/hooks/useGoalsProgress";
import { formatRelativeTime, formatShortDate } from "@/lib/format-date";
import { useAppState } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { CompleteTaskDialog } from "@/components/crm/CompleteTaskDialog";
import type { Task } from "@/types";

const typeColors: Record<string, string> = {
  stage_change: "bg-primary",
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

const COMING_SOON_CARDS = [
  { label: "ROI de Campanhas", value: "—", icon: DollarSign, description: "Retorno sobre investimento em ads" },
  { label: "Custos de IA", value: "—", icon: Brain, description: "Consumo de tokens e agentes" },
];

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useDashboardKpis();
  const { progress: allGoalsProgress } = useGoalsProgress();
  const { tasks, completeTask } = useAppState();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [completingTask, setCompletingTask] = useState<Task | null>(null);

  // Meta individual só aparece pro próprio dono; metas sem assigned_to são da equipe toda.
  const goalsProgress = useMemo(
    () => allGoalsProgress.filter((p) => !p.goal.assigned_to || p.goal.assigned_to === user?.id),
    [allGoalsProgress, user?.id]
  );

  const stats = data?.stats;
  const pipeline = useMemo(() => data?.pipeline ?? [], [data?.pipeline]);
  const leadsByMonth = data?.leads_by_month ?? [];
  const leadsByOrigin = data?.leads_by_origin ?? [];
  const recentActivity = data?.recent_activity ?? [];
  const pendingTasks = data?.pending_tasks ?? [];

  const totalLeads = stats?.total_leads ?? 0;
  const pipelineTotal = useMemo(() => pipeline.reduce((s, p) => s + p.count, 0), [pipeline]);

  const cards = useMemo(() => [
    {
      label: "Total de Leads",
      value: String(totalLeads),
      change: `${stats?.leads_30d ?? 0} últimos 30d`,
      up: (stats?.leads_30d ?? 0) > 0,
      icon: Users, accent: "primary",
    },
    {
      label: "Em andamento",
      value: String(stats?.in_progress ?? 0),
      change: `${stats?.new_leads ?? 0} novos`,
      up: true,
      icon: Loader2, accent: "accent",
    },
    {
      label: "Leads Ganhos",
      value: String(stats?.won ?? 0),
      change: `${totalLeads > 0 ? Math.round(((stats?.won ?? 0) / totalLeads) * 100) : 0}% conversão`,
      up: true,
      icon: TrendingUp, accent: "success",
    },
    {
      label: "Leads Perdidos",
      value: String(stats?.lost ?? 0),
      change: `${totalLeads > 0 ? Math.round(((stats?.lost ?? 0) / totalLeads) * 100) : 0}% perda`,
      up: false,
      icon: TrendingDown, accent: "destructive",
    },
    {
      label: "Tarefas Pendentes",
      value: String(stats?.tasks_pending ?? 0),
      change: `${stats?.tasks_overdue ?? 0} atrasadas`,
      up: false,
      icon: CheckSquare, accent: "warning",
    },
  ], [stats, totalLeads]);

  function openCompleteTask(taskId: string) {
    const fullTask = tasks.find((t) => t.id === taskId);
    if (fullTask) setCompletingTask(fullTask);
  }

  async function handleConfirmCompleteDashboardTask(id: string, result?: string) {
    const ok = await completeTask(id, result);
    if (ok) refetch();
    return ok;
  }

  if (error) {
    return (
      <AppLayout title="Dashboard" subtitle="Erro ao carregar métricas">
        <div className="p-8">
          <div className="max-w-xl mx-auto bg-destructive/5 border border-destructive/30 rounded-xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-destructive">Não foi possível carregar o dashboard.</p>
                <p className="text-xs text-muted-foreground">
                  {error instanceof Error ? error.message : "Erro desconhecido. Tente novamente em instantes."}
                </p>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Se o problema persistir, verifique se a função <code className="text-foreground">dashboard_kpis()</code> está criada no banco.
                </p>
              </div>
            </div>
            <Button onClick={() => refetch()} size="sm">
              Tentar novamente
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (isLoading && !data) {
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
        {/* Metas do período */}
        {goalsProgress.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {goalsProgress.map((p) => (
              <GoalCard key={p.goal.id} progress={p} />
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-xl ghost-border p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Nenhuma meta configurada</p>
                <p className="text-[11px] text-muted-foreground">Defina metas de vendas para acompanhar o progresso da equipe aqui.</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate("/settings/goals")}>Criar meta</Button>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {cards.map((s) => (
            <div key={s.label} className="bg-card rounded-xl ghost-border p-5 hover:shadow-card-hover transition-all duration-200 group relative overflow-hidden">
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
          {COMING_SOON_CARDS.map((c) => (
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

        {/* Charts — agora alimentados pelos dados reais do tenant via RPC */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LeadsByPeriodChart data={leadsByMonth} />
          <LeadsByOriginChart data={leadsByOrigin} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pipeline Summary */}
          <div className="lg:col-span-2 bg-card rounded-xl ghost-border p-6">
            <h2 className="text-sm font-bold text-foreground mb-5 tracking-tight">Resumo do Pipeline</h2>
            <div className="space-y-4">
              {pipeline.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma coluna com leads ainda.</p>
              ) : (
                pipeline.map((col) => {
                  const pct = pipelineTotal > 0 ? (col.count / pipelineTotal) * 100 : 0;
                  return (
                    <div key={col.column_id} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: col.color || "hsl(var(--primary))" }} />
                      <span className="text-sm text-foreground w-32 truncate font-medium">{col.name}</span>
                      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                        <div className="h-2 rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, backgroundColor: col.color || "hsl(var(--primary))" }} />
                      </div>
                      <span className="text-sm font-bold text-foreground w-8 text-right">{col.count}</span>
                    </div>
                  );
                })
              )}
            </div>
            <div className="mt-5 pt-4 ghost-border border-t flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total no pipeline</span>
              <span className="text-sm font-bold text-foreground">{pipelineTotal} leads</span>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-card rounded-xl ghost-border p-6">
            <h2 className="text-sm font-bold text-foreground mb-5 flex items-center gap-2 tracking-tight">
              <Activity className="h-4 w-4 text-primary" /> Atividades Recentes
            </h2>
            <div className="space-y-3">
              {recentActivity.length > 0 ? recentActivity.map((a, i) => (
                <div key={i} className="flex gap-3 group">
                  <div className="flex flex-col items-center">
                    <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${typeColors[a.type] || "bg-primary"}`} />
                    {i < recentActivity.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                  </div>
                  <div className="pb-3">
                    <p className="text-sm text-foreground group-hover:text-primary transition-colors">{a.content}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" /> {formatRelativeTime(a.created_at)}
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
            <span className="text-[11px] text-muted-foreground">{stats?.tasks_pending ?? 0} pendentes</span>
          </div>
          <div className="space-y-2">
            {pendingTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem tarefas pendentes.</p>
            ) : pendingTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                <div className="flex items-center gap-3">
                  <Checkbox
                    className="h-4 w-4 shrink-0"
                    checked={false}
                    onCheckedChange={() => openCompleteTask(task.id)}
                  />
                  <div>
                    <span className="text-sm text-foreground font-medium">{task.title}</span>
                    {task.lead_name && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {task.lead_name}{task.lead_company ? ` · ${task.lead_company}` : ""}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {task.status === "overdue" && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive font-medium">Atrasada</span>
                  )}
                  {task.due_date && <span className="text-xs text-muted-foreground">{formatShortDate(task.due_date)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <CompleteTaskDialog
        task={completingTask}
        open={!!completingTask}
        onOpenChange={(open) => { if (!open) setCompletingTask(null); }}
        onConfirm={handleConfirmCompleteDashboardTask}
      />
    </AppLayout>
  );
}
