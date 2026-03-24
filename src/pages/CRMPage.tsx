import { useState, useMemo, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { mockLeads as initialLeads, mockColumns as initialColumns } from "@/lib/mock-data";
import { Plus, Filter, Search, X, Columns } from "lucide-react";
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
import { LeadDetailModal } from "@/components/crm/LeadDetailModal";
import { LeadFormModal } from "@/components/crm/LeadFormModal";
import { KanbanSkeleton } from "@/components/crm/KanbanSkeleton";
import { ColumnConfigModal } from "@/components/crm/ColumnConfigModal";

export default function CRMPage() {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [columns] = useState<PipelineColumn[]>(initialColumns);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formColumnId, setFormColumnId] = useState("col1");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [activeDragLead, setActiveDragLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [configColumn, setConfigColumn] = useState<PipelineColumn | null>(null);

  // Fix: useEffect instead of misused useState
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const filteredLeads = useMemo(() => {
    if (!searchQuery.trim()) return leads;
    const q = searchQuery.toLowerCase();
    return leads.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.company?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [leads, searchQuery]);

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

    setLeads((prev) =>
      prev.map((l) =>
        l.id === activeLeadId
          ? { ...l, column_id: targetColumnId, updated_at: new Date().toISOString() }
          : l
      )
    );
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

  function handleDeleteLead(leadId: string) {
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
  }

  function handleSaveLead(data: Partial<Lead>) {
    if (editingLead) {
      setLeads((prev) =>
        prev.map((l) =>
          l.id === editingLead.id ? { ...l, ...data, updated_at: new Date().toISOString() } : l
        )
      );
    } else {
      const newLead: Lead = {
        id: `l${Date.now()}`,
        client_id: "c1",
        name: data.name ?? "",
        phone: data.phone,
        email: data.email,
        company: data.company,
        position: data.position,
        tags: data.tags ?? [],
        column_id: formColumnId,
        value: data.value,
        origin: data.origin || "Manual",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setLeads((prev) => [...prev, newLead]);
    }
    setShowForm(false);
    setEditingLead(null);
  }

  return (
    <AppLayout
      title="CRM"
      subtitle="Pipeline de vendas"
      actions={
        <div className="flex items-center gap-2">
          {showSearch ? (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar leads..."
                className="h-8 w-56 pl-8 pr-8 text-xs"
              />
              <button onClick={() => { setShowSearch(false); setSearchQuery(""); }} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          ) : (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowSearch(true)}>
              <Search className="h-4 w-4" />
            </Button>
          )}
          <Button variant="outline" size="sm" className="text-xs gap-1 h-8">
            <Filter className="h-3 w-3" /> Filtrar
          </Button>
          <Button variant="outline" size="sm" className="text-xs gap-1 h-8">
            <Columns className="h-3 w-3" /> Coluna
          </Button>
          <Button size="sm" className="text-xs gap-1 h-8" onClick={() => handleAddLead("col1")}>
            <Plus className="h-3 w-3" /> Novo Lead
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
          <div className="flex h-[calc(100vh-3.5rem)] overflow-x-auto p-4 gap-4 animate-fade-in">
            {columns.map((col) => {
              const colLeads = filteredLeads.filter((l) => l.column_id === col.id);
              return (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  leads={colLeads}
                  onLeadClick={setSelectedLead}
                  onAddLead={handleAddLead}
                  onConfigColumn={setConfigColumn}
                />
              );
            })}
            <div className="shrink-0">
              <button className="w-48 h-12 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1">
                <Plus className="h-3 w-3" /> Nova Coluna
              </button>
            </div>
          </div>

          <DragOverlay>
            {activeDragLead ? <DragOverlayCard lead={activeDragLead} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      <LeadDetailModal
        lead={selectedLead}
        open={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        columns={columns}
        onEdit={handleEditLead}
        onDelete={handleDeleteLead}
      />

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
