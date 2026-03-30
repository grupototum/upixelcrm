import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { MoreHorizontal, Settings, ArrowRight, Download, Zap, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SortableLeadCard } from "./SortableLeadCard";
import { toast } from "sonner";
import type { Lead, PipelineColumn } from "@/types";

interface KanbanColumnProps {
  column: PipelineColumn;
  leads: Lead[];
  allColumns?: PipelineColumn[];
  onLeadClick: (lead: Lead) => void;
  onAddLead: (columnId: string) => void;
  onConfigColumn: (column: PipelineColumn, tab?: string) => void;
  onMoveLead?: (leadId: string, toColumnId: string) => void;
}

export function KanbanColumn({ column, leads, allColumns, onLeadClick, onAddLead, onConfigColumn, onMoveLead }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { type: "column" } });
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState("");

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
            <DropdownMenuItem className="text-xs gap-2" onClick={() => setTransferOpen(true)}>
              <ArrowRight className="h-3 w-3" /> Transferir leads
            </DropdownMenuItem>
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
        ref={setNodeRef}
        className={`flex-1 space-y-2 overflow-auto pb-4 rounded-xl p-1 transition-colors ${isOver ? "bg-primary/5 ring-2 ring-primary/20" : ""}`}
      >
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <SortableLeadCard key={lead.id} lead={lead} onClick={() => onLeadClick(lead)} />
          ))}
        </SortableContext>
        <button
          onClick={() => onAddLead(column.id)}
          className="w-full py-2 rounded-xl border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1"
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
