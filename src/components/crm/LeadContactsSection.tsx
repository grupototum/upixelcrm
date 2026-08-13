import { useState } from "react";
import { UserCheck, Shield, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLeadContacts } from "@/hooks/useLeadContacts";
import type { ContactRole, LeadContact } from "@/types";

const ROLE_LABELS: Record<ContactRole, string> = { decisor: "Decisor", atendente: "Atendente" };

function ContactRow({ contact, onEdit, onDelete }: { contact: LeadContact; onEdit: () => void; onDelete: () => void }) {
  const Icon = contact.role === "decisor" ? UserCheck : Shield;
  return (
    <div className="flex items-center justify-between gap-2 text-sm group">
      <div className="flex items-center gap-2 min-w-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </TooltipTrigger>
          <TooltipContent>{ROLE_LABELS[contact.role]}</TooltipContent>
        </Tooltip>
        <span className="truncate font-medium">{contact.name}</span>
        {contact.phone && <span className="text-xs text-muted-foreground shrink-0">{contact.phone}</span>}
        {contact.email && <span className="text-xs text-muted-foreground truncate">{contact.email}</span>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={onEdit}>
          <Pencil className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive" onClick={onDelete}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

interface LeadContactsSectionProps {
  leadId: string;
}

export function LeadContactsSection({ leadId }: LeadContactsSectionProps) {
  const { contacts, isLoading, addContact, updateContact, removeContact } = useLeadContacts(leadId);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<LeadContact | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState<ContactRole>("decisor");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<LeadContact | null>(null);
  const [saving, setSaving] = useState(false);

  const decisores = contacts.filter((c) => c.role === "decisor");
  const atendentes = contacts.filter((c) => c.role === "atendente");

  function openCreate() {
    setEditingContact(null);
    setName(""); setRole("decisor"); setPhone(""); setEmail(""); setNotes("");
    setModalOpen(true);
  }

  function openEdit(contact: LeadContact) {
    setEditingContact(contact);
    setName(contact.name);
    setRole(contact.role);
    setPhone(contact.phone || "");
    setEmail(contact.email || "");
    setNotes(contact.notes || "");
    setModalOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    const data = {
      name: name.trim(), role,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    if (editingContact) {
      await updateContact(editingContact.id, data);
    } else {
      await addContact(data);
    }
    setSaving(false);
    setModalOpen(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await removeContact(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contatos</h3>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={openCreate}>
          <Plus className="h-3 w-3" /> Adicionar
        </Button>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando...</p>
      ) : contacts.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum contato cadastrado. Adicione o decisor e o atendente.</p>
      ) : (
        <div className="space-y-3">
          {decisores.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Decisores</p>
              {decisores.map((c) => (
                <ContactRow key={c.id} contact={c} onEdit={() => openEdit(c)} onDelete={() => setDeleteTarget(c)} />
              ))}
            </div>
          )}
          {atendentes.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Atendentes</p>
              {atendentes.map((c) => (
                <ContactRow key={c.id} contact={c} onEdit={() => openEdit(c)} onDelete={() => setDeleteTarget(c)} />
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingContact ? "Editar contato" : "Adicionar contato"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do contato" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Papel</Label>
              <Select value={role} onValueChange={(v) => setRole(v as ContactRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="decisor">Decisor</SelectItem>
                  <SelectItem value="atendente">Atendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-0000" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@empresa.com" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notas</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[60px] resize-none text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {deleteTarget?.name}?</AlertDialogTitle>
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
