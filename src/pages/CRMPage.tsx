import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAppState } from "@/contexts/AppContext";
import { Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function CRMPage() {
  const navigate = useNavigate();
  const { leads, columns, addLead, updateLead, deleteLead, moveLead } = useAppState();

  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formColumnId, setFormColumnId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [activeDragLead, setActiveDragLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [configColumn, setConfigColumn] = useState<PipelineColumn | null>(null);
  const [crmFilters, setCrmFilters] = useState<CRMFilters>(EMPTY_FILTERS);
  const [hiddenColumnIds, setHiddenColumnIds] = useState<string[]>([]);

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
    if (crmFilters.origins.length > 0) {
      result = result.filter((l) => l.origin && crmFilters.origins.includes(l.origin));
    }
    if (crmFilters.tags.length > 0) {
      result = result.filter((l) => l.tags.some((t) => crmFilters.tags.includes(t)));
    }
    if (crmFilters.minValue) {
      const min = parseFloat(crmFilters.minValue);
      result = result.filter((l) => (l.value ?? 0) >= min);
    }
    if (crmFilters.maxValue) {
      const max = parseFloat(crmFilters.maxValue);
      result = result.filter((l) => (l.value ?? 0) <= max);
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

    const overColumn = columns.find((c) => c.id === overId);
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
      await addLead(data, formColumnId);
    }
    setShowForm(false);
    setEditingLead(null);
  }

  return (
    <AppLayout
      title="CRM"
      subtitle="Funil de vendas"
      actions={
        <div className="flex items-center gap-2">
          {showSearch ? (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar leads..."
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
            columns={columns}
            hiddenColumnIds={hiddenColumnIds}
            onToggle={(id) => setHiddenColumnIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])}
          />
          <Button size="sm" className="text-xs gap-1.5 h-8 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground neon-glow" onClick={() => handleAddLead(columns[0]?.id ?? "")}>
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
            {columns.filter((col) => !hiddenColumnIds.includes(col.id)).map((col) => {
              const colLeads = filteredLeads.filter((l) => l.column_id === col.id);
              return (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  leads={colLeads}
                  allColumns={columns}
                  onLeadClick={(lead) => navigate(`/leads/${lead.id}`)}
                  onAddLead={handleAddLead}
                  onConfigColumn={setConfigColumn}
                  onMoveLead={moveLead}
                />
              );
            })}
            <div className="shrink-0">
              <button className="w-48 h-12 rounded-xl border-2 border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-1.5 font-medium">
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
        columns={columns}
        defaultColumnId={formColumnId}
      />

      <ColumnConfigModal
        column={configColumn}
        open={!!configColumn}
        onClose={() => setConfigColumn(null)}
      />
    </AppLayout>
  );
}
