import { UserCheck, Shield } from "lucide-react";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { useLeadContacts } from "@/hooks/useLeadContacts";

const ROLE_LABELS = { decisor: "Decisor", atendente: "Atendente" } as const;

const MAX_VISIBLE = 3;

interface LeadContactIconsProps {
  leadId: string | undefined;
}

export function LeadContactIcons({ leadId }: LeadContactIconsProps) {
  const { contacts } = useLeadContacts(leadId);
  if (!leadId || contacts.length === 0) return null;

  const visible = contacts.slice(0, MAX_VISIBLE);
  const extra = contacts.length - MAX_VISIBLE;

  return (
    <div className="flex items-center gap-1">
      {visible.map((contact) => {
        const Icon = contact.role === "decisor" ? UserCheck : Shield;
        return (
          <Tooltip key={contact.id}>
            <TooltipTrigger asChild>
              <div className="h-5 w-5 rounded-full bg-secondary/60 flex items-center justify-center">
                <Icon className="h-3 w-3 text-muted-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipContent>{contact.name} — {ROLE_LABELS[contact.role]}</TooltipContent>
          </Tooltip>
        );
      })}
      {extra > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <button className="h-5 px-1.5 rounded-full bg-secondary/60 text-[9px] font-bold text-muted-foreground hover:bg-secondary">
              +{extra}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2 space-y-1" align="start">
            {contacts.map((contact) => {
              const Icon = contact.role === "decisor" ? UserCheck : Shield;
              return (
                <div key={contact.id} className="flex items-center gap-2 text-xs py-1">
                  <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="truncate">{contact.name}</span>
                  <span className="text-muted-foreground shrink-0 ml-auto">{ROLE_LABELS[contact.role]}</span>
                </div>
              );
            })}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
