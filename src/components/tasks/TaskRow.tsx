import { useNavigate } from "react-router-dom";
import { CheckCircle2, Calendar, User, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import type { Task, Lead } from "@/types";

const priorityColors: Record<string, string> = {
  urgent: "bg-destructive",
  high: "bg-warning",
  medium: "bg-primary",
  low: "bg-muted-foreground/40",
};

const priorityLabels: Record<string, string> = {
  urgent: "Urgente",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

const priorityEmojis: Record<string, string> = {
  urgent: "🔴",
  high: "🟡",
  medium: "🔵",
  low: "🟢",
};

interface TaskRowProps {
  task: Task;
  leads: Lead[];
  showLead?: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdatePriority?: (id: string, priority: Task["priority"]) => void;
}

export function TaskRow({ task, leads, showLead = true, onToggle, onDelete, onUpdatePriority }: TaskRowProps) {
  const navigate = useNavigate();
  const lead = showLead ? leads.find((l) => l.id === task.lead_id) : null;
  const priority = task.priority || "medium";
  const isOverdue = task.status === "overdue";

  const statusBadge = (s: Task["status"]) => {
    if (s === "completed")
      return <Badge variant="outline" className="text-[10px] border-success/40 text-success">Concluída</Badge>;
    if (s === "overdue")
      return <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive">Atrasada</Badge>;
    return <Badge variant="outline" className="text-[10px] border-warning/40 text-warning">Pendente</Badge>;
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  return (
    <div
      className={`grid grid-cols-[4px_auto_1fr_auto_auto_auto] gap-3 items-center pl-0 pr-4 py-3 hover:bg-card-hover transition-all duration-200 group ${
        isOverdue ? "bg-destructive/5 border-l-2 border-l-destructive" : ""
      }`}
    >
      {/* Priority indicator */}
      <div
        className={`w-1 self-stretch rounded-r-full ${priorityColors[priority]}`}
        title={priorityLabels[priority]}
      />

      <Checkbox
        checked={task.status === "completed"}
        onCheckedChange={() => onToggle(task.id)}
        className="h-4 w-4"
      />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium truncate ${task.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>
            {task.title}
          </p>
          {/* Inline priority dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded cursor-pointer hover:ring-1 hover:ring-border transition-all ${
                priority === "urgent" ? "bg-destructive/10 text-destructive" :
                priority === "high" ? "bg-warning/10 text-warning" :
                priority === "medium" ? "bg-primary/10 text-primary" :
                "bg-muted text-muted-foreground"
              }`}>
                {priorityLabels[priority]}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-36">
              <DropdownMenuLabel className="text-[10px] text-muted-foreground">Alterar prioridade</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(["low", "medium", "high", "urgent"] as const).map((p) => (
                <DropdownMenuItem
                  key={p}
                  className={`text-xs gap-2 ${priority === p ? "bg-secondary font-semibold" : ""}`}
                  onClick={() => onUpdatePriority?.(task.id, p)}
                >
                  <span>{priorityEmojis[p]}</span> {priorityLabels[p]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
          <span className={`text-xs flex items-center gap-1 ${isOverdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
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
          <DropdownMenuItem className="text-xs gap-2" onClick={() => onToggle(task.id)}>
            <CheckCircle2 className="h-3 w-3" /> {task.status === "completed" ? "Reabrir" : "Concluir"}
          </DropdownMenuItem>
          <DropdownMenuItem className="text-xs gap-2 text-destructive" onClick={() => onDelete(task.id)}>
            <Trash2 className="h-3 w-3" /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
