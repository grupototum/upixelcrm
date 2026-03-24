import { AppLayout } from "@/components/layout/AppLayout";
import { mockLeads, mockTasks, mockColumns } from "@/lib/mock-data";
import { TrendingUp, TrendingDown, Users, CheckSquare, Clock, Activity } from "lucide-react";

const stats = [
  { label: "Total de Leads", value: mockLeads.length.toString(), change: "+12%", up: true, icon: Users, color: "text-primary" },
  { label: "Leads Ganhos", value: "3", change: "+8%", up: true, icon: TrendingUp, color: "text-success" },
  { label: "Leads Perdidos", value: "1", change: "-5%", up: false, icon: TrendingDown, color: "text-destructive" },
  { label: "Tarefas Pendentes", value: mockTasks.filter(t => t.status === "pending").length.toString(), change: "", up: false, icon: CheckSquare, color: "text-accent" },
];

const recentActivities = [
  { text: "Maria Silva entrou em Novos Leads", time: "Há 2 min", type: "lead" },
  { text: "Proposta enviada para Ana Oliveira", time: "Há 15 min", type: "action" },
  { text: "Tarefa concluída: Call com Patricia", time: "Há 1h", type: "task" },
  { text: "Automação executada: Follow-up 48h", time: "Há 2h", type: "automation" },
  { text: "João Santos movido para Qualificação", time: "Há 3h", type: "lead" },
];

export default function DashboardPage() {
  return (
    <AppLayout title="Dashboard" subtitle="Visão geral da operação">
      <div className="p-6 space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-lg p-4 hover:border-border-hover transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-foreground">{s.value}</span>
                {s.change && (
                  <span className={`text-xs font-medium ${s.up ? "text-success" : "text-destructive"}`}>
                    {s.change}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pipeline Summary */}
          <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5">
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
                    <div className="flex-1 bg-secondary rounded-full h-2">
                      <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: col.color }} />
                    </div>
                    <span className="text-sm font-medium text-foreground w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-card border border-border rounded-lg p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Atividades Recentes
            </h2>
            <div className="space-y-3">
              {recentActivities.map((a, i) => (
                <div key={i} className="flex gap-3">
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <div>
                    <p className="text-sm text-foreground">{a.text}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {a.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tasks */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Tarefas Pendentes</h2>
          <div className="space-y-2">
            {mockTasks.filter(t => t.status !== "completed").map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 rounded-md bg-secondary/50 hover:bg-secondary transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${task.status === "overdue" ? "bg-destructive" : "bg-accent"}`} />
                  <span className="text-sm text-foreground">{task.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  {task.status === "overdue" && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/20 text-destructive font-medium">Atrasada</span>
                  )}
                  <span className="text-xs text-muted-foreground">{task.due_date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
