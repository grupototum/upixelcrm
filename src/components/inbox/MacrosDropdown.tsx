import { Zap, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMacros } from "@/hooks/useMacros";
import { useConversationLabels } from "@/hooks/useConversationLabels";

interface MacrosDropdownProps {
  leadId: string;
  conversationId?: string;
  currentLabels: { id: string; name: string; color: string }[];
  sendMessage: (text: string) => Promise<void> | void;
  updateStatus: (leadId: string, status: string) => Promise<void> | void;
  updateLabels: (leadId: string, labels: { id: string; name: string; color: string }[]) => Promise<void> | void;
  assignToAgent: (leadId: string, userId: string | null) => Promise<void> | void;
}

export function MacrosDropdown({
  leadId,
  conversationId,
  currentLabels,
  sendMessage,
  updateStatus,
  updateLabels,
  assignToAgent,
}: MacrosDropdownProps) {
  const { macros, executeMacro } = useMacros();
  const { labels } = useConversationLabels();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[10px] font-bold gap-1.5 hover:bg-accent/10 hover:text-accent transition-colors rounded-lg"
        >
          <Zap className="h-3 w-3" /> Macros
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
          Macros
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {macros.length === 0 ? (
          <div className="px-2 py-3 text-[11px] text-muted-foreground">
            Nenhuma macro cadastrada.
          </div>
        ) : (
          macros.map(macro => (
            <DropdownMenuItem
              key={macro.id}
              onSelect={() =>
                executeMacro(macro.id, {
                  leadId,
                  conversationId,
                  sendMessage,
                  updateStatus,
                  updateLabels,
                  assignToAgent,
                  currentLabels,
                  availableLabels: labels.map(l => ({ id: l.id, name: l.name, color: l.color })),
                })
              }
              className="flex items-center gap-2 text-xs cursor-pointer"
            >
              <Play className="h-3 w-3 text-accent" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{macro.name}</p>
                {macro.description && (
                  <p className="text-[10px] text-muted-foreground truncate">{macro.description}</p>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground">{macro.actions.length} ações</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
