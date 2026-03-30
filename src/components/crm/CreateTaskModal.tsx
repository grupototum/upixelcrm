import { useState, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAppState } from "@/contexts/AppContext";
import type { Task } from "@/types";

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultLeadId?: string;
}

export function CreateTaskModal({ open, onOpenChange, defaultLeadId }: CreateTaskModalProps) {
  const { leads, addTask } = useAppState();
  const [title, setTitle] = useState("");
  const [leadId, setLeadId] = useState(defaultLeadId || "none");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<string>("medium");
  const [loading, setLoading] = useState(false);

  const handleCreate = useCallback(async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      await addTask({
        title,
        lead_id: leadId && leadId !== "none" ? leadId : undefined,
        due_date: dueDate || undefined,
        priority: priority as Task["priority"],
      });
      setTitle("");
      setLeadId(defaultLeadId || "none");
      setDueDate("");
      setPriority("medium");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }, [title, leadId, dueDate, priority, addTask, onOpenChange, defaultLeadId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground pl-1">
              Título da Tarefa
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Retornar ligação, Enviar proposta..."
              className="rounded-xl ghost-border h-11 text-sm"
              autoFocus
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground pl-1">
                Prioridade
              </Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="rounded-xl ghost-border h-11 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low" className="text-xs">🟢 Baixa</SelectItem>
                  <SelectItem value="medium" className="text-xs">🔵 Média</SelectItem>
                  <SelectItem value="high" className="text-xs">🟡 Alta</SelectItem>
                  <SelectItem value="urgent" className="text-xs">🔴 Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground pl-1">
                Prazo
              </Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="rounded-xl ghost-border h-11 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground pl-1">
              Vincular ao Lead
            </Label>
            <Select value={leadId} onValueChange={setLeadId} disabled={!!defaultLeadId}>
              <SelectTrigger className="rounded-xl ghost-border h-11 text-xs">
                <SelectValue placeholder="Selecionar lead (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-xs">Nenhum</SelectItem>
                {leads.map((l) => (
                  <SelectItem key={l.id} value={l.id} className="text-xs">
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="mt-6">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl text-xs h-10">
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!title.trim() || loading}
            className="rounded-xl text-xs h-10 bg-primary hover:bg-primary-hover px-6"
          >
            {loading ? "Criando..." : "Criar Tarefa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
