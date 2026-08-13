import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useGoalsProgress } from "@/hooks/useGoalsProgress";
import { useAppState } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { listActiveAgents } from "@/services/users";
import { METRIC_LABELS, PERIOD_LABELS } from "@/lib/goal-period";
import type { Goal, GoalMetric, GoalPeriod } from "@/types";

const NONE = "__none";

export function GoalsSettings() {
  const { goals, isLoading, createGoal, updateGoal, removeGoal } = useGoalsProgress();
  const { columns } = useAppState();
  const { user } = useAuth();
  const { data: agents = [] } = useQuery({
    queryKey: ["goals-settings-agents", user?.client_id],
    queryFn: () => listActiveAgents(user!.client_id).catch(() => []),
    enabled: !!user?.client_id,
    staleTime: 60_000,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [title, setTitle] = useState("");
  const [metric, setMetric] = useState<GoalMetric>("leads_created");
  const [targetValue, setTargetValue] = useState("");
  const [period, setPeriod] = useState<GoalPeriod>("monthly");
  const [assignedTo, setAssignedTo] = useState(NONE);
  const [columnId, setColumnId] = useState(NONE);
  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditingGoal(null);
    setTitle(""); setMetric("leads_created"); setTargetValue(""); setPeriod("monthly");
    setAssignedTo(NONE); setColumnId(NONE);
    setModalOpen(true);
  }

  function openEdit(goal: Goal) {
    setEditingGoal(goal);
    setTitle(goal.title);
    setMetric(goal.metric);
    setTargetValue(String(goal.target_value));
    setPeriod(goal.period);
    setAssignedTo(goal.assigned_to || NONE);
    setColumnId(goal.column_id || NONE);
    setModalOpen(true);
  }

  async function handleSave() {
    const value = parseInt(targetValue, 10);
    if (!title.trim() || !value || value <= 0) return;
    setSaving(true);
    const data = {
      title: title.trim(), metric, target_value: value, period,
      assigned_to: assignedTo === NONE ? undefined : assignedTo,
      column_id: metric === "leads_closed" && columnId !== NONE ? columnId : undefined,
    };
    if (editingGoal) {
      await updateGoal(editingGoal.id, data);
    } else {
      await createGoal(data);
    }
    setSaving(false);
    setModalOpen(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await removeGoal(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <div className="px-4">
      <Card className="rounded-card ghost-border bg-card shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold">Metas da Equipe</CardTitle>
            <CardDescription className="text-xs">Metas de performance visíveis no dashboard, por usuário ou para toda a equipe.</CardDescription>
          </div>
          <Button size="sm" className="gap-2 bg-primary hover:bg-[#e04400] text-white" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" /> Nova meta
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : goals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma meta cadastrada ainda.</p>
          ) : (
            <div className="space-y-2">
              {goals.map((goal) => {
                const assignee = agents.find((a) => a.id === goal.assigned_to);
                return (
                  <div key={goal.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <span className="text-sm font-medium text-foreground">{goal.title}</span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {METRIC_LABELS[goal.metric]} · {goal.target_value}/{PERIOD_LABELS[goal.period].toLowerCase()} · {assignee ? assignee.name : "Toda a equipe"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(goal)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(goal)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingGoal ? "Editar meta" : "Nova meta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Nome da meta</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Leads do mês" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Métrica</Label>
              <Select value={metric} onValueChange={(v) => setMetric(v as GoalMetric)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(METRIC_LABELS) as GoalMetric[]).map((key) => (
                    <SelectItem key={key} value={key}>{METRIC_LABELS[key]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {metric === "leads_closed" && (
              <div className="space-y-1">
                <Label className="text-xs">Etapa de fechamento</Label>
                <Select value={columnId} onValueChange={setColumnId}>
                  <SelectTrigger><SelectValue placeholder="Selecione a etapa" /></SelectTrigger>
                  <SelectContent>
                    {columns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Valor-alvo</Label>
              <Input type="number" min={1} value={targetValue} onChange={(e) => setTargetValue(e.target.value)} placeholder="20" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Período</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as GoalPeriod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Para quem</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Toda a equipe</SelectItem>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !title.trim() || !targetValue}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover meta "{deleteTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
