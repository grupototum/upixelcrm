import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { mockLeads, mockColumns } from "@/lib/mock-data";
import { Plus, Filter, MoreHorizontal, GripVertical, Zap, Download, Settings, ArrowRight, User, Phone, Mail, Building, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Lead } from "@/types";

function LeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  return (
    <div onClick={onClick} className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:border-border-hover hover:shadow-sm transition-all group">
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-medium text-foreground truncate">{lead.name}</h4>
        <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>
      {lead.company && (
        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
          <Building className="h-3 w-3" /> {lead.company}
        </p>
      )}
      {lead.value && (
        <p className="text-xs font-semibold text-success mb-2">
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
      {lead.origin && (
        <p className="text-[10px] text-muted-foreground mt-2">{lead.origin}</p>
      )}
    </div>
  );
}

function LeadDetailModal({ lead, open, onClose }: { lead: Lead | null; open: boolean; onClose: () => void }) {
  if (!lead) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
              {lead.name.split(" ").map(n => n[0]).join("")}
            </div>
            {lead.name}
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
                <div className="mt-1.5 h-2 w-2 rounded-full bg-success shrink-0" />
                <div><p className="text-sm text-foreground">Lead criado</p><p className="text-xs text-muted-foreground">{new Date(lead.created_at).toLocaleDateString("pt-BR")}</p></div>
              </div>
              <div className="flex gap-3">
                <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                <div><p className="text-sm text-foreground">Movido para {mockColumns.find(c => c.id === lead.column_id)?.name}</p><p className="text-xs text-muted-foreground">{new Date(lead.updated_at).toLocaleDateString("pt-BR")}</p></div>
              </div>
              {lead.origin && (
                <div className="flex gap-3">
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-accent shrink-0" />
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

export default function CRMPage() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  return (
    <AppLayout
      title="CRM"
      subtitle="Pipeline de vendas"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs gap-1"><Filter className="h-3 w-3" /> Filtrar</Button>
          <Button size="sm" className="text-xs gap-1 bg-primary hover:bg-primary-hover text-primary-foreground"><Plus className="h-3 w-3" /> Novo Lead</Button>
        </div>
      }
    >
      <div className="flex h-[calc(100vh-3.5rem)] overflow-x-auto p-4 gap-4 animate-fade-in">
        {mockColumns.map((col) => {
          const leads = mockLeads.filter((l) => l.column_id === col.id);
          return (
            <div key={col.id} className="flex flex-col w-72 shrink-0">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                  <h3 className="text-sm font-semibold text-foreground">{col.name}</h3>
                  <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">{leads.length}</span>
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
              <div className="flex-1 space-y-2 overflow-auto pb-4">
                {leads.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} onClick={() => setSelectedLead(lead)} />
                ))}
                <button className="w-full py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                  + Adicionar lead
                </button>
              </div>
            </div>
          );
        })}
        <div className="shrink-0">
          <button className="w-48 h-12 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1">
            <Plus className="h-3 w-3" /> Nova Coluna
          </button>
        </div>
      </div>
      <LeadDetailModal lead={selectedLead} open={!!selectedLead} onClose={() => setSelectedLead(null)} />
    </AppLayout>
  );
}
