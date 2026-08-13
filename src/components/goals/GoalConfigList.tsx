import { Pencil, Pause, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { METRIC_LABELS, PERIOD_LABELS } from "@/lib/goal-period";
import type { Goal } from "@/types";

export function GoalConfigList({
  goals, agentsById, onEdit, onToggleActive, onDelete,
}: {
  goals: Goal[];
  agentsById: Record<string, { id: string; name: string }>;
  onEdit: (goal: Goal) => void;
  onToggleActive: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
}) {
  if (goals.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma meta cadastrada ainda.</p>;
  }

  return (
    <div className="space-y-2">
      {goals.map((goal) => {
        const assignedIds = (goal.assignments ?? []).filter((a) => a.user_id).map((a) => a.user_id as string);
        const who = assignedIds.length === 0
          ? "Toda a equipe"
          : assignedIds.map((id) => agentsById[id]?.name ?? "?").join(", ");
        return (
          <div key={goal.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <div className="min-w-0">
              <span className="text-sm font-medium text-foreground">{goal.title}</span>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {METRIC_LABELS[goal.metric]} · {goal.target_value}/{PERIOD_LABELS[goal.period].toLowerCase()} · {who}
                {!goal.is_active && " · pausada"}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(goal)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onToggleActive(goal)}>
                {goal.is_active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(goal)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
