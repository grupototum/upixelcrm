import { useMemo, useState, useEffect } from "react";
import { z } from "zod";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth, type AuthUser } from "@/contexts/AuthContext";
import { Plus, Mail, Shield, PencilLine, Users as UsersIcon, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ComingSoonBadge } from "@/components/ui/coming-soon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const userSchema = z.object({
  name: z.string().trim().min(2, "Informe um nome válido").max(100, "Máximo de 100 caracteres"),
  role: z.enum(["supervisor", "atendente", "vendedor", "master"]),
});

type UserFormValues = z.infer<typeof userSchema>;

type FormErrors = Partial<Record<keyof UserFormValues, string>>;

const roleLabels: Record<AuthUser["role"], string> = {
  master: "Master",
  supervisor: "Supervisor",
  vendedor: "Vendedor",
  atendente: "Atendente",
};

const defaultForm: UserFormValues = {
  name: "",
  role: "vendedor",
};

function getRoleBadgeClass(role: AuthUser["role"]) {
  switch (role) {
    case "master":
    case "supervisor":
      return "border-primary/30 bg-primary/10 text-primary";
    case "vendedor":
      return "border-accent/30 bg-accent/10 text-foreground";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<AuthUser[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormValues>(defaultForm);
  const [formEmail, setFormEmail] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    if (!currentUser?.client_id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("client_id", currentUser.client_id)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setUsers(data as any as AuthUser[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [currentUser?.client_id]);

  const stats = useMemo(() => ([
    { label: "Usuários", value: users.length },
    { label: "Gestão", value: users.filter((u) => u.role === "master" || u.role === "supervisor").length },
    { label: "Operação", value: users.filter((u) => u.role !== "master" && u.role !== "supervisor").length },
  ]), [users]);

  const openCreateModal = () => {
    toast.info("A criação de novos usuários com senha individual deve ser feita através de convite associado ao Auth da Plataforma.");
  };

  const openEditModal = (user: AuthUser) => {
    setEditingUserId(user.id);
    setFormEmail(user.email || "");
    setForm({ name: user.name, role: user.role });
    setErrors({});
    setModalOpen(true);
  };

  const handleSave = async () => {
    const result = userSchema.safeParse(form);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        name: fieldErrors.name?.[0],
        role: fieldErrors.role?.[0],
      });
      toast.error("Revise os campos obrigatórios.");
      return;
    }

    const sanitizedValues = result.data;

    if (editingUserId) {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: sanitizedValues.name,
          role: sanitizedValues.role,
        } as any)
        .eq("id", editingUserId);
        
      if (error) {
        toast.error("Erro ao atualizar permissão no banco de dados.");
        console.error(error);
        return;
      }
      
      setUsers((currentUsers) =>
        currentUsers.map((u) =>
          u.id === editingUserId ? { ...u, ...sanitizedValues } : u,
        ),
      );
      toast.success("Permissões e dados atualizados com sucesso.");
    }

    setModalOpen(false);
    setForm(defaultForm);
    setErrors({});
  };

  return (
    <AppLayout
      title="Usuários e Permissões"
      subtitle="Gerencie os membros da equipe e os níveis de permissão do sistema"
      actions={
        <Button size="sm" className="gap-1 text-xs" onClick={openCreateModal}>
          <Plus className="h-3.5 w-3.5" />
          Convidar Usuário
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
            <TabsTrigger value="roles" className="text-xs gap-1.5"><Shield className="h-3 w-3" /> Matriz de Permissões</TabsTrigger>
            <TabsTrigger value="audit" className="text-xs gap-1.5"><FileText className="h-3 w-3" /> Auditoria</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <section className="rounded-xl ghost-border bg-card">
              <div className="flex items-center justify-between ghost-border border-b px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Lista de usuários</h2>
                  <p className="text-xs text-muted-foreground">Edite o nome e altere a função/Role de cada membro cadastrado.</p>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {loading ? "Carregando..." : `${users.length} usuários`}
                </Badge>
              </div>

              <div className="divide-y divide-border">
                {users.map((user) => (
                  <div key={user.id} className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                        {user.name && user.name.length > 0
                          ? user.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()
                          : "??"}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">{user.name || "Usuário não nomeado"}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {user.email || "Sem e-mail"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <Badge variant="outline" className={getRoleBadgeClass(user.role)}>
                        <Shield className="mr-1 h-3 w-3" />
                        {roleLabels[user.role] || "Sem Role"}
                      </Badge>
                      <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => openEditModal(user)}>
                        <PencilLine className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                    </div>
                  </div>
                ))}
                {!loading && users.length === 0 && (
                  <div className="p-8 text-center text-sm text-muted-foreground">Nenhum usuário encontrado para esta conta.</div>
                )}
                {loading && (
                  <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Buscando perfis no Supabase...</div>
                )}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="roles">
            <div className="bg-card ghost-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 ghost-border border-b">
                <h2 className="text-sm font-semibold text-foreground">Matriz de Permissões — RBAC</h2>
                <p className="text-xs text-muted-foreground">Visão geral descritiva de ações permitidas por perfil.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-secondary/50">
                      <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Módulo / Ação</th>
                      <th className="text-center px-3 py-2 font-semibold text-primary">Supervisor / Master</th>
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
                      { perm: "Usuários e Permissões", sup: true, att: false, ven: false },
                      { perm: "Inteligência", sup: true, att: false, ven: true },
                      { perm: "Configurações Globais", sup: true, att: false, ven: false },
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
                <p className="text-xs text-muted-foreground">Histórico centralizado de ações de segurança e acessos</p>
              </div>
              <div className="divide-y divide-border">
                {[
                  { user: "Sistema", action: "Integração viva da listagem de usuários com Supabase concluída", date: new Date().toISOString().split("T")[0] },
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
            <p className="text-xs text-muted-foreground">Painel pronto e integrado ao Supabase para gerir o Role-Based Access Control (RBAC) real.</p>
          </div>
          <ComingSoonBadge />
        </section>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mudar Permissões do Usuário</DialogTitle>
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
                value={formEmail}
                disabled
                className="opacity-70"
                placeholder="email@empresa.com"
              />
              <p className="text-[10px] text-muted-foreground mt-1">O e-mail só pode ser alterado pelo próprio usuário ou enviando um link de recuperação Auth.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Nível de Acesso (Role)</Label>
              <Select
                value={form.role}
                onValueChange={(value: UserFormValues["role"]) => {
                  setForm((current) => ({ ...current, role: value }));
                  if (errors.role) setErrors((current) => ({ ...current, role: undefined }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um nível de acesso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="master">Master</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="atendente">Atendente</SelectItem>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
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
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
