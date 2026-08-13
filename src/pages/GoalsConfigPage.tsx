import { useState } from "react";
import { Plus } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useGoals } from "@/hooks/useGoals";
import { GoalConfigList } from "@/components/goals/GoalConfigList";
import { GoalFormDialog, type GoalFormValues } from "@/components/goals/GoalFormDialog";
import type { Goal } from "@/types";

export default function GoalsConfigPage() {
  const { goals, agentsById, isLoading, createGoal, updateGoal, toggleGoalActive, removeGoal } = useGoals();
  const [formOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null);

  function openCreate() {
    setEditingGoal(null);
    setFormOpen(true);
  }

  function openEdit(goal: Goal) {
    setEditingGoal(goal);
    setFormOpen(true);
  }

  async function handleSubmit(values: GoalFormValues) {
    if (editingGoal) {
      await updateGoal(editingGoal.id, {
        title: values.title, metric: values.metric, target_value: values.target_value,
        period: values.period, column_id: values.column_id,
      }, values.userIds);
    } else {
      await createGoal(values);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await removeGoal(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <AppLayout
      title="Configurar Metas"
      subtitle="Criar, editar e gerenciar as metas da equipe"
      breadcrumbLabel="Configurar"
      actions={
        <Button size="sm" className="gap-1.5 bg-primary hover:bg-[#e04400] text-primary-foreground" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> Nova Meta
        </Button>
      }
    >
      <div className="p-8 max-w-2xl mx-auto animate-fade-in">
        <div className="bg-card border border-border rounded-lg p-5">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <GoalConfigList
              goals={goals}
              agentsById={agentsById}
              onEdit={openEdit}
              onToggleActive={(goal) => toggleGoalActive(goal.id, !goal.is_active)}
              onDelete={setDeleteTarget}
            />
          )}
        </div>
      </div>

      <GoalFormDialog open={formOpen} onOpenChange={setFormOpen} goal={editingGoal} onSubmit={handleSubmit} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover meta "{deleteTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
