import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { MoreHorizontal, Settings, ArrowRight, Download, Zap, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SortableLeadCard } from "./SortableLeadCard";
import type { Lead, PipelineColumn } from "@/types";

interface KanbanColumnProps {
  column: PipelineColumn;
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onAddLead: (columnId: string) => void;
  onConfigColumn: (column: PipelineColumn) => void;
}

export function KanbanColumn({ column, leads, onLeadClick, onAddLead, onConfigColumn }: KanbanColumnProps) {
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
            <DropdownMenuItem className="text-xs gap-2" onClick={() => onConfigColumn(column)}>
              <Settings className="h-3 w-3" /> Editar coluna
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs gap-2"><ArrowRight className="h-3 w-3" /> Transferir leads</DropdownMenuItem>
            <DropdownMenuItem className="text-xs gap-2"><Download className="h-3 w-3" /> Exportar CSV</DropdownMenuItem>
            <DropdownMenuItem className="text-xs gap-2" onClick={() => onConfigColumn(column)}>
              <Zap className="h-3 w-3" /> Automações
            </DropdownMenuItem>
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
          className="w-full py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1"
        >
          <Plus className="h-3 w-3" /> Adicionar lead
        </button>
      </div>
    </div>
  );
}
