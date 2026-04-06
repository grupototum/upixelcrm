import { useMemo, useState } from "react";
import { z } from "zod";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAppState } from "@/contexts/AppContext";
import { Plus, Mail, Shield, PencilLine, Users as UsersIcon, Clock, FileText } from "lucide-react";
import type { User } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ComingSoonBadge } from "@/components/ui/coming-soon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const userSchema = z.object({
  name: z.string().trim().min(2, "Informe um nome válido").max(100, "Máximo de 100 caracteres"),
  email: z.string().trim().email("Informe um e-mail válido").max(255, "Máximo de 255 caracteres"),
  role: z.enum(["admin", "manager", "operator"]),
});

type UserFormValues = z.infer<typeof userSchema>;

type FormErrors = Partial<Record<keyof UserFormValues, string>>;

const roleLabels: Record<User["role"], string> = {
  admin: "Admin",
  manager: "Gerente",
  operator: "Operador",
};

const initialUsers: User[] = [
  { id: "u1", client_id: "c1", name: "Admin Totum", email: "admin@totumpixel.com", role: "admin" },
  { id: "u2", client_id: "c1", name: "Maria Gerente", email: "maria@totumpixel.com", role: "manager" },
  { id: "u3", client_id: "c1", name: "João Operador", email: "joao@totumpixel.com", role: "operator" },
  { id: "u4", client_id: "c1", name: "Carla Operadora", email: "carla@totumpixel.com", role: "operator" },
];

const defaultForm: UserFormValues = {
  name: "",
  email: "",
  role: "operator",
};

