import { useState, useRef, useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useVirtualizer } from "@tanstack/react-virtual";
import { MoreHorizontal, Settings, ArrowRight, Download, Upload, Zap, Plus, GripHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SortableLeadCard } from "./SortableLeadCard";
import { useSelection } from "@/contexts/SelectionContext";
import { toast } from "sonner";
import type { Lead, PipelineColumn } from "@/types";

// FIX-23: Only virtualize columns with many leads — columns below this threshold
// render normally so the DnD experience is identical to before for small lists.
const VIRTUALIZATION_THRESHOLD = 20;
// Approximate height of one lead card (px). The virtualizer measures actual heights
// dynamically, so this is only the initial estimate.
const ESTIMATED_CARD_HEIGHT = 108;

interface KanbanColumnProps {
  column: PipelineColumn;
  leads: Lead[];
  allColumns?: PipelineColumn[];
  onLeadClick: (lead: Lead) => void;
  onAddLead: (columnId: string) => void;
  onConfigColumn: (column: PipelineColumn, tab?: string) => void;
  onMoveLead?: (leadId: string, toColumnId: string) => void;
  /** Abrir importação contextualizada nesta coluna (CSV/Excel direto pra cá). */
  onImportLeads?: (columnId: string) => void;
}

export function KanbanColumn({ column, leads, allColumns, onLeadClick, onAddLead, onConfigColumn, onMoveLead, onImportLeads }: KanbanColumnProps) {
  // useDroppable pra leads entrarem na coluna (mantido).
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: column.id, data: { type: "column", columnId: column.id } });

  // useSortable pra reordenar a própria coluna horizontalmente.
  // Sentinela `column:${id}` evita conflito com sortable de leads (que usa só o id puro).
  // Drag dela só ativa via handle (GripHorizontal), pra clique no header continuar
  // abrindo o menu e config sem disparar drag.
  const sortable = useSortable({
    id: `column:${column.id}`,
    data: { type: "column-reorder", columnId: column.id },
  });
  const { selectionMode, isSelected, selectMany, deselectMany } = useSelection();

  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState("");

  const leadIds = useMemo(() => leads.map((l) => l.id), [leads]);
  const selectedInColumn = useMemo(() => leadIds.filter((id) => isSelected(id)).length, [leadIds, isSelected]);
  const allSelected = leads.length > 0 && selectedInColumn === leads.length;
  const someSelected = selectedInColumn > 0 && !allSelected;

  const toggleColumnSelection = () => {
    if (allSelected) deselectMany(leadIds);
    else selectMany(leadIds);
  };

  // Estilo do sortable da coluna (transform/transition vindos do dnd-kit)
  const columnStyle = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.5 : 1,
  };

  // FIX-23: Virtualization with @tanstack/react-virtual.
  // We need both @dnd-kit's droppable ref AND react-virtual's scroll element ref
  // on the same DOM node. Inline callback ref agora (era um helper `setRefs`).
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const shouldVirtualize = leads.length > VIRTUALIZATION_THRESHOLD;

  const rowVirtualizer = useVirtualizer({
    count: shouldVirtualize ? leads.length : 0,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ESTIMATED_CARD_HEIGHT,
    // overscan keeps extra items rendered above and below the viewport so @dnd-kit
    // can find neighbouring items during drag even when they are near the scroll boundary.
    overscan: 5,
  });

  function handleExportCSV() {
    if (leads.length === 0) {
      toast.info("Nenhum lead para exportar nesta coluna");
      return;
    }
    const headers = ["Nome", "Telefone", "Email", "Empresa", "Cargo", "Cidade", "Origem", "Tags", "Valor"];
    const rows = leads.map((l) => [
      l.name,
      l.phone || "",
      l.email || "",
      l.company || "",
      l.position || "",
      l.city || "",
      l.origin || "",
      l.tags.join("; "),
      l.value?.toString() || "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${column.name.toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${leads.length} leads exportados`);
  }

  function handleTransfer() {
    if (!transferTarget || !onMoveLead) return;
    leads.forEach((l) => onMoveLead(l.id, transferTarget));
    setTransferOpen(false);
    setTransferTarget("");
    toast.success(`${leads.length} leads transferidos`);
  }

  const otherColumns = (allColumns || []).filter((c) => c.id !== column.id);

  return (
    <div
      ref={sortable.setNodeRef}
      style={columnStyle}
      {...sortable.attributes}
      className="flex flex-col w-72 shrink-0"
    >
      <div className="flex items-center justify-between mb-3 px-1 group">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Drag handle do header — só essa região inicia o drag da coluna. */}
          {!selectionMode && (
            <button
              {...sortable.listeners}
              className="opacity-30 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground -ml-1"
              aria-label={`Arrastar coluna ${column.name}`}
              title="Arrastar para reordenar"
            >
              <GripHorizontal className="h-3.5 w-3.5" />
            </button>
          )}
          {selectionMode && leads.length > 0 && (
            <Checkbox
              checked={allSelected ? true : someSelected ? "indeterminate" : false}
              onCheckedChange={toggleColumnSelection}
              aria-label={`Selecionar todos os ${leads.length} leads de ${column.name}`}
              className="h-4 w-4"
            />
          )}
          <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: column.color }} />
          <h3 className="text-sm font-semibold text-foreground truncate">{column.name}</h3>
          <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full shrink-0">
            {selectionMode && selectedInColumn > 0 ? `${selectedInColumn}/${leads.length}` : leads.length}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="text-xs gap-2" onClick={() => onConfigColumn(column)}>
              <Settings className="h-3 w-3" /> Editar coluna
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs gap-2" onClick={() => setTransferOpen(true)}>
              <ArrowRight className="h-3 w-3" /> Transferir leads
            </DropdownMenuItem>
            {onImportLeads && (
              <DropdownMenuItem className="text-xs gap-2" onClick={() => onImportLeads(column.id)}>
                <Upload className="h-3 w-3" /> Importar para esta etapa
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="text-xs gap-2" onClick={handleExportCSV}>
              <Download className="h-3 w-3" /> Exportar CSV
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs gap-2" onClick={() => onConfigColumn(column, "automations")}>
              <Zap className="h-3 w-3" /> Automações
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div
        ref={(node) => {
          setDroppableRef(node);
          scrollContainerRef.current = node;
        }}
        className={`overflow-y-auto pb-4 rounded-xl p-1 transition-colors ${isOver ? "bg-primary/5 ring-2 ring-primary/20" : ""}`}
        style={{ height: "calc(100vh - 220px)" }}
      >
        {/* SortableContext always receives ALL lead IDs — not just the visible ones —
            so @dnd-kit knows the complete order even when items are outside the viewport. */}
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {shouldVirtualize ? (
            /* Virtualized path: renders only visible cards as absolutely-positioned items
               inside a tall spacer div. The spacer's height equals the total virtual size. */
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const lead = leads[virtualRow.index];
                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualRow.start}px)`,
                      paddingBottom: "8px",
                    }}
                  >
                    <SortableLeadCard lead={lead} onClick={() => onLeadClick(lead)} />
                  </div>
                );
              })}
            </div>
          ) : (
            /* Non-virtualized path: unchanged rendering for small columns (≤ VIRTUALIZATION_THRESHOLD).
               Preserves the original space-y-2 layout and DnD behaviour exactly. */
            <div className="space-y-2">
              {leads.map((lead) => (
                <SortableLeadCard key={lead.id} lead={lead} onClick={() => onLeadClick(lead)} />
              ))}
            </div>
          )}
        </SortableContext>
        <button
          onClick={() => onAddLead(column.id)}
          className="w-full mt-2 py-2 rounded-xl border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1"
        >
          <Plus className="h-3 w-3" /> Adicionar lead
        </button>
      </div>

      {/* Transfer Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Transferir leads de "{column.name}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <p className="text-xs text-muted-foreground">{leads.length} lead{leads.length !== 1 ? "s" : ""} será(ão) movido(s) para a coluna selecionada.</p>
            <Select value={transferTarget} onValueChange={setTransferTarget}>
              <SelectTrigger className="text-xs"><SelectValue placeholder="Selecione a coluna destino" /></SelectTrigger>
              <SelectContent>
                {otherColumns.map((c) => (
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
          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" onClick={() => setTransferOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleTransfer} disabled={!transferTarget || leads.length === 0}>Transferir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
