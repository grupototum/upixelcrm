import { CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface TaskProgressHeaderProps {
  total: number;
  completed: number;
}

export function TaskProgressHeader({ total, completed }: TaskProgressHeaderProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="flex items-center gap-3 bg-card ghost-border rounded-xl px-4 py-3">
      <div className="h-9 w-9 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
        <CheckCircle2 className="h-4 w-4 text-success" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold text-foreground">
            {completed} de {total} tarefas concluídas
          </p>
          <span className="text-[10px] font-bold text-primary">{percentage}%</span>
        </div>
        <Progress value={percentage} className="h-1.5 bg-secondary" />
      </div>
    </div>
  );
}
