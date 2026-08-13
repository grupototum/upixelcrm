import { useState, useCallback, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Task } from "@/types";

interface CompleteTaskDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (taskId: string, result?: string) => Promise<void>;
}

const MAX_LENGTH = 500;

export function CompleteTaskDialog({ task, open, onOpenChange, onConfirm }: CompleteTaskDialogProps) {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const isEditing = task?.status === "completed";

  useEffect(() => {
    if (open) setResult(task?.result ?? "");
  }, [open, task]);

  const handleConfirm = useCallback(async () => {
    if (!task) return;
    setLoading(true);
    await onConfirm(task.id, result.trim() || undefined);
    setLoading(false);
    onOpenChange(false);
  }, [task, result, onConfirm, onOpenChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleConfirm();
    }
  }, [handleConfirm]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar resultado" : "Concluir tarefa"}</DialogTitle>
        </DialogHeader>
        {task && <p className="text-sm font-medium text-foreground">{task.title}</p>}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">O que aconteceu? (opcional)</label>
          <Textarea
            autoFocus
            value={result}
            onChange={(e) => setResult(e.target.value.slice(0, MAX_LENGTH))}
            placeholder="Ex: Cliente pediu para ligar amanhã..."
            className="min-h-[80px] resize-none text-sm"
            maxLength={MAX_LENGTH}
          />
          <p className="text-xs text-muted-foreground text-right">{result.length}/{MAX_LENGTH}</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {isEditing ? "Salvar" : "Concluir tarefa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
