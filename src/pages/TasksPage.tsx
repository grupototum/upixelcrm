import { useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAppState } from "@/contexts/AppContext";
import confetti from "canvas-confetti";
import {
  Plus, CheckCircle2, Clock, AlertTriangle,
  Search, Calendar, User, ListChecks, Users, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { TaskProgressHeader } from "@/components/tasks/TaskProgressHeader";
import { TaskRow } from "@/components/tasks/TaskRow";
import type { Task } from "@/types";

export default function TasksPage() {
  const navigate = useNavigate();
  const { tasks, leads, toggleTaskStatus, deleteTask, addTask, updateTask } = useAppState();
  const [subArea, setSubArea] = useState("mine");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newLeadId, setNewLeadId] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newPriority, setNewPriority] = useState<string>("medium");

  const fireConfetti = useCallback(() => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.7 },
      colors: ["#22c55e", "#f59e0b", "#3b82f6", "#ec4899"],
    });
  }, []);

  const handleToggle = useCallback(async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (task && task.status !== "completed") {
      fireConfetti();
    }
    await toggleTaskStatus(id);
  }, [tasks, toggleTaskStatus, fireConfetti]);

  const filtered = useMemo(() => {
    let result = [...tasks];
    if (subArea === "mine") result = result.filter((t) => t.assigned_to === "Você");
    if (subArea === "by-lead") result = result.filter((t) => !!t.lead_id);
    if (subArea === "overdue") result = result.filter((t) => t.status === "overdue");
    if (subArea === "completed") result = result.filter((t) => t.status === "completed");
    if ((subArea === "mine" || subArea === "by-lead") && statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(q));
    }
    return result;
  }, [tasks, subArea, statusFilter, search]);

  const groupedByLead = useMemo(() => {
    if (subArea !== "by-lead") return null;
    const groups: Record<string, { lead: typeof leads[0]; tasks: typeof filtered }> = {};
    filtered.forEach((t) => {
      if (!t.lead_id) return;
      if (!groups[t.lead_id]) {
        const lead = leads.find((l) => l.id === t.lead_id);
        if (lead) groups[t.lead_id] = { lead, tasks: [] };
      }
      groups[t.lead_id]?.tasks.push(t);
    });
    return Object.values(groups);
  }, [subArea, filtered, leads]);

  const counts = useMemo(() => ({
    mine: tasks.filter((t) => t.assigned_to === "Você").length,
    byLead: tasks.filter((t) => !!t.lead_id).length,
    overdue: tasks.filter((t) => t.status === "overdue").length,
    completed: tasks.filter((t) => t.status === "completed").length,
  }), [tasks]);

  const handleCreateTask = useCallback(async () => {
    if (!newTitle.trim()) return;
    await addTask({
      title: newTitle,
      lead_id: newLeadId && newLeadId !== "none" ? newLeadId : undefined,
      due_date: newDueDate || undefined,
      priority: newPriority as Task["priority"],
    });
    setNewTitle("");
    setNewLeadId("");
    setNewDueDate("");
    setNewPriority("medium");
    setShowNewTask(false);
  }, [newTitle, newLeadId, newDueDate, newPriority, addTask]);

  const tableHeader = (
    <div className="grid grid-cols-[4px_auto_1fr_auto_auto_auto] gap-3 items-center pl-0 pr-4 py-2.5 bg-secondary/50 border-b border-border">
      <span className="w-1" />
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
        <Button size="sm" className="text-xs gap-1 bg-primary hover:bg-primary-hover text-primary-foreground" onClick={() => setShowNewTask(true)}>
          <Plus className="h-3 w-3" /> Nova Tarefa
        </Button>
      }
    >
      <div className="p-6 animate-fade-in space-y-5">
        {/* Progress counter */}
        <TaskProgressHeader total={tasks.length} completed={counts.completed} />

        {/* Summary cards */}
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
              className={`rounded-lg border p-4 text-left transition-all duration-200 ${
                subArea === key
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border bg-card hover:border-border-hover hover:shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                <Icon className={`h-4 w-4 ${subArea === key ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <p className={`text-2xl font-bold ${subArea === key ? "text-primary" : "text-foreground"}`}>{count}</p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Buscar tarefa..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-xs" />
          </div>
          {(subArea === "mine" || subArea === "by-lead") && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
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

        {/* Task list */}
        {subArea === "by-lead" && groupedByLead ? (
          groupedByLead.length === 0 ? (
            <div className="bg-card border border-border rounded-lg">{emptyState}</div>
          ) : (
            <div className="space-y-4">
              {groupedByLead.map(({ lead, tasks: groupTasks }) => (
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
                    <Badge variant="outline" className="text-[10px]">{groupTasks.length} tarefa{groupTasks.length !== 1 ? "s" : ""}</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <div className="divide-y divide-border">
                    {groupTasks.map((t) => (
                      <TaskRow key={t.id} task={t} leads={leads} showLead={false} onToggle={handleToggle} onDelete={deleteTask} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {tableHeader}
            {filtered.length === 0 ? emptyState : (
              <div className="divide-y divide-border">
                {filtered.map((t) => (
                  <TaskRow key={t.id} task={t} leads={leads} onToggle={handleToggle} onDelete={deleteTask} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Coming soon */}
        <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
          <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <Clock className="h-4 w-4 text-accent" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-foreground">Recorrência, SLA e automação de tarefas</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Em breve: tarefas recorrentes, regras de SLA e criação automática por automações.</p>
          </div>
          <Badge variant="outline" className="text-[10px] border-accent/40 text-accent shrink-0">Em breve</Badge>
        </div>
      </div>

      {/* New Task Dialog */}
      <Dialog open={showNewTask} onOpenChange={setShowNewTask}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs">Título *</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Descreva a tarefa" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Prioridade</Label>
              <Select value={newPriority} onValueChange={setNewPriority}>
                <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low" className="text-xs">🟢 Baixa</SelectItem>
                  <SelectItem value="medium" className="text-xs">🔵 Média</SelectItem>
                  <SelectItem value="high" className="text-xs">🟡 Alta</SelectItem>
                  <SelectItem value="urgent" className="text-xs">🔴 Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Vincular ao Lead</Label>
              <Select value={newLeadId} onValueChange={setNewLeadId}>
                <SelectTrigger className="mt-1 text-xs"><SelectValue placeholder="Selecionar lead (opcional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs">Nenhum</SelectItem>
                  {leads.map((l) => (
                    <SelectItem key={l.id} value={l.id} className="text-xs">{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Prazo</Label>
              <Input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className="mt-1" />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowNewTask(false)}>Cancelar</Button>
            <Button onClick={handleCreateTask} disabled={!newTitle.trim()}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
