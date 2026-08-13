import { PERIOD_LABELS } from "@/lib/goal-period";
import type { GoalProgress } from "@/types";

export function GoalCard({ progress }: { progress: GoalProgress }) {
  const { goal, current_value, percentage } = progress;
  const barColor = percentage >= 100 ? "bg-success" : percentage >= 60 ? "bg-primary" : percentage >= 30 ? "bg-warning" : "bg-destructive";

  return (
    <div className="bg-card rounded-xl ghost-border p-4 flex flex-col gap-2">
      <div className="flex justify-between items-start">
        <h3 className="text-xs font-semibold text-foreground truncate">{goal.title}</h3>
        <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{PERIOD_LABELS[goal.period]}</span>
      </div>
      <div className="text-2xl font-extrabold text-foreground">
        {current_value} <span className="text-sm font-normal text-muted-foreground">/ {goal.target_value}</span>
      </div>
      <div className="bg-muted rounded-full h-2 overflow-hidden">
        <div className={`h-2 rounded-full transition-all duration-700 ease-out ${barColor}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
      </div>
      <span className="text-[11px] text-muted-foreground">{Math.round(percentage)}% concluído</span>
    </div>
  );
}
