import { useState } from "react";
import {
  Smartphone, Phone, MessageCircle, Briefcase, MoreHorizontal,
  Plus, Pencil, Trash2, ExternalLink, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLeadPhones } from "@/hooks/useLeadPhones";
import { waLink } from "@/utils/phone";
import type { LeadPhone, PhoneCategory } from "@/types";

const CATEGORY_CONFIG: Record<PhoneCategory, { icon: LucideIcon; label: string }> = {
  celular: { icon: Smartphone, label: "Celular" },
  fixo: { icon: Phone, label: "Fixo" },
  whatsapp: { icon: MessageCircle, label: "WhatsApp" },
  comercial: { icon: Briefcase, label: "Comercial" },
  outro: { icon: MoreHorizontal, label: "Outro" },
};

interface LeadPhonesSectionProps {
  leadId: string;
}

export function LeadPhonesSection({ leadId }: LeadPhonesSectionProps) {
  const { phones, isLoading, addPhone, updatePhone, removePhone } = useLeadPhones(leadId);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPhone, setEditingPhone] = useState<LeadPhone | null>(null);
  const [number, setNumber] = useState("");
  const [category, setCategory] = useState<PhoneCategory>("celular");
  const [label, setLabel] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<LeadPhone | null>(null);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditingPhone(null);
    setNumber("");
    setCategory("celular");
    setLabel("");
    setModalOpen(true);
  }

  function openEdit(phone: LeadPhone) {
    setEditingPhone(phone);
    setNumber(phone.number);
    setCategory(phone.category);
    setLabel(phone.label || "");
    setModalOpen(true);
  }

  async function handleSave() {
    if (!number.trim()) return;
    setSaving(true);
    const trimmedLabel = category === "outro" ? label.trim() || null : null;
    if (editingPhone) {
      await updatePhone(editingPhone.id, { number: number.trim(), category, label: trimmedLabel });
    } else {
      await addPhone({ number: number.trim(), category, label: trimmedLabel || undefined });
    }
    setSaving(false);
    setModalOpen(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await removePhone(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Outros telefones</h3>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={openCreate}>
          <Plus className="h-3 w-3" /> Adicionar
        </Button>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando...</p>
      ) : phones.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum outro telefone cadastrado.</p>
      ) : (
        <div className="space-y-2">
          {phones.map((phone) => {
            const config = CATEGORY_CONFIG[phone.category];
            const Icon = config.icon;
            return (
              <div key={phone.id} className="flex items-center justify-between gap-2 text-sm group">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{phone.number}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {phone.category === "outro" && phone.label ? phone.label : config.label}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {phone.category === "whatsapp" && (
                    <a
                      href={waLink(phone.number)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-green-600 hover:underline flex items-center gap-1 mr-1"
                    >
                      Abrir WA <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => openEdit(phone)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => setDeleteTarget(phone)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingPhone ? "Editar telefone" : "Adicionar telefone"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Número</Label>
              <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="(11) 99999-0000" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Categoria</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as PhoneCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORY_CONFIG) as PhoneCategory[]).map((key) => (
                    <SelectItem key={key} value={key}>{CATEGORY_CONFIG[key].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {category === "outro" && (
              <div className="space-y-1">
                <Label className="text-xs">Rótulo</Label>
                <Input value={label} onChange={(e) => setLabel(e.target.value.slice(0, 50))} placeholder="Ex: Suporte TI, Recepção..." />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !number.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {deleteTarget?.number}?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
