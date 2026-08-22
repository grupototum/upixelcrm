import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAppState } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTags } from "@/hooks/useTags";
import { useCustomFields } from "@/hooks/useCustomFields";
import { useDragScroll } from "@/hooks/useDragScroll";
import { listActiveAgents } from "@/services/users";
import { listLeadPhonesByClient, type BoardLeadPhone } from "@/services/leadPhones";
import { SelectionProvider, useSelection } from "@/contexts/SelectionContext";
import { BulkActionsBar } from "@/components/crm/BulkActionsBar";
import { Plus, Search, X, ChevronDown, LayoutGrid, Upload, CheckSquare, Copy } from "lucide-react";
import { useDuplicateDetection } from "@/hooks/useDuplicateDetection";
import { ImportLeadsDialog } from "@/components/import/ImportLeadsDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Trash2, AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import type { Lead, PipelineColumn } from "@/types";

import { KanbanColumn } from "@/components/crm/KanbanColumn";
import { DragOverlayCard } from "@/components/crm/SortableLeadCard";
import { LeadFormModal } from "@/components/crm/LeadFormModal";
import { LeadDetail, LeadDetailActions } from "@/components/crm/LeadDetail";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { KanbanSkeleton } from "@/components/crm/KanbanSkeleton";
import { ColumnConfigModal } from "@/components/crm/ColumnConfigModal";
import { FilterPopover, EMPTY_FILTERS, type CRMFilters } from "@/components/crm/FilterPopover";
import { SavedViewsMenu } from "@/components/crm/SavedViewsMenu";
import { ColumnVisibilityPopover } from "@/components/crm/ColumnVisibilityPopover";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Wrapper externo só pra providar o SelectionContext. A page real é CRMPageInner.
// Mantém escopo do provider restrito ao CRM (sai do CRM = clearSelection automático).
export default function CRMPage() {
  return (
    <SelectionProvider>
      <CRMPageInner />
      <BulkActionsBar />
    </SelectionProvider>
  );
}

/**
 * Botão "Selecionar" no header — ativa o modo de seleção múltipla.
 * Quando ativo, exibe checkbox + opção de selecionar todos os leads visíveis (respeita filtros).
 * Vive dentro do SelectionProvider, então usa useSelection() direto.
 */
function SelectionToggleButton({ visibleLeads }: { visibleLeads: Lead[] }) {
  const { selectionMode, toggleSelectionMode, selectAll, selectedCount } = useSelection();
  const allVisibleIds = visibleLeads.map((l) => l.id);

  if (!selectionMode) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="text-xs gap-1.5 h-8"
        onClick={toggleSelectionMode}
        title="Selecionar múltiplos leads para ações em massa"
      >
        <CheckSquare className="h-3.5 w-3.5" /> Selecionar
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        className="text-xs gap-1.5 h-8"
        onClick={() => selectAll(allVisibleIds)}
        disabled={allVisibleIds.length === 0}
        title={`Selecionar ${allVisibleIds.length} leads visíveis (respeita filtros)`}
      >
        <CheckSquare className="h-3.5 w-3.5" /> Todos visíveis ({allVisibleIds.length})
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="text-xs gap-1.5 h-8 text-muted-foreground"
        onClick={toggleSelectionMode}
      >
        <X className="h-3.5 w-3.5" /> Cancelar
      </Button>
      {selectedCount > 0 && (
        <span className="text-xs font-bold text-primary">
          {selectedCount}
        </span>
      )}
    </div>
  );
}

/**
 * Botão "Duplicatas" com badge de contagem — só aparece quando há grupos
 * com score >= 60% (alta/média confiança; o scan atual não produz score
 * abaixo disso). Reusa useDuplicateDetection, que já opera sobre os leads
 * em memória do AppContext — sem query extra, scan é computação local.
 */
