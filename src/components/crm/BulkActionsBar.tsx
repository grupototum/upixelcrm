import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRightLeft, Trash2, Tag, X, Loader2, Pencil } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";
import { useCustomFields } from "@/hooks/useCustomFields";
import { listActiveAgents } from "@/services/users";
import * as leadsRepo from "@/services/leads";

// Campos padrão editáveis em massa. "value" é number; os demais são texto
// livre. Mover/Status de pipeline já tem ação própria ("Mover") — não repetido aqui.
const STANDARD_FIELDS: { key: string; label: string; type: "text" | "number" | "agent" }[] = [
  { key: "name", label: "Nome", type: "text" },
  { key: "email", label: "E-mail", type: "text" },
  { key: "phone", label: "Telefone", type: "text" },
  { key: "company", label: "Empresa", type: "text" },
  { key: "position", label: "Cargo", type: "text" },
  { key: "city", label: "Cidade", type: "text" },
  { key: "origin", label: "Origem / Fonte", type: "text" },
  { key: "segmento", label: "Segmento", type: "text" },
  { key: "value", label: "Valor (R$)", type: "number" },
  { key: "responsible_id", label: "Responsável", type: "agent" },
];

/**
 * Barra de ações em massa: aparece fixa no rodapé quando há leads selecionados.
 * Ações: Mover, Excluir, Adicionar Tag, Editar em massa (campo padrão ou
 * customizado — exceto multi_select/checkbox, fora do escopo do V1).
 *
 * Padrão: UI otimista pra Mover (a coluna do lead muda imediatamente, rollback
 * em caso de erro). Excluir e Tag esperam confirmação do servidor antes de
 * remover/atualizar visualmente (mais seguro pra operações destrutivas).
 */
export function BulkActionsBar() {
  const { selectionMode, selectedIds, selectedCount, clearSelection, exitSelectionMode } = useSelection();
  const { pipelines, columns, currentPipelineId, refreshData, addTimelineEvent } = useAppState();
  const { user } = useAuth();
  const { definitions: customFields } = useCustomFields();

  const { data: agents = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["bulk-edit-agents", user?.client_id],
    queryFn: () => (user?.client_id ? listActiveAgents(user.client_id).catch(() => []) : Promise.resolve([])),
    enabled: !!user?.client_id,
    staleTime: 60_000,
  });

  const [editOpen, setEditOpen] = useState(false);
  // "std:<key>" ou "custom:<slug>" — desambigua os dois grupos no mesmo Select.
  const [editFieldId, setEditFieldId] = useState<string>("");
  const [editValue, setEditValue] = useState<string>("");
  const [editing, setEditing] = useState(false);

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

  // multi_select/checkbox ficam fora do V1 do bulk-edit: exigem um editor de
  // valor diferente (lista/toggle) — os demais tipos cobrem o caso comum de
  // "corrigir um campo errado em N leads" que motivou o pedido.
  const editableCustomFields = customFields.filter(
    (f) => !["multi_select", "checkbox"].includes(f.field_type)
  );
  const selectedStandard = STANDARD_FIELDS.find((f) => editFieldId === `std:${f.key}`);
  const selectedCustom = editableCustomFields.find((f) => editFieldId === `custom:${f.slug}`);
  const selectedFieldLabel = selectedStandard?.label ?? selectedCustom?.name ?? "";

  const openEditDialog = () => {
    setEditFieldId("");
    setEditValue("");
    setEditOpen(true);
  };

  const handleFieldChange = (id: string) => {
    setEditFieldId(id);
    setEditValue("");
  };

  const handleBulkEdit = async () => {
    if (!editValue.trim()) return;
    setEditing(true);
    try {
      if (selectedStandard?.type === "agent") {
        await leadsRepo.bulkUpdateLeadStandardField(ids, selectedStandard.key, editValue === "__none__" ? null : editValue);
      } else if (selectedStandard) {
        const value = selectedStandard.type === "number" ? Number(editValue) : editValue.trim();
        await leadsRepo.bulkUpdateLeadStandardField(ids, selectedStandard.key, value);
      } else if (selectedCustom) {
        await leadsRepo.bulkUpdateLeadCustomField(ids, selectedCustom.slug, editValue.trim());
      } else {
        return;
      }

      // Best-effort: 1 evento de timeline por lead. Falha aqui não desfaz a
      // edição em massa (o dado já foi salvo) — só fica sem o rastro.
      const displayValue = selectedStandard?.type === "agent"
        ? (editValue === "__none__" ? "Nenhum" : agents.find((a) => a.id === editValue)?.name ?? editValue)
        : editValue.trim();
      await Promise.allSettled(
        ids.map((leadId) =>
          addTimelineEvent({
            lead_id: leadId,
            type: "note",
            content: `Campo "${selectedFieldLabel}" alterado em massa para "${displayValue}"`,
            user_name: "Edição em massa",
          })
        )
      );

      toast.success(`${ids.length} lead(s) atualizado(s).`);
      setEditOpen(false);
      await refreshData();
      exitSelectionMode();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao editar em massa.";
      toast.error(`Falha: ${msg}`);
    } finally {
      setEditing(false);
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
        <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={openEditDialog}>
          <Pencil className="h-3 w-3" /> Editar em massa
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

      {/* Editar em massa */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Editar {selectedCount} lead(s)</DialogTitle>
            <DialogDescription className="text-xs">
              Escolha o campo e o novo valor. A alteração será aplicada em todos os leads selecionados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Campo a editar</label>
              <Select value={editFieldId} onValueChange={handleFieldChange}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Campo a editar" /></SelectTrigger>
                <SelectContent>
                  {STANDARD_FIELDS.map((f) => (
                    <SelectItem key={f.key} value={`std:${f.key}`} className="text-xs">{f.label}</SelectItem>
                  ))}
                  {editableCustomFields.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground">Campos personalizados</div>
                      {editableCustomFields.map((f) => (
                        <SelectItem key={f.slug} value={`custom:${f.slug}`} className="text-xs">{f.name}</SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {editFieldId && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Novo valor</label>
                {selectedStandard?.type === "agent" ? (
                  <Select value={editValue} onValueChange={setEditValue}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Selecione o responsável" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" className="text-xs">Nenhum</SelectItem>
                      {agents.map((a) => (
                        <SelectItem key={a.id} value={a.id} className="text-xs">{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : selectedCustom && ["select", "radio"].includes(selectedCustom.field_type) ? (
                  <Select value={editValue} onValueChange={setEditValue}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Selecione um valor" /></SelectTrigger>
                    <SelectContent>
                      {selectedCustom.options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    type={
                      selectedStandard?.type === "number" ? "number"
                      : selectedCustom?.field_type === "number" ? "number"
                      : selectedCustom?.field_type === "date" ? "date"
                      : selectedCustom?.field_type === "datetime" ? "datetime-local"
                      : "text"
                    }
                    placeholder="Novo valor"
                    className="text-sm"
                    autoFocus
                  />
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(false)} disabled={editing}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleBulkEdit}
              disabled={!editFieldId || !editValue.trim() || editing}
            >
              {editing ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Salvar alterações
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
