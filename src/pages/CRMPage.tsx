import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { mockLeads as initialLeads, mockColumns as initialColumns } from "@/lib/mock-data";
import {
  Plus, Filter, MoreHorizontal, GripVertical, Zap, Download, Settings,
  ArrowRight, User, Phone, Mail, Building, Tag, Search, X, Edit3, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
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
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Lead, PipelineColumn } from "@/types";

/* ─── Sortable Lead Card ─── */
function SortableLeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { type: "lead", lead },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div
        onClick={onClick}
        className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all group"
      >
        <div className="flex items-start justify-between mb-1.5">
          <h4 className="text-sm font-medium text-foreground truncate flex-1">{lead.name}</h4>
          <div {...listeners} className="cursor-grab active:cursor-grabbing shrink-0 ml-1">
            <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
        {lead.company && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
            <Building className="h-3 w-3" /> {lead.company}
          </p>
        )}
        {(lead.phone || lead.email) && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
            {lead.phone ? <><Phone className="h-3 w-3" /> {lead.phone}</> : <><Mail className="h-3 w-3" /> {lead.email}</>}
          </p>
        )}
        {lead.value && (
          <p className="text-xs font-semibold text-primary mb-1.5">
            R$ {lead.value.toLocaleString("pt-BR")}
          </p>
        )}
        <div className="flex flex-wrap gap-1">
          {lead.tags.map((tag) => (
            <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
              {tag}
            </span>
          ))}
        </div>
        {lead.responsible_id && (
          <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
            <User className="h-3 w-3" /> {lead.responsible_id}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Overlay Card (while dragging) ─── */
function DragOverlayCard({ lead }: { lead: Lead }) {
  return (
    <div className="bg-card border-2 border-primary rounded-lg p-3 shadow-lg w-72 rotate-2">
      <h4 className="text-sm font-medium text-foreground truncate">{lead.name}</h4>
      {lead.company && <p className="text-xs text-muted-foreground mt-1">{lead.company}</p>}
    </div>
  );
}

/* ─── Droppable Column ─── */
function KanbanColumn({
  column,
  leads,
  onLeadClick,
  onAddLead,
}: {
  column: PipelineColumn;
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onAddLead: (columnId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { type: "column" } });

  return (
    <div className="flex flex-col w-72 shrink-0">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: column.color }} />
          <h3 className="text-sm font-semibold text-foreground">{column.name}</h3>
          <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">
            {leads.length}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="text-xs gap-2"><Settings className="h-3 w-3" /> Editar coluna</DropdownMenuItem>
            <DropdownMenuItem className="text-xs gap-2"><ArrowRight className="h-3 w-3" /> Transferir leads</DropdownMenuItem>
            <DropdownMenuItem className="text-xs gap-2"><Download className="h-3 w-3" /> Exportar CSV</DropdownMenuItem>
            <DropdownMenuItem className="text-xs gap-2"><Zap className="h-3 w-3" /> Automações</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 overflow-auto pb-4 rounded-lg p-1 transition-colors ${isOver ? "bg-primary/5 ring-2 ring-primary/20" : ""}`}
      >
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <SortableLeadCard key={lead.id} lead={lead} onClick={() => onLeadClick(lead)} />
          ))}
        </SortableContext>
        <button
          onClick={() => onAddLead(column.id)}
          className="w-full py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          + Adicionar lead
        </button>
      </div>
    </div>
  );
}

/* ─── Lead Detail Modal ─── */
function LeadDetailModal({
  lead,
  open,
  onClose,
  columns,
  onEdit,
}: {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
  columns: PipelineColumn[];
  onEdit: (lead: Lead) => void;
}) {
  if (!lead) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
              {lead.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div className="flex-1 min-w-0">
              <span className="truncate">{lead.name}</span>
              <p className="text-xs font-normal text-muted-foreground">{columns.find((c) => c.id === lead.column_id)?.name}</p>
            </div>
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => { onClose(); onEdit(lead); }}>
              <Edit3 className="h-3 w-3" /> Editar
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-6 mt-4">
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dados do Lead</h3>
            <div className="space-y-3">
              {lead.phone && <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" /><span className="text-foreground">{lead.phone}</span></div>}
              {lead.email && <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" /><span className="text-foreground">{lead.email}</span></div>}
              {lead.company && <div className="flex items-center gap-2 text-sm"><Building className="h-4 w-4 text-muted-foreground" /><span className="text-foreground">{lead.company}</span></div>}
              {lead.position && <div className="flex items-center gap-2 text-sm"><User className="h-4 w-4 text-muted-foreground" /><span className="text-foreground">{lead.position}</span></div>}
            </div>
            {lead.value && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Valor</h4>
                <p className="text-lg font-bold text-primary">R$ {lead.value.toLocaleString("pt-BR")}</p>
              </div>
            )}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Tags</h4>
              <div className="flex flex-wrap gap-1">
                {lead.tags.map((tag) => (
                  <span key={tag} className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary flex items-center gap-1">
                    <Tag className="h-3 w-3" /> {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Timeline</h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                <div><p className="text-sm text-foreground">Lead criado</p><p className="text-xs text-muted-foreground">{new Date(lead.created_at).toLocaleDateString("pt-BR")}</p></div>
              </div>
              <div className="flex gap-3">
                <div className="mt-1.5 h-2 w-2 rounded-full bg-accent shrink-0" />
                <div><p className="text-sm text-foreground">Movido para {columns.find((c) => c.id === lead.column_id)?.name}</p><p className="text-xs text-muted-foreground">{new Date(lead.updated_at).toLocaleDateString("pt-BR")}</p></div>
              </div>
              {lead.origin && (
                <div className="flex gap-3">
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-muted-foreground shrink-0" />
                  <div><p className="text-sm text-foreground">Origem: {lead.origin}</p><p className="text-xs text-muted-foreground">Captura inicial</p></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Lead Form Modal (Create / Edit) ─── */
function LeadFormModal({
  open,
  onClose,
  onSave,
  lead,
  columns,
  defaultColumnId,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Lead>) => void;
  lead: Lead | null;
  columns: PipelineColumn[];
  defaultColumnId: string;
}) {
  const [form, setForm] = useState<Partial<Lead>>(
    lead ?? { name: "", phone: "", email: "", company: "", position: "", tags: [], column_id: defaultColumnId, value: undefined }
  );

  // Reset when lead changes
  const key = lead?.id ?? "new";

  return (
    <Dialog open={open} onOpenChange={onClose} key={key}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{lead ? "Editar Lead" : "Novo Lead"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label className="text-xs">Nome *</Label>
            <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Telefone</Label>
              <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+55 11 99999-0000" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@empresa.com" className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Empresa</Label>
              <Input value={form.company ?? ""} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Empresa" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Cargo</Label>
              <Input value={form.position ?? ""} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="Cargo" className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Valor (R$)</Label>
            <Input type="number" value={form.value ?? ""} onChange={(e) => setForm({ ...form, value: e.target.value ? Number(e.target.value) : undefined })} placeholder="0" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Tags (separadas por vírgula)</Label>
            <Input
              value={(form.tags ?? []).join(", ")}
              onChange={(e) => setForm({ ...form, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
              placeholder="hot, enterprise"
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => { if (form.name?.trim()) onSave(form); }} disabled={!form.name?.trim()}>
            {lead ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Skeleton Loading ─── */
function KanbanSkeleton() {
  return (
    <div className="flex h-full overflow-x-auto p-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="w-72 shrink-0 space-y-3">
          <Skeleton className="h-6 w-32" />
          {Array.from({ length: 3 - i }).map((_, j) => (
            <Skeleton key={j} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─── Main CRM Page ─── */
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

  // Simulate loading
  useState(() => {
    const t = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(t);
  });

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

    // Determine target column
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

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragLead(null);
    // Position already updated in dragOver
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
        origin: "Manual",
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
      />

      <LeadFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditingLead(null); }}
        onSave={handleSaveLead}
        lead={editingLead}
        columns={columns}
        defaultColumnId={formColumnId}
      />
    </AppLayout>
  );
}
