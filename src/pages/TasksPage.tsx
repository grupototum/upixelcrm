import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { mockTasks, mockLeads } from "@/lib/mock-data";
import {
  Plus, CheckCircle2, Circle, Clock, AlertTriangle,
  Search, Calendar, User, MoreHorizontal, Trash2,
  Edit, ListChecks, Users, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Task } from "@/types";

export default function TasksPage() {
  const navigate = useNavigate();
  const [subArea, setSubArea] = useState("mine");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    let tasks = mockTasks;

    // Sub-area filter
    if (subArea === "mine") tasks = tasks.filter((t) => t.assigned_to === "Você");
    if (subArea === "by-lead") tasks = tasks.filter((t) => !!t.lead_id);
    if (subArea === "overdue") tasks = tasks.filter((t) => t.status === "overdue");
    if (subArea === "completed") tasks = tasks.filter((t) => t.status === "completed");

    // Status filter (only on "mine" and "by-lead" tabs)
    if ((subArea === "mine" || subArea === "by-lead") && statusFilter !== "all") {
      tasks = tasks.filter((t) => t.status === statusFilter);
    }

    // Search
    if (search) {
      const q = search.toLowerCase();
      tasks = tasks.filter((t) => t.title.toLowerCase().includes(q));
    }

    // Assignee
    if (assigneeFilter !== "all") {
      tasks = tasks.filter((t) => t.assigned_to === assigneeFilter);
    }

    return tasks;
  }, [subArea, statusFilter, search, assigneeFilter]);

  // Group by lead for "by-lead" tab
  const groupedByLead = useMemo(() => {
    if (subArea !== "by-lead") return null;
    const groups: Record<string, { lead: typeof mockLeads[0]; tasks: typeof filtered }> = {};
    filtered.forEach((t) => {
      if (!t.lead_id) return;
      if (!groups[t.lead_id]) {
        const lead = mockLeads.find((l) => l.id === t.lead_id);
        if (lead) groups[t.lead_id] = { lead, tasks: [] };
      }
      groups[t.lead_id]?.tasks.push(t);
    });
    return Object.values(groups);
  }, [subArea, filtered]);

  const counts = useMemo(() => ({
    mine: mockTasks.filter((t) => t.assigned_to === "Você").length,
    byLead: mockTasks.filter((t) => !!t.lead_id).length,
    overdue: mockTasks.filter((t) => t.status === "overdue").length,
    completed: mockTasks.filter((t) => t.status === "completed").length,
  }), []);

  const statusBadge = (s: Task["status"]) => {
    if (s === "completed")
      return <Badge variant="outline" className="text-[10px] border-success/40 text-success">Concluída</Badge>;
    if (s === "overdue")
      return <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive">Atrasada</Badge>;
    return <Badge variant="outline" className="text-[10px] border-warning/40 text-warning">Pendente</Badge>;
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  const renderTaskRow = (task: Task, showLead = true) => {
    const lead = showLead ? mockLeads.find((l) => l.id === task.lead_id) : null;
    return (
      <div
        key={task.id}
        className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center px-4 py-3 hover:bg-card-hover transition-colors group"
      >
        <Checkbox checked={task.status === "completed"} className="h-4 w-4" />
        <div className="min-w-0">
          <p className={`text-sm font-medium truncate ${task.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>
            {task.title}
          </p>
          {lead && (
            <button
              onClick={() => navigate(`/leads/${lead.id}`)}
              className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1 hover:text-primary transition-colors"
            >
              <User className="h-2.5 w-2.5" /> {lead.name}
              {lead.company && <span className="text-muted-foreground/60">· {lead.company}</span>}
            </button>
          )}
        </div>
        <div className="w-24 flex justify-center">{statusBadge(task.status)}</div>
        <div className="w-24 flex justify-center">
          {task.due_date && (
            <span className={`text-xs flex items-center gap-1 ${task.status === "overdue" ? "text-destructive" : "text-muted-foreground"}`}>
              <Calendar className="h-3 w-3" /> {formatDate(task.due_date)}
            </span>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem className="text-xs gap-2"><Edit className="h-3 w-3" /> Editar</DropdownMenuItem>
            <DropdownMenuItem className="text-xs gap-2"><CheckCircle2 className="h-3 w-3" /> Concluir</DropdownMenuItem>
            <DropdownMenuItem className="text-xs gap-2 text-destructive"><Trash2 className="h-3 w-3" /> Excluir</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  const tableHeader = (
    <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center px-4 py-2.5 bg-secondary/50 border-b border-border">
      <span className="w-5" />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tarefa</span>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-24 text-center">Status</span>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-24 text-center">Prazo</span>
      <span className="w-7" />
    </div>
  );

  const emptyState = (
    <div className="p-12 text-center">
      <CheckCircle2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
      <p className="text-sm text-muted-foreground">Nenhuma tarefa encontrada</p>
    </div>
  );

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
          {[
            { key: "mine", label: "Minhas Tarefas", count: counts.mine, icon: ListChecks },
            { key: "by-lead", label: "Por Lead", count: counts.byLead, icon: Users },
            { key: "overdue", label: "Atrasadas", count: counts.overdue, icon: AlertTriangle },
            { key: "completed", label: "Concluídas", count: counts.completed, icon: CheckCircle2 },
          ].map(({ key, label, count, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setSubArea(key); setStatusFilter("all"); }}
              className={`rounded-lg border p-4 text-left transition-colors ${
                subArea === key
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-border-hover"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {label}
                </p>
                <Icon className={`h-4 w-4 ${subArea === key ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <p className={`text-2xl font-bold ${subArea === key ? "text-primary" : "text-foreground"}`}>
                {count}
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
          {(subArea === "mine" || subArea === "by-lead") && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-9 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todos os status</SelectItem>
                <SelectItem value="pending" className="text-xs">Pendentes</SelectItem>
                <SelectItem value="overdue" className="text-xs">Atrasadas</SelectItem>
                <SelectItem value="completed" className="text-xs">Concluídas</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">
            {filtered.length} tarefa{filtered.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        {/* ─── Task list ─── */}
        {subArea === "by-lead" && groupedByLead ? (
          /* Grouped by lead view */
          groupedByLead.length === 0 ? (
            <div className="bg-card border border-border rounded-lg">{emptyState}</div>
          ) : (
            <div className="space-y-4">
              {groupedByLead.map(({ lead, tasks }) => (
                <div key={lead.id} className="bg-card border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => navigate(`/leads/${lead.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-secondary/50 border-b border-border hover:bg-secondary transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
                      {lead.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-foreground">{lead.name}</p>
                      <p className="text-[10px] text-muted-foreground">{lead.company || "Sem empresa"}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{tasks.length} tarefa{tasks.length !== 1 ? "s" : ""}</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <div className="divide-y divide-border">
                    {tasks.map((t) => renderTaskRow(t, false))}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Flat list view */
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {tableHeader}
            {filtered.length === 0 ? emptyState : (
              <div className="divide-y divide-border">
                {filtered.map((t) => renderTaskRow(t))}
              </div>
            )}
          </div>
        )}

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
