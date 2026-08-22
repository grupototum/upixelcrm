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
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import type { Lead, PipelineColumn, Task } from "@/types";

// FIX-23: Only virtualize columns with many leads — columns below this threshold
// render normally so the DnD experience is identical to before for small lists.
const VIRTUALIZATION_THRESHOLD = 20;
// Altura estimada de um card (px), usada só para os itens ainda não medidos —
// o virtualizer remede cada card conforme entra na viewport.
// Calibrado para o card mínimo real (nome + 1 linha de contato + rodapé de
// avatar + padding + o gap de 8px do wrapper): quase toda linha do card é
// condicional, então o caso comum é bem mais baixo que o caso completo.
// Estimar por cima infla getTotalSize() e deixa um vão morto no fim da coluna
// que só encolhe conforme o usuário rola. Se o card mudar de altura, este é o
// número a recalibrar.
const ESTIMATED_CARD_HEIGHT = 92;

interface KanbanColumnProps {
  column: PipelineColumn;
  leads: Lead[];
  allColumns?: PipelineColumn[];
  onLeadClick: (lead: Lead) => void;
  onAddLead: (columnId: string) => void;
  onConfigColumn: (column: PipelineColumn, tab?: string) => void;
  onMoveLead?: (leadId: string, toColumnId: string) => Promise<boolean> | void;
  /** Abrir importação contextualizada nesta coluna (CSV/Excel direto pra cá). */
  onImportLeads?: (columnId: string) => void;
  /** 2.3: mapa name → cor das etiquetas, resolvido uma vez no board. */
  tagColors?: Record<string, string>;
  /** Slug do campo customizado "Segmento", quando existir (fallback do card). */
  segmentoFieldSlug?: string;
  /** id → usuário responsável, resolvido uma vez no board. */
  usersById?: Record<string, { id: string; name: string; avatar_url?: string | null }>;
  /** lead_id → próxima tarefa pendente, resolvida uma vez no board. */
  nextTaskByLead?: Record<string, Task>;
  /** lead_id → data da última atividade (timeline), resolvida uma vez no board. */
  lastActivityByLead?: Record<string, string>;
  /** lead_id → telefones extras (lead_phones), resolvidos uma vez no board. */
  phonesByLead?: Record<string, Array<{ number: string; category: string }>>;
}

