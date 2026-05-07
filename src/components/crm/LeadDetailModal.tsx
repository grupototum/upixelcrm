import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, Mail, Building, User, Tag, Edit3, Trash2, Merge } from "lucide-react";
import { useAppState } from "@/contexts/AppContext";
import { MergeLeadsModal } from "./MergeLeadsModal";
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
  const { timeline: allTimeline, mergeLeads } = useAppState();
  const [mergeModalOpen, setMergeModalOpen] = useState(false);

  if (!lead) return null;

  const timeline = allTimeline.filter((e) => e.lead_id === lead.id);

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto border border-[hsl(var(--border-strong))] bg-card rounded-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-card bg-primary/10 flex items-center justify-center text-lg font-bold text-primary shadow-inner">
                {lead.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <span className="truncate block text-xl font-bold tracking-tight">{lead.name}</span>
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-secondary/50 border border-[hsl(var(--border-strong))]">
                    {columns.find((c) => c.id === lead.column_id)?.name || "Sem funil"}
                  </span>
                  {lead.origin && <span className="opacity-50">·</span>}
                  {lead.origin && <span className="uppercase tracking-wider text-[10px]">{lead.origin}</span>}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9 px-3 rounded-xl gap-1.5 border-[hsl(var(--border-strong))] bg-secondary/30 hover:bg-secondary/50" 
                  onClick={() => { onClose(); onEdit(lead); }}
                >
                  <Edit3 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Editar</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9 px-3 rounded-xl gap-1.5 border-[hsl(var(--border-strong))] bg-secondary/30 hover:bg-secondary/50 text-amber-600 hover:text-amber-700" 
                  onClick={() => setMergeModalOpen(true)}
                >
                  <Merge className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Mesclar</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => { if(confirm("Tem certeza que deseja excluir este lead?")) { onClose(); onDelete(lead.id); } }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Informações de Contato</h3>
                <div className="space-y-3 p-4 rounded-card bg-secondary/20 border border-[hsl(var(--border-strong))]">
                  {lead.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center text-muted-foreground">
                        <Phone className="h-4 w-4" />
                      </div>
                      <span className="font-medium">{lead.phone}</span>
                    </div>
                  )}
                  {lead.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center text-muted-foreground">
                        <Mail className="h-4 w-4" />
                      </div>
                      <span className="font-medium">{lead.email}</span>
                    </div>
                  )}
                  {lead.company && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center text-muted-foreground">
                        <Building className="h-4 w-4" />
                      </div>
                      <span className="font-medium">{lead.company}</span>
                    </div>
                  )}
                  {lead.position && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center text-muted-foreground">
                        <User className="h-4 w-4" />
                      </div>
                      <span className="font-medium">{lead.position}</span>
                    </div>
                  )}
                </div>
              </div>

              {lead.value !== undefined && lead.value !== null && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Valor do Negócio</h4>
                  <div className="p-4 rounded-card bg-primary/5 border border-[hsl(var(--border-strong))]">
                    <p className="text-2xl font-black text-primary">R$ {lead.value.toLocaleString("pt-BR")}</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Segmentação</h4>
                <div className="flex flex-wrap gap-2">
                  {lead.tags && lead.tags.length > 0 ? lead.tags.map((tag) => (
                    <span key={tag} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-primary/10 text-primary border border-[hsl(var(--border-strong))] flex items-center gap-1.5">
                      <Tag className="h-3 w-3" /> {tag}
                    </span>
                  )) : <span className="text-xs text-muted-foreground italic ml-1">Nenhuma tag aplicada</span>}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Histórico de Atividades</h3>
              <div className="relative space-y-6 pl-4 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-border/60">
                {timeline.length > 0 ? timeline.map((ev, i) => (
                  <div key={ev.id} className="relative flex gap-4">
                    <div className={`absolute -left-[19px] mt-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-background z-10 ${timelineTypeColors[ev.type] || "bg-primary"}`} />
                    <div className="flex-1 space-y-1">
                      <div className="p-3 rounded-card bg-secondary/20 border border-[hsl(var(--border-strong))] shadow-sm">
                        <p className="text-sm font-medium leading-relaxed">{ev.content}</p>
                      </div>
                      <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-2 px-1">
                        {ev.user_name || "Sistema"} 
                        <span className="h-1 w-1 rounded-full bg-border" /> 
                        {new Date(ev.created_at).toLocaleString("pt-BR", { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )) : (
                  <div className="py-12 text-center space-y-2">
                    <p className="text-xs text-muted-foreground">Sem atividades registradas.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <MergeLeadsModal 
        open={mergeModalOpen} 
        onOpenChange={setMergeModalOpen}
        sourceLead={lead}
        onMerge={async (s, t) => {
          await mergeLeads(s, t);
          onClose();
        }}
      />
    </>
  );
}