function DuplicatesButton() {
  const navigate = useNavigate();
  const { leads } = useAppState();
  const { scan, totalDuplicates } = useDuplicateDetection();

  useEffect(() => { scan(); }, [scan, leads.length]);

  if (totalDuplicates === 0) return null;

  return (
    <Button
      size="sm"
      variant="outline"
      className="text-xs gap-1.5 h-8 text-muted-foreground"
      onClick={() => navigate("/duplicates")}
      title="Ver sugestões de leads duplicados"
    >
      <Copy className="h-3.5 w-3.5" /> Duplicatas · {totalDuplicates}
    </Button>
  );
}

function CRMPageInner() {
  const navigate = useNavigate();
  const {
    leads, pipelines, columns, currentPipelineId, leadCountByPipeline, loading, tasks, timeline,
    setPipeline, addPipeline, updatePipeline, deletePipeline, addColumn, reorderColumns,
    addLead, updateLead, deleteLead, moveLead
  } = useAppState();

  // 2.3: resolvido uma vez aqui e passado pros cards — useTags dentro do
  // SortableLeadCard dispararia um fetch por lead.
  // 2.4: pan horizontal ao arrastar a área vazia do board.
  const boardRef = useRef<HTMLDivElement>(null);
  useDragScroll(boardRef);

  const { tags: tagMetas } = useTags();
  const tagColors = useMemo(
    () => Object.fromEntries(tagMetas.map((t) => [t.name, t.color])),
    [tagMetas]
  );

  // Fallback do card: alguns tenants guardam "Segmento" como campo
  // personalizado em vez da coluna nativa leads.segmento — o card cai pro
  // campo customizado de mesmo nome quando a coluna nativa vem vazia.
  const { definitions: customFieldDefs } = useCustomFields();
  const segmentoFieldSlug = useMemo(
    () => customFieldDefs.find((d) => d.name.trim().toLowerCase() === "segmento")?.slug,
    [customFieldDefs]
  );

  // Redesign do card (2.8): responsável, próxima tarefa e última atividade
  // resolvidos uma vez aqui a partir do que já está carregado no contexto —
  // evita 1 fetch por card.
  const { user } = useAuth();
  const { data: agents = [] } = useQuery({
    queryKey: ["crm-board-agents", user?.client_id],
    queryFn: () => listActiveAgents(user!.client_id).catch(() => []),
    enabled: !!user?.client_id,
    staleTime: 60_000,
  });
  const usersById = useMemo(
    () => Object.fromEntries(agents.map((a) => [a.id, a])),
    [agents]
  );
  const nextTaskByLead = useMemo(() => {
    const pending = tasks.filter((t) => t.status !== "completed" && t.lead_id && t.due_date);
    pending.sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
    const map: Record<string, typeof tasks[number]> = {};
    for (const t of pending) {
      if (!map[t.lead_id!]) map[t.lead_id!] = t;
    }
    return map;
  }, [tasks]);
  const lastActivityByLead = useMemo(() => {
    const map: Record<string, string> = {};
    for (const ev of timeline) {
      if (!ev.lead_id) continue;
      if (!map[ev.lead_id] || ev.created_at > map[ev.lead_id]) map[ev.lead_id] = ev.created_at;
    }
    return map;
  }, [timeline]);

  // Telefones extras em lote — o botão de WhatsApp do card prioriza o número
  // de categoria "whatsapp" sobre lead.phone. Até a query chegar, o card cai
  // no fallback lead.phone (nada bloqueia o render do board).
  const { data: boardPhones = [] } = useQuery({
    queryKey: ["board-lead-phones", user?.client_id],
    queryFn: () => listLeadPhonesByClient().catch(() => [] as BoardLeadPhone[]),
    enabled: !!user?.client_id,
    staleTime: 60_000,
  });
  const phonesByLead = useMemo(() => {
    const map: Record<string, BoardLeadPhone[]> = {};
    for (const p of boardPhones) {
      (map[p.lead_id] ??= []).push(p);
    }
    return map;
  }, [boardPhones]);

  const [searchParams, setSearchParams] = useSearchParams();

  // Abre o board diretamente no funil indicado pela query (?pipeline=<id>).
  // Usado pós-importação ("Ver no CRM") pra o usuário cair JÁ no funil onde os
  // leads foram importados. Espera os funis carregarem antes de consumir o param
  // (senão a validação falharia e o param seria perdido antes da carga).
  useEffect(() => {
    const target = searchParams.get("pipeline");
    if (!target || pipelines.length === 0) return;
    if (pipelines.some((p) => p.id === target)) setPipeline(target);
    const next = new URLSearchParams(searchParams);
    next.delete("pipeline");
    setSearchParams(next, { replace: true });
  }, [searchParams, pipelines, setPipeline, setSearchParams]);

  // Detalhe do lead abre num Sheet lateral, com o id vivendo em ?lead=<id>.
  // Fonte da verdade é a URL, não useState: assim voltar/avançar do browser
  // abre e fecha o painel, e o board atrás não remonta a cada abertura.
  const selectedLeadId = searchParams.get("lead");
  const selectedLead = useMemo(
    () => leads.find((l) => l.id === selectedLeadId),
    [leads, selectedLeadId]
  );

  const openLeadSheet = useCallback((leadId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("lead", leadId);
    // Entrada no histórico (sem replace) — o "voltar" do browser fecha o painel.
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  const closeLeadSheet = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete("lead");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showNewPipeline, setShowNewPipeline] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState("");
  const [showNewColumn, setShowNewColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [formColumnId, setFormColumnId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [pipelineToDelete, setPipelineToDelete] = useState<string | null>(null);
  const [activeDragLead, setActiveDragLead] = useState<Lead | null>(null);
  const [configColumn, setConfigColumn] = useState<PipelineColumn | null>(null);
  const [configColumnTab, setConfigColumnTab] = useState<string>("general");
  const [crmFilters, setCrmFilters] = useState<CRMFilters>(EMPTY_FILTERS);
  const [hiddenColumnIds, setHiddenColumnIds] = useState<string[]>([]);
  const [editingPipelineId, setEditingPipelineId] = useState<string | null>(null);
  const [editingPipelineName, setEditingPipelineName] = useState("");
  // Importação contextualizada — quando aberta sem columnId, o usuário escolhe.
  // Quando aberta com columnId (via menu da coluna), o destino fica travado.
  const [importDialog, setImportDialog] = useState<{ open: boolean; columnId?: string }>({ open: false });

  const currentPipeline = useMemo(() =>
    pipelines.find(p => p.id === currentPipelineId) || pipelines[0]
  , [pipelines, currentPipelineId]);

  const totalLeads = leads.length;
  const currentPipelineLeadCount = currentPipelineId ? leadCountByPipeline[currentPipelineId] ?? 0 : 0;

  const pipelineColumns = useMemo(() => 
    columns.filter(c => c.pipeline_id === currentPipelineId).sort((a, b) => a.order - b.order)
  , [columns, currentPipelineId]);


  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    leads.forEach((l) => l.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [leads]);

  const filteredLeads = useMemo(() => {
    let result = leads;

    // Primary Category Filter - Only Leads
    result = result.filter(l => (l.category || "lead") === "lead");

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.company?.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q) ||
          l.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Origin filter
    if (crmFilters.origins.length > 0) {
      result = result.filter((l) => l.origin && crmFilters.origins.includes(l.origin));
    }

    // Tags filter
    if (crmFilters.tags.length > 0) {
      result = result.filter((l) => l.tags.some((t) => crmFilters.tags.includes(t)));
    }

    // Value range filter
    if (crmFilters.minValue) {
      const min = parseFloat(crmFilters.minValue);
      result = result.filter((l) => (l.value ?? 0) >= min);
    }
    if (crmFilters.maxValue) {
      const max = parseFloat(crmFilters.maxValue);
      result = result.filter((l) => (l.value ?? 0) <= max);
    }

    // Status filter (campos extras ainda não presentes no tipo Lead)
    if (crmFilters.status.length > 0) {
      result = result.filter((l) => {
        const status = (l as Lead & { status?: string }).status;
        return status && crmFilters.status.includes(status);
      });
    }

    // Priority filter (campos extras ainda não presentes no tipo Lead)
    if (crmFilters.priority.length > 0) {
      result = result.filter((l) => {
        const priority = (l as Lead & { priority?: string }).priority;
        return priority && crmFilters.priority.includes(priority);
      });
    }

    // Date range filter
    if (crmFilters.dateRange) {
      const now = new Date();
      const days = crmFilters.dateRange === "7d" ? 7 : crmFilters.dateRange === "30d" ? 30 : 90;
      const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      result = result.filter((l) => {
        const leadDate = new Date(l.created_at || 0);
        return leadDate >= cutoffDate;
      });
    }

    // Custom fields filter
    const cfEntries = Object.entries(crmFilters.customFields ?? {}).filter(([, v]) => v.trim());
    if (cfEntries.length > 0) {
      result = result.filter((l) =>
        cfEntries.every(([slug, val]) =>
          String((l.custom_fields as Record<string, unknown>)?.[slug] ?? "")
            .toLowerCase()
            .includes(val.toLowerCase())
        )
      );
    }

    return result;
  }, [leads, searchQuery, crmFilters]);

  function handleDragStart(event: DragStartEvent) {
    const lead = leads.find((l) => l.id === event.active.id);
    if (lead) setActiveDragLead(lead);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    // Drag de COLUNA: ignora handleDragOver (reordenação só finaliza no handleDragEnd)
    if (active.data.current?.type === "column-reorder") return;

    const activeLeadId = active.id as string;
    const overId = over.id as string;

    const overColumn = pipelineColumns.find((c) => c.id === overId);
    const overLead = leads.find((l) => l.id === overId);
    const targetColumnId = overColumn?.id ?? overLead?.column_id;

    if (!targetColumnId) return;

    const activeLead = leads.find((l) => l.id === activeLeadId);
    if (!activeLead || activeLead.column_id === targetColumnId) return;

    moveLead(activeLeadId, targetColumnId);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDragLead(null);
    const { active, over } = event;
    if (!over) return;

    // Drag de COLUNA: persiste nova ordem se posição mudou
    if (active.data.current?.type === "column-reorder" && over.data.current?.type === "column-reorder") {
      const activeColumnId = active.data.current.columnId as string;
      const overColumnId = over.data.current.columnId as string;
      if (activeColumnId === overColumnId) return;

      const currentOrder = pipelineColumns.map((c) => c.id);
      const oldIdx = currentOrder.indexOf(activeColumnId);
      const newIdx = currentOrder.indexOf(overColumnId);
      if (oldIdx === -1 || newIdx === -1) return;

      const reordered = arrayMove(currentOrder, oldIdx, newIdx);
      await reorderColumns(reordered);
    }
  }

  function handleAddLead(columnId: string) {
    setEditingLead(null);
    setFormColumnId(columnId);
    setShowForm(true);
  }

  function handleEditLead(lead: Lead) {
    setEditingLead(lead);
    setFormColumnId(lead.column_id);
    setShowForm(true);
  }

  // UI-PATTERNS (docs/UI-PATTERNS.md): erro mantém o modal aberto com os
  // dados digitados; quem mostra o toast de erro é o AppContext.
  async function handleSaveLead(data: Partial<Lead>): Promise<boolean> {
    const ok = editingLead
      ? await updateLead(editingLead.id, data)
      : (await addLead(data, formColumnId || pipelineColumns[0]?.id || "")) !== null;
    if (!ok) return false;
    setShowForm(false);
    setEditingLead(null);
    return true;
  }

  const handleCreatePipeline = async () => {
    if (newPipelineName.trim()) {
      await addPipeline(newPipelineName.trim());
      setNewPipelineName("");
      setShowNewPipeline(false);
    }
  };

  const handleCreateColumn = async () => {
    if (newColumnName.trim()) {
      await addColumn(newColumnName.trim(), "#3b82f6");
      setNewColumnName("");
      setShowNewColumn(false);
    }
  };

  const handleDeletePipeline = async () => {
    if (pipelineToDelete) {
      await deletePipeline(pipelineToDelete);
      setPipelineToDelete(null);
    }
  };

  const handleEditPipeline = (pipeline: typeof pipelines[0]) => {
    setEditingPipelineId(pipeline.id);
    setEditingPipelineName(pipeline.name);
  };

  const handleSavePipelineName = async () => {
    if (editingPipelineId && editingPipelineName.trim()) {
      await updatePipeline(editingPipelineId, { name: editingPipelineName.trim() });
      setEditingPipelineId(null);
      setEditingPipelineName("");
    }
  };

  return (
    <AppLayout
      title="Funil de Vendas"
      subtitle={
        <div className="flex flex-col gap-4 mt-1">
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card hover:bg-card transition-all border border-[hsl(var(--border-strong))] group">
                  <LayoutGrid className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    {currentPipeline?.name || "Selecionar Funil"}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-primary/10 text-primary tabular-nums">
                    {currentPipelineLeadCount.toLocaleString("pt-BR")}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-transform duration-200" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72 rounded-card shadow-2xl border-none p-1.5 bg-card">
                <div className="px-2 py-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Seus Funis
                  </span>
                  <span className="text-[10px] font-black text-foreground tabular-nums">
                    {totalLeads.toLocaleString("pt-BR")} leads
                  </span>
                </div>
                {pipelines.map((p) => {
                  const count = leadCountByPipeline[p.id] ?? 0;
                  return (
                  <div key={p.id} className="group flex items-center pr-2 gap-1">
                    <DropdownMenuItem
                      onClick={() => setPipeline(p.id)}
                      className={`flex-1 rounded-xl text-xs h-9 gap-3 cursor-pointer ${currentPipelineId === p.id ? "bg-primary/10 text-primary font-bold" : ""}`}
                    >
                      <div className={`h-1.5 w-1.5 rounded-full ${currentPipelineId === p.id ? "bg-primary" : "bg-muted-foreground/30"}`} />
                      <span className="flex-1 truncate">{p.name}</span>
                      <span className={`text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-md ${currentPipelineId === p.id ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {count.toLocaleString("pt-BR")}
                      </span>
                    </DropdownMenuItem>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEditPipeline(p); }}
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent/10 hover:text-accent opacity-0 group-hover:opacity-100 transition-all"
                      title="Editar nome do funil"
                    >
                      <span className="text-xs font-bold">✏️</span>
                    </button>
                    {pipelines.length > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setPipelineToDelete(p.id); }}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  );
                })}
                <DropdownMenuSeparator className="bg-border/20" />
                <DropdownMenuItem 
                  onClick={() => setShowNewPipeline(true)}
                  className="rounded-xl text-xs h-9 gap-3 text-primary font-bold cursor-pointer hover:bg-primary/5 hover:text-primary"
                >
                  <Plus className="h-4 w-4" /> Novo Funil
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          </div>
        </div>
      }
      actions={
        <div className="flex items-center gap-2">
          {showSearch ? (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar contatos..."
                className="h-8 w-56 pl-9 pr-8 text-xs rounded-full"
              />
              <button onClick={() => { setShowSearch(false); setSearchQuery(""); }} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          ) : (
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowSearch(true)}>
              <Search className="h-4 w-4" />
            </Button>
          )}
          <FilterPopover
            filters={crmFilters}
            onFiltersChange={setCrmFilters}
            availableTags={availableTags}
          />
          <SavedViewsMenu filters={crmFilters} onApply={setCrmFilters} />
          <ColumnVisibilityPopover
            columns={pipelineColumns}
            hiddenColumnIds={hiddenColumnIds}
            onToggle={(id) => setHiddenColumnIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])}
          />
          <SelectionToggleButton visibleLeads={filteredLeads} />
          <DuplicatesButton />
          {/* Split button: criar lead manual OU importar lista */}
          <div className="flex items-center">
            <Button
              size="sm"
              className="text-xs gap-1.5 h-8 rounded-l-lg rounded-r-none bg-primary hover:bg-[#e08300] text-primary-foreground border-r border-primary-foreground/20"
              onClick={() => handleAddLead(pipelineColumns[0]?.id ?? "")}
            >
              <Plus className="h-3.5 w-3.5" /> Novo Lead
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="text-xs h-8 rounded-l-none rounded-r-lg bg-primary hover:bg-[#e08300] text-primary-foreground px-1.5"
                  aria-label="Mais opções de criação"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem
                  className="text-xs gap-2"
                  onClick={() => handleAddLead(pipelineColumns[0]?.id ?? "")}
                >
                  <Plus className="h-3 w-3" /> Criar lead manualmente
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-xs gap-2"
                  onClick={() => setImportDialog({ open: true })}
                >
                  <Upload className="h-3 w-3" /> Importar lista (CSV/Excel)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      }
    >
      {loading ? (
        <KanbanSkeleton />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveDragLead(null)}
          autoScroll={{ enabled: true, threshold: { x: 0.15, y: 0 }, acceleration: 10, interval: 5 }}
        >
          <div ref={boardRef} className="board-container flex h-[calc(100vh-4rem)] overflow-x-auto p-6 gap-5 animate-fade-in hide-scrollbar">
            {/* SortableContext de colunas — horizontal. Items recebem o id sentinela
                `column:${id}` pra não conflitar com sortable de leads que usa id puro. */}
            <SortableContext
              items={pipelineColumns.filter((col) => !hiddenColumnIds.includes(col.id)).map((col) => `column:${col.id}`)}
              strategy={horizontalListSortingStrategy}
            >
              {pipelineColumns.filter((col) => !hiddenColumnIds.includes(col.id)).map((col) => {
              const colLeads = filteredLeads.filter((l) => l.column_id === col.id);
              return (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  leads={colLeads}
                  allColumns={pipelineColumns}
                  onLeadClick={(lead) => openLeadSheet(lead.id)}
                  onAddLead={handleAddLead}
                  onConfigColumn={(col, tab) => {
                    setConfigColumn(col);
                    setConfigColumnTab(tab || "general");
                  }}
                  onMoveLead={moveLead}
                  onImportLeads={(colId) => setImportDialog({ open: true, columnId: colId })}
                  tagColors={tagColors}
                  segmentoFieldSlug={segmentoFieldSlug}
                  usersById={usersById}
                  nextTaskByLead={nextTaskByLead}
                  lastActivityByLead={lastActivityByLead}
                  phonesByLead={phonesByLead}
                />
              );
            })}
            </SortableContext>
            <div className="shrink-0">
              <button
                onClick={() => setShowNewColumn(true)}
                className="w-48 h-12 rounded-xl border-2 border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-1.5 font-medium"
              >
                <Plus className="h-3.5 w-3.5" /> Nova Coluna
              </button>
            </div>
          </div>

          <DragOverlay>
            {activeDragLead ? <DragOverlayCard lead={activeDragLead} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Detalhe do lead. Sheet à direita para o board continuar visível atrás —
          o usuário mantém o contexto da coluna de onde veio. A rota /leads/:id
          segue existindo: link compartilhado abre a página cheia. */}
      <Sheet open={!!selectedLeadId} onOpenChange={(o) => { if (!o) closeLeadSheet(); }}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[540px] p-0 flex flex-col gap-0 overflow-hidden"
        >
          <SheetHeader className="px-6 py-4 border-b border-border shrink-0 text-left">
            <div className="flex items-center justify-between gap-3 pr-8">
              <SheetTitle className="text-base font-semibold truncate">
                {selectedLead?.name ?? "Lead"}
              </SheetTitle>
              <LeadDetailActions leadId={selectedLeadId ?? undefined} onClose={closeLeadSheet} />
            </div>
          </SheetHeader>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {/* key força remontar ao trocar de lead: o LeadDetail guarda rascunho
                de nota/tarefa em estado local, que não pode vazar entre leads. */}
            {selectedLeadId && (
              <LeadDetail key={selectedLeadId} leadId={selectedLeadId} onClose={closeLeadSheet} />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <LeadFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditingLead(null); }}
        onSave={handleSaveLead}
        lead={editingLead}
        columns={pipelineColumns}
        defaultColumnId={formColumnId}
      />

      <Dialog open={showNewPipeline} onOpenChange={setShowNewPipeline}>
        <DialogContent className="max-w-sm rounded-card border border-[hsl(var(--border-strong))] bg-card">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-3">
              <div className="h-10 w-10 rounded-card bg-primary/20 flex items-center justify-center">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              Novo Funil de Vendas
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pipe-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Nome do Funil</Label>
              <Input 
                id="pipe-name"
                value={newPipelineName}
                onChange={(e) => setNewPipelineName(e.target.value)}
                placeholder="Ex: Vendas High Ticket"
                className="h-11 rounded-xl bg-secondary/20 border-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNewPipeline(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleCreatePipeline} disabled={!newPipelineName.trim()} className="rounded-xl bg-primary hover:bg-[#e08300] px-8">Criar Funil</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewColumn} onOpenChange={setShowNewColumn}>
        <DialogContent className="max-w-sm rounded-card border border-[hsl(var(--border-strong))] bg-card">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-3">
              <div className="h-10 w-10 rounded-card bg-accent/20 flex items-center justify-center">
                <Plus className="h-5 w-5 text-accent" />
              </div>
              Nova Etapa do Funil
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="col-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Nome da Etapa</Label>
              <Input 
                id="col-name"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="Ex: Reunião Agendada"
                className="h-11 rounded-xl bg-secondary/20 border-none focus:ring-2 focus:ring-accent"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNewColumn(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleCreateColumn} disabled={!newColumnName.trim()} className="rounded-xl bg-accent hover:bg-accent/80 text-white px-8">Adicionar Etapa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ColumnConfigModal
        column={configColumn}
        open={!!configColumn}
        onClose={() => setConfigColumn(null)}
        initialTab={configColumnTab}
      />

      <Dialog open={!!editingPipelineId} onOpenChange={(open) => !open && setEditingPipelineId(null)}>
        <DialogContent className="max-w-sm rounded-card border border-[hsl(var(--border-strong))] bg-card">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-3">
              <span className="text-2xl">✏️</span>
              Editar Nome do Funil
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-pipe-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Novo Nome</Label>
              <Input
                id="edit-pipe-name"
                value={editingPipelineName}
                onChange={(e) => setEditingPipelineName(e.target.value)}
                placeholder="Ex: Vendas Enterprise"
                className="h-11 rounded-xl bg-secondary/20 border-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingPipelineId(null)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleSavePipelineName} disabled={!editingPipelineName.trim()} className="rounded-xl bg-primary hover:bg-[#e08300] px-8">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pipelineToDelete} onOpenChange={(open) => !open && setPipelineToDelete(null)}>
        <AlertDialogContent className="rounded-card border border-[hsl(var(--border-strong))] bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold flex items-center gap-3 text-destructive">
              <div className="h-10 w-10 rounded-card bg-destructive/20 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm py-2">
              Tem certeza que deseja excluir o funil **"{pipelines.find(p => p.id === pipelineToDelete)?.name}"**? 
              <br /><br />
              Esta ação é **irreversível** e todas as etapas vinculadas a este funil serão removidas permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl border-none bg-secondary/50 hover:bg-secondary transition-colors">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePipeline}
              className="rounded-xl bg-destructive hover:bg-destructive/90 text-white shadow-lg shadow-destructive/20 px-8"
            >
              Sim, Excluir Funil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de importação — usado pelo "Novo Lead" (importar lista) e pelo
          menu de 3 pontinhos da coluna. Quando columnId está presente, o destino
          fica travado (não pode trocar). */}
      <ImportLeadsDialog
        open={importDialog.open}
        onOpenChange={(open) => setImportDialog((prev) => ({ ...prev, open }))}
        pipelineId={currentPipelineId}
        columnId={importDialog.columnId}
        lockTarget={!!importDialog.columnId}
        title={importDialog.columnId
          ? `Importar leads para "${columns.find(c => c.id === importDialog.columnId)?.name ?? "coluna"}"`
          : "Importar leads"
        }
        subtitle={importDialog.columnId
          ? "Os leads importados vão direto para essa etapa específica."
          : "Selecione o pipeline e a etapa de destino no próximo passo."
        }
      />
    </AppLayout>
  );
}
