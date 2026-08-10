import { useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SnoozePopoverProps {
  onSnooze: (until: Date) => void | Promise<void>;
  /** Renderiza o gatilho apenas como ícone + tooltip (uso inline no header). */
  iconOnly?: boolean;
}

function addHours(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function nextBusinessMorning(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
}

function nextMonday(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = (8 - day) % 7 || 7;
  d.setDate(d.getDate() + diff);
  d.setHours(9, 0, 0, 0);
  return d;
}

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SnoozePopover({ onSnooze, iconOnly = false }: SnoozePopoverProps) {
  const [open, setOpen] = useState(false);
  const [customValue, setCustomValue] = useState(toLocalInputValue(addHours(24)));

  const apply = async (until: Date) => {
    setOpen(false);
    await onSnooze(until);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {iconOnly ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Adiar"
                className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <Clock className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Adiar</TooltipContent>
        </Tooltip>
      ) : (
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs h-9 gap-2 font-semibold"
          >
            <Clock className="h-3.5 w-3.5" /> Adiar
          </Button>
        </PopoverTrigger>
      )}
      <PopoverContent align="end" className="w-64 p-2">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">
            Adiar até
          </p>
          <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8" onClick={() => apply(addHours(1))}>
            Em 1 hora
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8" onClick={() => apply(addHours(3))}>
            Em 3 horas
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8" onClick={() => apply(nextBusinessMorning())}>
            Amanhã de manhã (9h)
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8" onClick={() => apply(addHours(24 * 7))}>
            Em 7 dias
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8" onClick={() => apply(nextMonday())}>
            Próxima segunda (9h)
          </Button>
          <div className="border-t my-2" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">
            Personalizado
          </p>
          <div className="flex gap-1.5 px-1">
            <Input
              type="datetime-local"
              value={customValue}
              min={toLocalInputValue(new Date())}
              onChange={e => setCustomValue(e.target.value)}
              className="h-8 text-xs"
            />
            <Button
              size="sm"
              className="h-8 text-xs px-3"
              onClick={() => {
                const d = new Date(customValue);
                if (Number.isNaN(d.getTime()) || d.getTime() <= Date.now()) return;
                apply(d);
              }}
            >
              OK
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
