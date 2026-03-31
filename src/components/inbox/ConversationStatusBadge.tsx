import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, RotateCcw, Archive } from "lucide-react";

interface ConversationStatusBadgeProps {
  status: string;
}

export function ConversationStatusBadge({ status }: ConversationStatusBadgeProps) {
  const config: Record<string, { label: string; color: string; icon: any }> = {
    open: { label: "Aberto", color: "bg-green-500 hover:bg-green-600", icon: RotateCcw },
    pending: { label: "Pendente", color: "bg-yellow-500 hover:bg-yellow-600 text-black", icon: Clock },
    resolved: { label: "Resolvido", color: "bg-slate-400 hover:bg-slate-500", icon: CheckCircle2 },
    snoozed: { label: "Soneca", color: "bg-blue-400 hover:bg-blue-500", icon: Clock },
    archived: { label: "Arquivado", color: "bg-slate-300 text-slate-700 hover:bg-slate-400", icon: Archive },
    closed: { label: "Fechado", color: "bg-slate-800 hover:bg-slate-900", icon: CheckCircle2 },
  };

  const { label, color, icon: Icon } = config[status] || config.open;

  return (
    <Badge className={`${color} flex items-center gap-1 border-none text-[10px] px-1.5 py-0 h-4`}>
      {Icon && <Icon className="h-2.5 w-2.5" />}
      {label}
    </Badge>
  );
}
