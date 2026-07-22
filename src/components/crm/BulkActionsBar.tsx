import { useState } from "react";
import { ArrowRightLeft, Trash2, Tag, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useSelection } from "@/contexts/SelectionContext";
import { useAppState } from "@/contexts/AppContext";
import * as leadsRepo from "@/services/leads";

/**
 * Barra de ações em massa: aparece fixa no rodapé quando há leads selecionados.
 * Implementa 3 ações no MVP: Mover, Excluir, Adicionar Tag.
 *
 * Padrão: UI otimista pra Mover (a coluna do lead muda imediatamente, rollback
 * em caso de erro). Excluir e Tag esperam confirmação do servidor antes de
 * remover/atualizar visualmente (mais seguro pra operações destrutivas).
 */
export function BulkActionsBar() {
  const { selectionMode, selectedIds, selectedCount, clearSelection, exitSelectionMode } = useSelection();
  const { pipelines, columns, currentPipelineId, refreshData } = useAppState();

  const [moveOpen, setMoveOpen] = useState(false);
  // Funil de destino (default = funil atual) + etapa de destino. Como o funil do
  // lead é derivado da coluna, mover pra outro funil = escolher uma coluna de
  // outro funil — a mesma operação de bulkMoveLeads, só muda a coluna de destino.
  const [moveTargetPipeline, setMoveTargetPipeline] = useState<string>("");
  const [moveTarget, setMoveTarget] = useState<string>("");
  const [moving, setMoving] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [tagOpen, setTagOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tagging, setTagging] = useState(false);

  if (!selectionMode || selectedCount === 0) return null;

  const ids = Array.from(selectedIds);
  // Etapas do funil de destino escolhido (ordenadas). Permite mover pra qualquer
  // funil, não só o atual.
  const moveColumns = columns
    .filter((c) => c.pipeline_id === moveTargetPipeline)
    .sort((a, b) => a.order - b.order);

  const openMoveDialog = () => {
    // Abre o diálogo já com o funil atual pré-selecionado e sem etapa escolhida.
    setMoveTargetPipeline(currentPipelineId);
    setMoveTarget("");
    setMoveOpen(true);
  };

  const handleMovePipelineChange = (pid: string) => {
    setMoveTargetPipeline(pid);
    setMoveTarget(""); // as etapas mudam ao trocar de funil
  };

  const handleMove = async () => {
    if (!moveTarget) return;
    setMoving(true);
    try {
      await leadsRepo.bulkMoveLeads(ids, moveTarget);
      const targetCol = columns.find((c) => c.id === moveTarget);
      const targetPipe = pipelines.find((p) => p.id === targetCol?.pipeline_id);
      const targetName = targetCol
        ? `${targetPipe ? `${targetPipe.name} · ` : ""}${targetCol.name}`
        : "outra coluna";
      toast.success(`${ids.length} lead(s) movido(s) para "${targetName}".`);
      setMoveOpen(false);
      setMoveTarget("");
      await refreshData();
      exitSelectionMode();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao mover.";
      toast.error(`Falha: ${msg}`);
    } finally {
      setMoving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await leadsRepo.bulkDeleteLeads(ids);
      toast.success(`${ids.length} lead(s) excluído(s).`);
      setDeleteConfirmOpen(false);
      await refreshData();
      exitSelectionMode();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao excluir.";
      toast.error(`Falha: ${msg}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleAddTag = async () => {
    const tag = tagInput.trim();
    if (!tag) {
      toast.error("Digite o nome da tag.");
      return;
    }
    setTagging(true);
    try {
      const failures = await leadsRepo.bulkAddTag(ids, tag);
      if (failures > 0) {
        toast.error(`Tag aplicada com ${failures} falha(s) de ${ids.length} lead(s). Tente novamente.`);
      } else {
        toast.success(`Tag "${tag}" adicionada a ${ids.length} lead(s).`);
      }
      setTagOpen(false);
      setTagInput("");
      await refreshData();
      exitSelectionMode();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao taggear.";
      toast.error(`Falha: ${msg}`);
    } finally {
      setTagging(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-xl shadow-lg px-4 py-3 flex items-center gap-3 min-w-[480px]">
        <span className="text-sm font-semibold">
          {selectedCount} lead{selectedCount === 1 ? "" : "s"} selecionado{selectedCount === 1 ? "" : "s"}
        </span>
        <div className="h-5 w-px bg-border" />
        <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={openMoveDialog}>
          <ArrowRightLeft className="h-3 w-3" /> Mover
        </Button>
        <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => setTagOpen(true)}>
          <Tag className="h-3 w-3" /> Adicionar tag
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-xs gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setDeleteConfirmOpen(true)}
        >
          <Trash2 className="h-3 w-3" /> Excluir
        </Button>
        <div className="h-5 w-px bg-border" />
        <Button size="sm" variant="ghost" className="text-xs gap-1.5" onClick={clearSelection}>
          Limpar
        </Button>
        <Button size="sm" variant="ghost" className="text-xs gap-1.5" onClick={exitSelectionMode}>
          <X className="h-3 w-3" /> Sair
        </Button>
      </div>

      {/* Mover */}
      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Mover {selectedCount} lead(s)</DialogTitle>
            <DialogDescription className="text-xs">
              Escolha o funil e a etapa de destino. Você pode mover para outro funil.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Funil de destino</label>
              <Select value={moveTargetPipeline} onValueChange={handleMovePipelineChange}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Funil de destino" /></SelectTrigger>
                <SelectContent>
                  {pipelines.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Etapa de destino</label>
              <Select value={moveTarget} onValueChange={setMoveTarget} disabled={!moveTargetPipeline}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Etapa de destino" /></SelectTrigger>
                <SelectContent>
                  {moveColumns.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
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
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setMoveOpen(false)} disabled={moving}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleMove} disabled={!moveTarget || moving}>
              {moving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Mover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tag */}
      <Dialog open={tagOpen} onOpenChange={setTagOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Adicionar tag em {selectedCount} lead(s)</DialogTitle>
            <DialogDescription className="text-xs">
              Tags duplicadas serão ignoradas (não dobra a tag em leads que já têm).
            </DialogDescription>
          </DialogHeader>
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Nome da tag"
            className="text-sm"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setTagOpen(false)} disabled={tagging}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleAddTag} disabled={!tagInput.trim() || tagging}>
              {tagging ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excluir (com confirmação dupla) */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedCount} lead{selectedCount === 1 ? "" : "s"}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é <strong>irreversível</strong>. Os leads serão deletados permanentemente do banco
              junto com suas conversas, tarefas e timeline.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
