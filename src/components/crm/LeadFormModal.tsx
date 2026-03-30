import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
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
  name: "", phone: "", email: "", company: "", position: "", tags: [], column_id: columnId, value: undefined, origin: "",
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Valor (R$)</Label>
              <Input type="number" value={form.value ?? ""} onChange={(e) => setForm({ ...form, value: e.target.value ? Number(e.target.value) : undefined })} placeholder="0" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Origem</Label>
              <Input value={form.origin ?? ""} onChange={(e) => setForm({ ...form, origin: e.target.value })} placeholder="Meta Ads, Google..." className="mt-1" />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs">Tags</Label>
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
                className="mt-1"
              />
              <Button type="button" variant="secondary" size="icon" className="mt-1 shrink-0" onClick={handleAddTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {form.tags && form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {form.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-[10px] pl-2 pr-1 py-0.5 flex items-center gap-1 bg-primary/10 text-primary hover:bg-primary/20">
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
