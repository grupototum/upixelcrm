import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { mockTasks, mockLeads } from "@/lib/mock-data";
import {
  Plus, CheckCircle2, Circle, Clock, AlertTriangle,
  Search, Calendar, User, MoreHorizontal, Trash2,
  Edit, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Task } from "@/types";

const STATUS_TABS = [
  { key: "all", label: "Todas" },
  { key: "pending", label: "Pendentes" },
  { key: "overdue", label: "Atrasadas" },
  { key: "completed", label: "Concluídas" },
] as const;

export default function TasksPage() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return mockTasks.filter((t) => {
      if (activeTab !== "all" && t.status !== activeTab) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (assigneeFilter !== "all" && t.assigned_to !== assigneeFilter) return false;
      return true;
    });
  }, [activeTab, search, assigneeFilter]);

  const counts = useMemo(() => ({
    all: mockTasks.length,
    pending: mockTasks.filter((t) => t.status === "pending").length,
    overdue: mockTasks.filter((t) => t.status === "overdue").length,
    completed: mockTasks.filter((t) => t.status === "completed").length,
  }), []);

  const statusIcon = (s: Task["status"]) => {
    if (s === "completed") return <CheckCircle2 className="h-4 w-4 text-success" />;
    if (s === "overdue") return <AlertTriangle className="h-4 w-4 text-destructive" />;
    return <Circle className="h-4 w-4 text-muted-foreground" />;
  };

  const statusBadge = (s: Task["status"]) => {
    if (s === "completed")
      return <Badge variant="outline" className="text-[10px] border-success/40 text-success">Concluída</Badge>;
    if (s === "overdue")
      return <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive">Atrasada</Badge>;
    return <Badge variant="outline" className="text-[10px] border-warning/40 text-warning">Pendente</Badge>;
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  return (
    <AppLayout
      title="Tarefas"
      subtitle="Gerenciamento de tarefas"
      actions={
        <Button size="sm" className="text-xs gap-1 bg-primary hover:bg-primary-hover text-primary-foreground">
          <Plus className="h-3 w-3" /> Nova Tarefa
        </Button>
      }
    >
      <div className="p-6 animate-fade-in space-y-5">
        {/* ─── Summary cards ─── */}
        <div className="grid grid-cols-4 gap-3">
          {STATUS_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`rounded-lg border p-4 text-left transition-colors ${
                activeTab === key
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-border-hover"
              }`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                {label}
              </p>
              <p className={`text-2xl font-bold ${activeTab === key ? "text-primary" : "text-foreground"}`}>
                {counts[key as keyof typeof counts]}
              </p>
            </button>
          ))}
        </div>

        {/* ─── Filters ─── */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar tarefa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-40 h-9 text-xs">
              <User className="h-3 w-3 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Todos</SelectItem>
              <SelectItem value="Você" className="text-xs">Você</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ─── Task list ─── */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center px-4 py-2.5 bg-secondary/50 border-b border-border">
            <span className="w-5" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tarefa</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-24 text-center">Status</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-24 text-center">Prazo</span>
            <span className="w-7" />
          </div>

          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma tarefa encontrada</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((task) => {
                const lead = mockLeads.find((l) => l.id === task.lead_id);
                return (
                  <div
                    key={task.id}
                    className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center px-4 py-3 hover:bg-card-hover transition-colors group"
                  >
                    {/* Checkbox */}
                    <Checkbox
                      checked={task.status === "completed"}
                      className="h-4 w-4"
                    />

                    {/* Title + Lead */}
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${
                          task.status === "completed"
                            ? "line-through text-muted-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {task.title}
                      </p>
                      {lead && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                          <User className="h-2.5 w-2.5" /> {lead.name}
                          {lead.company && <span className="text-muted-foreground/60">· {lead.company}</span>}
                        </p>
                      )}
                    </div>

                    {/* Status badge */}
                    <div className="w-24 flex justify-center">
                      {statusBadge(task.status)}
                    </div>

                    {/* Due date */}
                    <div className="w-24 flex justify-center">
                      {task.due_date && (
                        <span
                          className={`text-xs flex items-center gap-1 ${
                            task.status === "overdue" ? "text-destructive" : "text-muted-foreground"
                          }`}
                        >
                          <Calendar className="h-3 w-3" />
                          {formatDate(task.due_date)}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem className="text-xs gap-2">
                          <Edit className="h-3 w-3" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-xs gap-2 text-destructive">
                          <Trash2 className="h-3 w-3" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── Coming soon ─── */}
        <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
          <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <Clock className="h-4 w-4 text-accent" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-foreground">Recorrência, SLA e automação de tarefas</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Em breve: tarefas recorrentes, regras de SLA e criação automática por automações.
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] border-accent/40 text-accent shrink-0">
            Em breve
          </Badge>
        </div>
      </div>
    </AppLayout>
  );
}
