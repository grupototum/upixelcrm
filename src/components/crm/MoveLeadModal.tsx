import { useState, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAppState } from "@/contexts/AppContext";
import { ArrowRight, ChevronRight } from "lucide-react";

interface MoveLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  currentColumnId?: string;
}

export function MoveLeadModal({ open, onOpenChange, leadId, currentColumnId }: MoveLeadModalProps) {
  const { leads, columns, moveLead } = useAppState();
  const [targetColumnId, setTargetColumnId] = useState(currentColumnId || "");
  const [loading, setLoading] = useState(false);

  const lead = leads.find(l => l.id === leadId);
  const currentColumn = columns.find(c => c.id === currentColumnId);

  const handleMove = useCallback(async () => {
    if (!targetColumnId || targetColumnId === currentColumnId) return;
    setLoading(true);
    try {
      await moveLead(leadId, targetColumnId);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }, [leadId, targetColumnId, currentColumnId, moveLead, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-primary" />
            Mover Estágio
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="p-4 rounded-xl ghost-border bg-secondary/20 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Estágio Atual</p>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: currentColumn?.color || '#ccc' }} />
                <p className="text-sm font-semibold">{currentColumn?.name || 'Não definido'}</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
            <div className="space-y-1 text-right">
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Novo Estágio</p>
              <div className="flex items-center gap-2 justify-end">
                <p className="text-sm font-semibold text-primary">
                  {columns.find(c => c.id === targetColumnId)?.name || 'Selecionar...'}
                </p>
                <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground pl-1">
              Selecione o Próximo Estágio para {lead?.name}
            </Label>
            <Select value={targetColumnId} onValueChange={setTargetColumnId}>
              <SelectTrigger className="rounded-xl ghost-border h-12 text-sm">
                <SelectValue placeholder="Escolher estágio..." />
              </SelectTrigger>
              <SelectContent>
                {columns.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="mt-8">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl text-xs h-11">
            Cancelar
          </Button>
          <Button
            onClick={handleMove}
            disabled={!targetColumnId || targetColumnId === currentColumnId || loading}
            className="rounded-xl text-xs h-11 bg-primary hover:bg-primary-hover px-10 shadow-lg neon-glow"
          >
            {loading ? "Movendo..." : "Confirmar Mudança"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
