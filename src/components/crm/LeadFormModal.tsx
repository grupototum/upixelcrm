import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Lead, PipelineColumn } from "@/types";

interface LeadFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Lead>) => void;
  lead: Lead | null;
  columns: PipelineColumn[];
  defaultColumnId: string;
}

const emptyForm = (columnId: string): Partial<Lead> => ({
  name: "", phone: "", email: "", company: "", position: "", tags: [], column_id: columnId, value: undefined, origin: "", category: "lead",
});

export function LeadFormModal({ open, onClose, onSave, lead, columns, defaultColumnId }: LeadFormModalProps) {
  const [form, setForm] = useState<Partial<Lead>>(lead ?? emptyForm(defaultColumnId));
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (open) {
      setForm(lead ? { ...lead } : emptyForm(defaultColumnId));
      setTagInput("");
    }
  }, [open, lead, defaultColumnId]);

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    const newTags = [...new Set([...(form.tags || []), tagInput.trim()])];
    setForm({ ...form, tags: newTags });
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setForm({ ...form, tags: (form.tags || []).filter(t => t !== tagToRemove) });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{lead ? "Editar Lead" : "Novo Lead"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Nome *</Label>
              <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" className="mt-1 h-10 rounded-xl" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-1">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Categoria</Label>
              <Select 
                value={form.category ?? "lead"} 
                onValueChange={(val: any) => setForm({ ...form, category: val })}
              >
                <SelectTrigger className="mt-1 h-10 rounded-xl bg-secondary/20 border-none transition-all">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-[hsl(var(--border-strong))] bg-card">
                  <SelectItem value="lead" className="rounded-lg">Lead</SelectItem>
                  <SelectItem value="partner" className="rounded-lg">Parceiro</SelectItem>
                  <SelectItem value="collaborator" className="rounded-lg">Colaborador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Origem</Label>
              <Select
                value={form.origin || "Manual"}
                onValueChange={(val) => setForm({ ...form, origin: val })}
              >
                <SelectTrigger className="mt-1 h-10 rounded-xl bg-secondary/20 border-none transition-all">
                  <SelectValue placeholder="Origem do lead" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-[hsl(var(--border-strong))] bg-card">
                  <SelectItem value="Meta Ads" className="rounded-lg">Meta Ads</SelectItem>
                  <SelectItem value="Google Ads" className="rounded-lg">Google Ads</SelectItem>
                  <SelectItem value="Website" className="rounded-lg">Website</SelectItem>
                  <SelectItem value="Indicação" className="rounded-lg">Indicação</SelectItem>
                  <SelectItem value="Evento" className="rounded-lg">Evento</SelectItem>
                  <SelectItem value="Outbound" className="rounded-lg">Outbound</SelectItem>
                  <SelectItem value="WhatsApp" className="rounded-lg">WhatsApp</SelectItem>
                  <SelectItem value="Instagram" className="rounded-lg">Instagram</SelectItem>
                  <SelectItem value="Manual" className="rounded-lg">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* UTM / Atribuição opcional */}
          <details className="space-y-2 group">
            <summary className="cursor-pointer text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1 hover:text-foreground transition-colors">
              📊 Rastreamento (UTM/Anúncios) — opcional
            </summary>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">UTM Source</Label>
                <Input value={form.utm_source ?? ""} onChange={(e) => setForm({ ...form, utm_source: e.target.value })} placeholder="facebook" className="mt-1 h-9 rounded-xl text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">UTM Medium</Label>
                <Input value={form.utm_medium ?? ""} onChange={(e) => setForm({ ...form, utm_medium: e.target.value })} placeholder="cpc" className="mt-1 h-9 rounded-xl text-xs" />
              </div>
              <div className="col-span-2">
                <Label className="text-[10px] text-muted-foreground">UTM Campaign</Label>
                <Input value={form.utm_campaign ?? ""} onChange={(e) => setForm({ ...form, utm_campaign: e.target.value })} placeholder="black-friday-2026" className="mt-1 h-9 rounded-xl text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">UTM Content</Label>
                <Input value={form.utm_content ?? ""} onChange={(e) => setForm({ ...form, utm_content: e.target.value })} placeholder="banner-superior" className="mt-1 h-9 rounded-xl text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">UTM Term</Label>
                <Input value={form.utm_term ?? ""} onChange={(e) => setForm({ ...form, utm_term: e.target.value })} placeholder="palavra-chave" className="mt-1 h-9 rounded-xl text-xs" />
              </div>
            </div>
          </details>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Telefone</Label>
              <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+55 11 9..." className="mt-1 h-10 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Email</Label>
              <Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" className="mt-1 h-10 rounded-xl" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Empresa</Label>
              <Input value={form.company ?? ""} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Empresa" className="mt-1 h-10 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Valor (R$)</Label>
              <Input type="number" value={form.value ?? ""} onChange={(e) => setForm({ ...form, value: e.target.value ? Number(e.target.value) : undefined })} placeholder="0" className="mt-1 h-10 rounded-xl" />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Tags</Label>
            <div className="flex gap-2 isolate">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Ex: enterprise, quente"
                className="h-10 rounded-xl"
              />
              <Button type="button" variant="secondary" size="icon" className="shrink-0 h-10 w-10 rounded-xl" onClick={handleAddTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {form.tags && form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {form.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-[10px] pl-2 pr-1 py-1 flex items-center gap-1 bg-primary/10 text-primary border border-[hsl(var(--border-strong))]">
                    {tag}
                    <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:bg-primary/20 rounded-full p-0.5 transition-colors">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="mt-8 gap-2">
          <Button variant="ghost" onClick={onClose} className="rounded-xl grow h-11">Cancelar</Button>
          <Button onClick={() => { if (form.name?.trim()) onSave(form); }} disabled={!form.name?.trim()} className="rounded-xl grow bg-primary hover:bg-[#e04400] text-primary-foreground h-11">
            {lead ? "Salvar Alterações" : "Criar Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
