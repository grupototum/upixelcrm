import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAppState } from "@/contexts/AppContext";
import { Plus, Search, X, ChevronDown, LayoutGrid } from "lucide-react";
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
import type { Lead, PipelineColumn } from "@/types";

import { KanbanColumn } from "@/components/crm/KanbanColumn";
import { DragOverlayCard } from "@/components/crm/SortableLeadCard";
import { LeadFormModal } from "@/components/crm/LeadFormModal";
import { KanbanSkeleton } from "@/components/crm/KanbanSkeleton";
import { ColumnConfigModal } from "@/components/crm/ColumnConfigModal";
import { FilterPopover, EMPTY_FILTERS, type CRMFilters } from "@/components/crm/FilterPopover";
import { ColumnVisibilityPopover } from "@/components/crm/ColumnVisibilityPopover";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CRMPage() {
  const navigate = useNavigate();
  const {
    leads, pipelines, columns, currentPipelineId,
    setPipeline, addPipeline, updatePipeline, deletePipeline, addColumn,
    addLead, updateLead, deleteLead, moveLead
  } = useAppState();

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
  const [isLoading, setIsLoading] = useState(true);
  const [configColumn, setConfigColumn] = useState<PipelineColumn | null>(null);
  const [configColumnTab, setConfigColumnTab] = useState<string>("general");
  const [crmFilters, setCrmFilters] = useState<CRMFilters>(EMPTY_FILTERS);
  const [hiddenColumnIds, setHiddenColumnIds] = useState<string[]>([]);
  const [editingPipelineId, setEditingPipelineId] = useState<string | null>(null);
  const [editingPipelineName, setEditingPipelineName] = useState("");

  const currentPipeline = useMemo(() =>
    pipelines.find(p => p.id === currentPipelineId) || pipelines[0]
  , [pipelines, currentPipelineId]);

  // Quantidade total de leads por funil (via column_id → pipeline_id)
  const leadCountByPipeline = useMemo(() => {
    const colToPipeline = new Map<string, string>();
    columns.forEach((c) => colToPipeline.set(c.id, c.pipeline_id));
    const counts: Record<string, number> = {};
    leads.forEach((l) => {
      if (!l.column_id) return;
      const pid = colToPipeline.get(l.column_id);
      if (!pid) return;
      counts[pid] = (counts[pid] ?? 0) + 1;
    });
    return counts;
  }, [leads, columns]);

  const totalLeads = leads.length;
  const currentPipelineLeadCount = currentPipelineId ? leadCountByPipeline[currentPipelineId] ?? 0 : 0;

  const pipelineColumns = useMemo(() => 
    columns.filter(c => c.pipeline_id === currentPipelineId).sort((a, b) => a.order - b.order)
  , [columns, currentPipelineId]);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

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

    // Status filter
    if (crmFilters.status.length > 0) {
      result = result.filter((l) => l.status && crmFilters.status.includes(l.status));
    }

    // Priority filter
    if (crmFilters.priority.length > 0) {
      result = result.filter((l) => l.priority && crmFilters.priority.includes(l.priority));
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

  function handleDragEnd(_event: DragEndEvent) {
    setActiveDragLead(null);
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

  async function handleSaveLead(data: Partial<Lead>) {
    if (editingLead) {
      await updateLead(editingLead.id, data);
    } else {
      await addLead(data, formColumnId || pipelineColumns[0]?.id || "");
    }
    setShowForm(false);
    setEditingLead(null);
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
      title="CRM"
      subtitle={
        <div className="flex flex-col gap-4 mt-1">
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card/30 hover:bg-card/50 transition-all border border-border/40 group">
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
              <DropdownMenuContent align="start" className="w-72 rounded-2xl shadow-2xl border-none p-1.5 backdrop-blur-xl bg-card/80">
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
          <ColumnVisibilityPopover
            columns={pipelineColumns}
            hiddenColumnIds={hiddenColumnIds}
            onToggle={(id) => setHiddenColumnIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])}
          />
          <Button size="sm" className="text-xs gap-1.5 h-8 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground neon-glow" onClick={() => handleAddLead(pipelineColumns[0]?.id ?? "")}>
            <Plus className="h-3.5 w-3.5" /> Novo Lead
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <KanbanSkeleton />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex h-[calc(100vh-4rem)] overflow-x-auto p-6 gap-5 animate-fade-in hide-scrollbar">
            {pipelineColumns.filter((col) => !hiddenColumnIds.includes(col.id)).map((col) => {
              const colLeads = filteredLeads.filter((l) => l.column_id === col.id);
              return (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  leads={colLeads}
                  allColumns={pipelineColumns}
                  onLeadClick={(lead) => navigate(`/leads/${lead.id}`)}
                  onAddLead={handleAddLead}
                  onConfigColumn={(col, tab) => {
                    setConfigColumn(col);
                    setConfigColumnTab(tab || "general");
                  }}
                  onMoveLead={moveLead}
                />
              );
            })}
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

      <LeadFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditingLead(null); }}
        onSave={handleSaveLead}
        lead={editingLead}
        columns={pipelineColumns}
        defaultColumnId={formColumnId}
      />

      <Dialog open={showNewPipeline} onOpenChange={setShowNewPipeline}>
        <DialogContent className="max-w-sm rounded-3xl border-none shadow-2xl bg-card/95 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-primary/20 flex items-center justify-center">
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
            <Button onClick={handleCreatePipeline} disabled={!newPipelineName.trim()} className="rounded-xl bg-primary hover:bg-primary-hover px-8">Criar Funil</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewColumn} onOpenChange={setShowNewColumn}>
        <DialogContent className="max-w-sm rounded-3xl border-none shadow-2xl bg-card/95 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-accent/20 flex items-center justify-center">
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
        <DialogContent className="max-w-sm rounded-3xl border-none shadow-2xl bg-card/95 backdrop-blur-2xl">
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
            <Button onClick={handleSavePipelineName} disabled={!editingPipelineName.trim()} className="rounded-xl bg-primary hover:bg-primary-hover px-8">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pipelineToDelete} onOpenChange={(open) => !open && setPipelineToDelete(null)}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl bg-card/95 backdrop-blur-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold flex items-center gap-3 text-destructive">
              <div className="h-10 w-10 rounded-2xl bg-destructive/20 flex items-center justify-center">
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
    </AppLayout>
  );
}
