import { Badge } from "@/components/ui/badge";
import { AlertCircle, ArrowUp, ArrowDown, Minus } from "lucide-react";

interface PriorityBadgeProps {
  priority: string;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const config: Record<string, { label: string; color: string; icon: any }> = {
    urgent: { label: "Urgente", color: "bg-red-500 hover:bg-red-600", icon: AlertCircle },
    high: { label: "Alta", color: "bg-orange-500 hover:bg-orange-600", icon: ArrowUp },
    medium: { label: "Média", color: "bg-blue-500 hover:bg-blue-600", icon: Minus },
    low: { label: "Baixa", color: "bg-slate-500 hover:bg-slate-600", icon: ArrowDown },
    none: { label: "Sem prioridade", color: "bg-slate-200 text-slate-700 hover:bg-slate-300", icon: null },
  };

  const { label, color, icon: Icon } = config[priority] || config.none;

  return (
    <Badge className={`${color} flex items-center gap-1 border-none text-[10px] px-1.5 py-0 h-4`}>
      {Icon && <Icon className="h-2.5 w-2.5" />}
      {label}
    </Badge>
  );
}
