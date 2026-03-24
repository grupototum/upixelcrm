import { AppLayout } from "@/components/layout/AppLayout";
import { Plus, MoreHorizontal, Shield, Mail, Pencil, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ComingSoonBadge } from "@/components/ui/coming-soon";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "operator";
  status: "active" | "inactive";
}

const roleLabels: Record<UserItem["role"], string> = { admin: "Admin", manager: "Gerente", operator: "Operador" };

const initialUsers: UserItem[] = [
  { id: "u1", name: "Admin uPixel", email: "admin@upixel.com", role: "admin", status: "active" },
  { id: "u2", name: "João Operador", email: "joao@upixel.com", role: "operator", status: "active" },
  { id: "u3", name: "Maria Gerente", email: "maria@upixel.com", role: "manager", status: "active" },
  { id: "u4", name: "Carlos Suporte", email: "carlos@upixel.com", role: "operator", status: "inactive" },
];

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserItem | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "operator" as UserItem["role"] });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", email: "", role: "operator" });
    setModalOpen(true);
  };

  const openEdit = (u: UserItem) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, role: u.role });
    setModalOpen(true);
  };

  const handleSave = () => {
    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim();
    if (!trimmedName || !trimmedEmail) { toast.error("Preencha nome e e-mail."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) { toast.error("E-mail inválido."); return; }

    if (editing) {
      setUsers(prev => prev.map(u => u.id === editing.id ? { ...u, name: trimmedName, email: trimmedEmail, role: form.role } : u));
      toast.success("Usuário atualizado.");
    } else {
      const newUser: UserItem = { id: `u${Date.now()}`, name: trimmedName, email: trimmedEmail, role: form.role, status: "active" };
      setUsers(prev => [...prev, newUser]);
      toast.success("Usuário criado.");
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    toast.success("Usuário removido.");
  };

  const toggleStatus = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: u.status === "active" ? "inactive" : "active" } : u));
  };

  return (
    <AppLayout
      title="Usuários"
      subtitle="Gestão de equipe e permissões"
      actions={<Button size="sm" className="text-xs gap-1 bg-primary hover:bg-primary-hover text-primary-foreground" onClick={openCreate}><Plus className="h-3 w-3" /> Novo Usuário</Button>}
    >
      <div className="p-6 space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total", value: users.length, icon: Users },
            { label: "Ativos", value: users.filter(u => u.status === "active").length, icon: Shield },
            { label: "Inativos", value: users.filter(u => u.status === "inactive").length, icon: Mail },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                <s.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{s.value}</p>
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Users list */}
        <div className="bg-card border border-border rounded-lg divide-y divide-border">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between p-4 hover:bg-card-hover transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
                  {u.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-[10px] gap-1"><Shield className="h-3 w-3" />{roleLabels[u.role]}</Badge>
                <button onClick={() => toggleStatus(u.id)} className={`px-2 py-0.5 rounded-full text-[10px] font-medium cursor-pointer transition-colors ${u.status === "active" ? "bg-success/15 text-success hover:bg-success/25" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                  {u.status === "active" ? "Ativo" : "Inativo"}
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(u)} className="text-xs gap-2"><Pencil className="h-3 w-3" /> Editar</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(u.id)} className="text-xs gap-2 text-destructive"><Trash2 className="h-3 w-3" /> Remover</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>

        {/* Coming soon */}
        <div className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Permissões Granulares e Equipes</h3>
            <p className="text-xs text-muted-foreground">Controle detalhado de acesso por módulo, equipes e convites.</p>
          </div>
          <ComingSoonBadge />
        </div>
      </div>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">{editing ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome</Label>
              <Input placeholder="Nome completo" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">E-mail</Label>
              <Input type="email" placeholder="email@exemplo.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} maxLength={255} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Função</Label>
              <Select value={form.role} onValueChange={(v) => setForm(f => ({ ...f, role: v as UserItem["role"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Gerente</SelectItem>
                  <SelectItem value="operator">Operador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button size="sm" className="bg-primary hover:bg-primary-hover text-primary-foreground" onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