function getRoleBadgeClass(role: User["role"]) {
  switch (role) {
    case "admin":
      return "border-primary/30 bg-primary/10 text-primary";
    case "manager":
      return "border-accent/30 bg-accent/10 text-foreground";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

export default function UsersPage() {
  const { leads } = useAppState();

  const [localUsers, setLocalUsers] = useState<User[]>(initialUsers);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormValues>(defaultForm);
  const [errors, setErrors] = useState<FormErrors>({});

  const crmUsers = useMemo(() => {
    return leads
      .filter((l) => l.category === "collaborator" || l.category === "partner")
      .map((l) => ({
        id: l.id,
        client_id: l.client_id,
        name: l.name,
        email: l.email || l.phone || "-",
        role: l.category === "partner" ? "operator" as const : "manager" as const,
        isExternal: true, // flag to prevent edit
        category: l.category,
      }));
  }, [leads]);

  const allUsers = useMemo(() => [...localUsers, ...crmUsers], [localUsers, crmUsers]);

  const stats = useMemo(() => ([
    { label: "Usuários", value: allUsers.length },
    { label: "Admins", value: allUsers.filter((user) => user.role === "admin").length },
    { label: "Operação", value: allUsers.filter((user) => user.role !== "admin").length },
  ]), [allUsers]);

  const openCreateModal = () => {
    setEditingUserId(null);
    setForm(defaultForm);
    setErrors({});
    setModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUserId(user.id);
    setForm({ name: user.name, email: user.email, role: user.role });
    setErrors({});
    setModalOpen(true);
  };

  const handleSave = () => {
    const result = userSchema.safeParse(form);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        name: fieldErrors.name?.[0],
        email: fieldErrors.email?.[0],
        role: fieldErrors.role?.[0],
      });
      toast.error("Revise os campos obrigatórios.");
      return;
    }

    const sanitizedValues = result.data;

    if (editingUserId) {
      setLocalUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === editingUserId ? { ...user, ...sanitizedValues } : user,
        ),
      );
      toast.success("Usuário atualizado com sucesso.");
    } else {
      const newUser: User = {
        id: `u${Date.now()}`,
        client_id: "c1",
        name: sanitizedValues.name,
        email: sanitizedValues.email,
        role: sanitizedValues.role,
      };
      setLocalUsers((currentUsers) => [...currentUsers, newUser]);
      toast.success("Usuário criado com sucesso.");
    }

    setModalOpen(false);
    setForm(defaultForm);
    setErrors({});
  };

  return (
    <AppLayout
      title="Usuários"
      subtitle="Gerencie sua equipe e a função de cada usuário"
      actions={
        <Button size="sm" className="gap-1 text-xs" onClick={openCreateModal}>
          <Plus className="h-3.5 w-3.5" />
          Novo usuário
        </Button>
      }
    >
      <div className="animate-fade-in space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl ghost-border bg-card p-4">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
                <UsersIcon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="users">
          <TabsList className="bg-secondary mb-4">
            <TabsTrigger value="users" className="text-xs gap-1.5"><UsersIcon className="h-3 w-3" /> Usuários</TabsTrigger>
            <TabsTrigger value="roles" className="text-xs gap-1.5"><Shield className="h-3 w-3" /> Roles / Permissões</TabsTrigger>
            <TabsTrigger value="audit" className="text-xs gap-1.5"><FileText className="h-3 w-3" /> Auditoria</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
        <section className="rounded-xl ghost-border bg-card">
          <div className="flex items-center justify-between ghost-border border-b px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Lista de usuários</h2>
              <p className="text-xs text-muted-foreground">Cadastre e edite usuários com nome, e-mail e função.</p>
            </div>
            <Badge variant="outline" className="text-[10px]">
              {allUsers.length} cadastrados
            </Badge>
          </div>

          <div className="divide-y divide-border">
            {allUsers.map((user) => (
              <div key={user.id} className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                    {user.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">{user.name}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <Badge variant="outline" className={getRoleBadgeClass(user.role)}>
                    <Shield className="mr-1 h-3 w-3" />
                    {roleLabels[user.role]}
                  </Badge>
                  {(user as any).isExternal && (
                    <Badge variant="outline" className={(user as any).category === "partner" ? "border-blue-500/30 text-blue-500" : "border-purple-500/30 text-purple-500"}>
                      {(user as any).category === "partner" ? "Parceiro" : "Colaborador"}
                    </Badge>
                  )}
                  {!(user as any).isExternal && (
                    <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => openEditModal(user)}>
                      <PencilLine className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
          </TabsContent>

          <TabsContent value="roles">
            <div className="bg-card ghost-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 ghost-border border-b">
                <h2 className="text-sm font-semibold text-foreground">Matriz de Permissões — RBAC</h2>
                <p className="text-xs text-muted-foreground">Quem pode acessar cada módulo do sistema</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-secondary/50">
                      <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Permissão</th>
                      <th className="text-center px-3 py-2 font-semibold text-primary">Supervisor</th>
                      <th className="text-center px-3 py-2 font-semibold text-accent">Atendente</th>
                      <th className="text-center px-3 py-2 font-semibold text-muted-foreground">Vendedor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[
                      { perm: "CRM — Visualizar", sup: true, att: true, ven: true },
                      { perm: "CRM — Editar", sup: true, att: false, ven: true },
                      { perm: "CRM — Excluir", sup: true, att: false, ven: false },
                      { perm: "CRM — Exportar", sup: true, att: false, ven: true },
                      { perm: "CRM — Transferir", sup: true, att: false, ven: false },
                      { perm: "Inbox — Visualizar", sup: true, att: true, ven: true },
                      { perm: "Inbox — Responder", sup: true, att: true, ven: false },
                      { perm: "Tarefas — Criar", sup: true, att: true, ven: true },
                      { perm: "Tarefas — Excluir", sup: true, att: false, ven: false },
                      { perm: "Automações", sup: true, att: false, ven: false },
                      { perm: "Relatórios", sup: true, att: false, ven: false },
                      { perm: "Usuários", sup: true, att: false, ven: false },
                      { perm: "Inteligência", sup: true, att: false, ven: true },
                      { perm: "Configurações", sup: true, att: false, ven: false },
                    ].map((row) => (
                      <tr key={row.perm} className="hover:bg-card-hover transition-colors">
                        <td className="px-4 py-2 font-medium text-foreground">{row.perm}</td>
                        <td className="text-center px-3 py-2">{row.sup ? "✅" : "❌"}</td>
                        <td className="text-center px-3 py-2">{row.att ? "✅" : "❌"}</td>
                        <td className="text-center px-3 py-2">{row.ven ? "✅" : "❌"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="audit">
            <div className="bg-card ghost-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 ghost-border border-b">
                <h2 className="text-sm font-semibold text-foreground">Log de Auditoria</h2>
                <p className="text-xs text-muted-foreground">Histórico de ações administrativas</p>
              </div>
              <div className="divide-y divide-border">
                {[
                  { user: "Admin Totum", action: "Criou usuário Maria Gerente", date: "2026-03-25 14:30" },
                  { user: "Admin Totum", action: "Alterou role de João para Vendedor", date: "2026-03-25 10:15" },
                  { user: "Admin Totum", action: "Exportou relatório de leads", date: "2026-03-24 16:45" },
                  { user: "Sistema", action: "Backup automático realizado", date: "2026-03-24 03:00" },
                  { user: "Admin Totum", action: "Ativou automação Follow-up 24h", date: "2026-03-23 11:20" },
                ].map((log, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-card-hover transition-colors">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{log.action}</p>
                      <p className="text-[10px] text-muted-foreground">{log.user} · {log.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <section className="flex items-center justify-between rounded-xl ghost-border bg-card p-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Permissões avançadas</h3>
            <p className="text-xs text-muted-foreground">Controle granular por módulo, recurso e equipe ficará disponível em breve.</p>
          </div>
          <ComingSoonBadge />
        </section>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUserId ? "Editar usuário" : "Novo usuário"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="user-name" className="text-xs">Nome</Label>
              <Input
                id="user-name"
                value={form.name}
                maxLength={100}
                placeholder="Nome completo"
                onChange={(event) => {
                  setForm((current) => ({ ...current, name: event.target.value }));
                  if (errors.name) setErrors((current) => ({ ...current, name: undefined }));
                }}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-email" className="text-xs">E-mail</Label>
              <Input
                id="user-email"
                type="email"
                value={form.email}
                maxLength={255}
                placeholder="email@empresa.com"
                onChange={(event) => {
                  setForm((current) => ({ ...current, email: event.target.value }));
                  if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
                }}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Função</Label>
              <Select
                value={form.role}
                onValueChange={(value: UserFormValues["role"]) => {
                  setForm((current) => ({ ...current, role: value }));
                  if (errors.role) setErrors((current) => ({ ...current, role: undefined }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Gerente</SelectItem>
                  <SelectItem value="operator">Operador</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && <p className="text-xs text-destructive">{errors.role}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
