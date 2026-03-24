import { useMemo, useState } from "react";
import { z } from "zod";
import { AppLayout } from "@/components/layout/AppLayout";
import { Plus, Mail, Shield, PencilLine, Users as UsersIcon } from "lucide-react";
import type { User } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ComingSoonBadge } from "@/components/ui/coming-soon";
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
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormValues>(defaultForm);
  const [errors, setErrors] = useState<FormErrors>({});

  const stats = useMemo(() => ([
    { label: "Usuários", value: users.length },
    { label: "Admins", value: users.filter((user) => user.role === "admin").length },
    { label: "Operação", value: users.filter((user) => user.role !== "admin").length },
  ]), [users]);

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
      setUsers((currentUsers) =>
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
      setUsers((currentUsers) => [...currentUsers, newUser]);
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
            <div key={stat.label} className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <UsersIcon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        <section className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Lista de usuários</h2>
              <p className="text-xs text-muted-foreground">Cadastre e edite usuários com nome, e-mail e função.</p>
            </div>
            <Badge variant="outline" className="text-[10px]">
              {users.length} cadastrados
            </Badge>
          </div>

          <div className="divide-y divide-border">
            {users.map((user) => (
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
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => openEditModal(user)}>
                    <PencilLine className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
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
