import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  // Fix: properly reset form when lead or open state changes
  useEffect(() => {
    if (open) {
      setForm(lead ? { ...lead } : emptyForm(defaultColumnId));
    }
  }, [open, lead, defaultColumnId]);

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