export function KanbanColumn({ column, leads, allColumns, onLeadClick, onAddLead, onConfigColumn, onMoveLead, onImportLeads, tagColors, segmentoFieldSlug, usersById, nextTaskByLead, lastActivityByLead, phonesByLead }: KanbanColumnProps) {
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
  // Editar/reordenar etapa é admin-only na RLS; sem esconder aqui, a ação
  // pareceria funcionar e o banco descartaria a escrita em silêncio.
  const { hasPermission } = usePermissions();
  const canManageColumns = hasPermission("crm.manage_columns");

  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState("");
  const [transferring, setTransferring] = useState(false);

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
    // Chave por lead.id (não índice) — sem isso, reordenar dentro da coluna faz o
    // React reaproveitar nós DOM pela posição, trocando o conteúdo em vez de animar.
    getItemKey: (index) => leads[index].id,
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

  // UI-PATTERNS (docs/UI-PATTERNS.md). Antes: disparava N moves sem await,
  // fechava e anunciava "N leads transferidos" antes de qualquer resposta —
  // com falha parcial o número era mentira. Agora espera todos, relata
  // quantos passaram e só fecha se nenhum falhou.
  async function handleTransfer() {
    if (!transferTarget || !onMoveLead || transferring) return;
    setTransferring(true);
    const target = transferTarget;
    // Sequencial de propósito: cada move dispara automações no AppContext,
    // e o paralelo faria N execuções concorrentes sobre o mesmo estado.
    let moved = 0;
    for (const l of leads) {
      if ((await onMoveLead(l.id, target)) !== false) moved++;
    }
    setTransferring(false);
    if (moved === leads.length) {
      toast.success(`${moved} lead${moved !== 1 ? "s" : ""} transferido${moved !== 1 ? "s" : ""}`);
      setTransferOpen(false);
      setTransferTarget("");
      return;
    }
    // Falha parcial: modal fica aberto para o usuário tentar de novo.
    toast.error(`${moved} de ${leads.length} leads transferidos. Tente novamente.`);
  }

  const otherColumns = (allColumns || []).filter((c) => c.id !== column.id);

  return (
    <div
      ref={sortable.setNodeRef}
      style={columnStyle}
      {...sortable.attributes}
      // self-start tira o stretch do board (que é `flex`, logo
      // align-items:stretch por padrão): a coluna passa a ter a altura dos
      // próprios cards em vez de descer até o fim da tela.
      // max-h-full devolve o teto que o stretch dava — coluna cheia para de
      // crescer na altura do board e a lista interna rola.
      className="flex flex-col w-72 shrink-0 self-start max-h-full"
    >
      <div className="flex items-center justify-between mb-3 px-1 group">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Drag handle do header — só essa região inicia o drag da coluna. */}
          {!selectionMode && canManageColumns && (
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
            {canManageColumns && (
              <DropdownMenuItem className="text-xs gap-2" onClick={() => onConfigColumn(column)}>
                <Settings className="h-3 w-3" /> Editar coluna
              </DropdownMenuItem>
            )}
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
            {canManageColumns && (
              <DropdownMenuItem className="text-xs gap-2" onClick={() => onConfigColumn(column, "automations")}>
                <Zap className="h-3 w-3" /> Automações
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {/* 2.7: descrição da etapa. Truncada numa linha, texto completo no hover.
          Sem descrição, não renderiza nada — nada de espaço reservado. */}
      {column.description && (
        <p className="text-xs text-muted-foreground truncate px-1 -mt-1 mb-1" title={column.description}>
          {column.description}
        </p>
      )}

      <div
        ref={(node) => {
          setDroppableRef(node);
          scrollContainerRef.current = node;
        }}
        // Altura do conteúdo, não da viewport. Antes era `height:
        // calc(100vh - 220px)` (número mágico que errava por 68px), depois
        // `flex-1` — que corrigia a conta mas ainda esticava a coluna até em
        // baixo. Agora a caixa termina no último card: quem limita é o
        // `max-h-full` do wrapper da coluna, e o flex-shrink padrão encolhe
        // esta div quando o conteúdo passa da tela.
        //
        // min-h-[6rem] faz dois papéis, e por isso substitui o min-h-0 antigo
        // em vez de conviver com ele (são a mesma propriedade CSS): permite que
        // o item flex encolha abaixo da altura do conteúdo — sem isso o
        // overflow-y-auto nunca rola — e dá piso à área de drop. Encolher ao
        // conteúdo faz o alvo do dnd-kit encolher junto, e uma etapa vazia
        // viraria um alvo de poucos pixels, impossível de acertar arrastando.
        className={`min-h-[6rem] overflow-y-auto pb-4 rounded-xl p-1 transition-colors ${isOver ? "bg-primary/5 ring-2 ring-primary/20" : ""}`}
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
                    <SortableLeadCard lead={lead} onClick={() => onLeadClick(lead)} tagColors={tagColors} segmentoFieldSlug={segmentoFieldSlug} responsible={lead.responsible_id ? usersById?.[lead.responsible_id] : undefined} nextTask={nextTaskByLead?.[lead.id]} lastActivityAt={lastActivityByLead?.[lead.id]} extraPhones={phonesByLead?.[lead.id]} />
                  </div>
                );
              })}
            </div>
          ) : (
            /* Non-virtualized path: unchanged rendering for small columns (≤ VIRTUALIZATION_THRESHOLD).
               Preserves the original space-y-2 layout and DnD behaviour exactly. */
            <div className="space-y-2">
              {leads.map((lead) => (
                <SortableLeadCard key={lead.id} lead={lead} onClick={() => onLeadClick(lead)} tagColors={tagColors} segmentoFieldSlug={segmentoFieldSlug} responsible={lead.responsible_id ? usersById?.[lead.responsible_id] : undefined} nextTask={nextTaskByLead?.[lead.id]} lastActivityAt={lastActivityByLead?.[lead.id]} extraPhones={phonesByLead?.[lead.id]} />
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
            <Button variant="outline" size="sm" onClick={() => setTransferOpen(false)} disabled={transferring}>Cancelar</Button>
            <Button size="sm" onClick={handleTransfer} disabled={!transferTarget || leads.length === 0 || transferring}>
              {transferring ? "Transferindo..." : "Transferir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
