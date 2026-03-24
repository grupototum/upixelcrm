import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, Mail, Building, User, Tag, Edit3, Trash2 } from "lucide-react";
import { mockTimeline } from "@/lib/mock-data";
import type { Lead, PipelineColumn } from "@/types";

const timelineTypeColors: Record<string, string> = {
  stage_change: "bg-accent",
  message: "bg-primary",
  note: "bg-muted-foreground",
  task: "bg-success",
  automation: "bg-warning",
};

interface LeadDetailModalProps {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
  columns: PipelineColumn[];
  onEdit: (lead: Lead) => void;
  onDelete: (leadId: string) => void;
}

export function LeadDetailModal({ lead, open, onClose, columns, onEdit, onDelete }: LeadDetailModalProps) {
  if (!lead) return null;

  const timeline = mockTimeline.filter((e) => e.lead_id === lead.id);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
              {lead.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <span className="truncate block">{lead.name}</span>
              <p className="text-xs font-normal text-muted-foreground">
                {columns.find((c) => c.id === lead.column_id)?.name}
                {lead.origin && <> · Origem: {lead.origin}</>}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => { onClose(); onEdit(lead); }}>
                <Edit3 className="h-3 w-3" /> Editar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => { onClose(); onDelete(lead.id); }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
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
                {lead.tags.length > 0 ? lead.tags.map((tag) => (
                  <span key={tag} className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary flex items-center gap-1">
                    <Tag className="h-3 w-3" /> {tag}
                  </span>
                )) : <span className="text-xs text-muted-foreground">Nenhuma tag</span>}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Timeline</h3>
            <div className="space-y-3">
              {timeline.length > 0 ? timeline.map((ev, i) => (
                <div key={ev.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${timelineTypeColors[ev.type] || "bg-primary"}`} />
                    {i < timeline.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                  </div>
                  <div className="pb-3">
                    <p className="text-sm text-foreground">{ev.content}</p>
                    <p className="text-[11px] text-muted-foreground">{ev.user_name} · {new Date(ev.created_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
              )) : (
                <>
                  <div className="flex gap-3">
                    <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                    <div><p className="text-sm text-foreground">Lead criado</p><p className="text-xs text-muted-foreground">{new Date(lead.created_at).toLocaleDateString("pt-BR")}</p></div>
                  </div>
                  <div className="flex gap-3">
                    <div className="mt-1.5 h-2 w-2 rounded-full bg-accent shrink-0" />
                    <div><p className="text-sm text-foreground">Movido para {columns.find((c) => c.id === lead.column_id)?.name}</p><p className="text-xs text-muted-foreground">{new Date(lead.updated_at).toLocaleDateString("pt-BR")}</p></div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
