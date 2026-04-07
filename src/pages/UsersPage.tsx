import { useEffect, useState, useMemo } from "react";
import { z } from "zod";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Users, Building2, Shield, Mail, Search, Ban, CheckCircle2,
  PencilLine, Trash2, UserPlus, UserMinus, ChevronDown, ChevronUp, Loader2, Clock, FileText, Plus
} from "lucide-react";
import { ComingSoonBadge } from "@/components/ui/coming-soon";

interface ProfileRow {
  id: string;
  name: string;
  email: string | null;
  role: string;
  is_blocked: boolean;
  client_id: string;
  organization_id: string | null;
  created_at: string;
  org_name?: string;
}

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  owner_id: string | null;
  created_at: string;
  member_count?: number;
  owner_name?: string;
  members?: ProfileRow[];
}

export default function UsersPage() {
  const { user } = useAuth();
  
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Edit Role Modal
  const [editModal, setEditModal] = useState<ProfileRow | null>(null);
  const [editRole, setEditRole] = useState("");
  
  // Orgs specific
  const [orgSearch, setOrgSearch] = useState("");
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);
  const [addMemberModal, setAddMemberModal] = useState<OrgRow | null>(null);
  const [addMemberEmail, setAddMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  const isMaster = user?.role === "master";

  const fetchData = async () => {
    setLoading(true);
    
    // Default queries
    let profilesQuery = supabase.from("profiles").select("*").order("created_at", { ascending: false });
    
    const [profilesRes, orgsRes] = await Promise.all([
      profilesQuery,
      isMaster ? supabase.from("organizations").select("*").order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    ]);

    let profilesList = (profilesRes.data || []) as ProfileRow[];
    const orgsList = (orgsRes.data || []) as OrgRow[];

    // If not master, filter only profiles from the user's organization
    if (!isMaster && user?.organizationId) {
      profilesList = profilesList.filter(p => p.organization_id === user.organizationId || p.id === user.id);
    }

    const orgMap = new Map(orgsList.map(o => [o.id, o.name]));
    for (const p of profilesList) {
      if (p.organization_id) p.org_name = orgMap.get(p.organization_id) || "—";
    }

    if (isMaster) {
      for (const o of orgsList) {
        o.members = profilesList.filter(p => p.organization_id === o.id);
        o.member_count = o.members.length;
        const owner = profilesList.find(p => p.id === o.owner_id);
        o.owner_name = owner?.name || "—";
      }
    }

    setProfiles(profilesList);
    setOrgs(orgsList);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [isMaster, user]);

  const filteredProfiles = profiles.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const filteredOrgs = orgs.filter(o =>
    o.name.toLowerCase().includes(orgSearch.toLowerCase()) ||
    o.slug.toLowerCase().includes(orgSearch.toLowerCase())
  );

  const toggleBlock = async (profile: ProfileRow) => {
    // Check if user has permission to block (master or supervisor of the same org)
    if (!isMaster && (user?.role !== "supervisor" || profile.organization_id !== user?.organizationId)) {
        toast.error("Você não tem permissão para bloquear este usuário.");
        return;
    }

    const { error } = await supabase.rpc("admin_toggle_block" as any, {
      target_user_id: profile.id,
      block_status: !profile.is_blocked,
    });
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success(profile.is_blocked ? "Usuário desbloqueado" : "Usuário bloqueado");
    fetchData();
  };

  const saveRole = async () => {
    if (!editModal) return;

    if (!isMaster && (user?.role !== "supervisor" || editModal.organization_id !== user?.organizationId)) {
        toast.error("Você não tem permissão para alterar a permissão deste usuário.");
        setEditModal(null);
        return;
    }

    const { error } = await supabase.rpc("admin_set_role" as any, {
      target_user_id: editModal.id,
      new_role: editRole,
    });
    if (error) { toast.error("Erro ao atualizar o role: " + error.message); return; }
    toast.success("Permissão atualizada com sucesso.");
    setEditModal(null);
    fetchData();
  };

  // Org actions (Master only)
  const deleteOrg = async (org: OrgRow) => {
    if (!isMaster) return;
    if (!confirm(`Excluir a empresa "${org.name}"? Membros perderão o vínculo.`)) return;
    if (org.members && org.members.length > 0) {
      for (const m of org.members) {
        await supabase.rpc("admin_remove_org_member" as any, { target_user_id: m.id });
      }
    }
    const { error } = await supabase.from("organizations").delete().eq("id", org.id);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Empresa excluída");
    fetchData();
  };

  const handleAddMember = async () => {
    if (!addMemberModal || !addMemberEmail.trim()) return;
    setAddingMember(true);
    try {
      const target = profiles.find(p => p.email?.toLowerCase() === addMemberEmail.trim().toLowerCase());
      if (!target) {
        toast.error("Usuário não encontrado. Ele precisa ter uma conta cadastrada.");
        return;
      }
      if (target.organization_id) {
        toast.error("Esse usuário já pertence a uma empresa. Remova-o primeiro.");
        return;
      }
      const { error } = await supabase.rpc("admin_add_org_member" as any, {
        target_user_id: target.id,
        target_org_id: addMemberModal.id,
      });
      if (error) throw error;
      toast.success(`${target.name} adicionado à empresa!`);
      setAddMemberModal(null);
      setAddMemberEmail("");
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Erro ao adicionar membro");
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (member: ProfileRow, org: OrgRow) => {
    if (member.id === org.owner_id) {
      toast.error("Não é possível remover o proprietário da empresa.");
      return;
    }
    if (!confirm(`Remover ${member.name} da empresa ${org.name}?`)) return;
    const { error } = await supabase.rpc("admin_remove_org_member" as any, { target_user_id: member.id });
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success(`${member.name} removido da empresa`);
    fetchData();
  };

  const roleBadge = (role: string) => {
    const map: Record<string, string> = {
      master: "border-red-500/30 bg-red-500/10 text-red-500",
      supervisor: "border-primary/30 bg-primary/10 text-primary",
      atendente: "border-blue-500/30 bg-blue-500/10 text-blue-500",
      vendedor: "border-muted-foreground/30 bg-muted text-muted-foreground",
    };
    return map[role] || map.vendedor;
  };

  const stats = [
    { label: "Total Usuários", value: profiles.length, icon: Users },
    { label: "Bloqueados", value: profiles.filter(p => p.is_blocked).length, icon: Ban },
    ...(isMaster ? [
      { label: "Empresas", value: orgs.length, icon: Building2 },
      { label: "Masters", value: profiles.filter(p => p.role === "master").length, icon: Shield },
    ] : [
      { label: "Supervisores", value: profiles.filter(p => p.role === "supervisor").length, icon: Shield },
      { label: "Vendedores", value: profiles.filter(p => p.role === "vendedor").length, icon: Users },
    ])
  ];

  return (
    <AppLayout title="Usuários & Permissões" subtitle="Gerencie acesso, as permissões e sua equipe">
      <div className="animate-fade-in space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl ghost-border bg-card p-4">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
                <s.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-semibold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="users">
          <TabsList className="bg-secondary mb-4">
            <TabsTrigger value="users" className="text-xs gap-1.5"><Users className="h-3 w-3" /> Usuários</TabsTrigger>
            {isMaster && <TabsTrigger value="orgs" className="text-xs gap-1.5"><Building2 className="h-3 w-3" /> Empresas</TabsTrigger>}
            <TabsTrigger value="roles" className="text-xs gap-1.5"><Shield className="h-3 w-3" /> Matriz de Permissões</TabsTrigger>
            <TabsTrigger value="audit" className="text-xs gap-1.5"><FileText className="h-3 w-3" /> Auditoria</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <div className="rounded-xl ghost-border bg-card">
              <div className="flex items-center justify-between ghost-border border-b px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Lista de Usuários</h2>
                  <p className="text-xs text-muted-foreground">Visão geral dos colaboradores e suas permissões</p>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Buscar usuário..." className="pl-8 h-9 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>
              
              {loading ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Carregando...</div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredProfiles.map((p) => (
                    <div key={p.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold ${p.is_blocked ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`}>
                          {p.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground flex items-center gap-2">
                            {p.name}
                            {p.is_blocked && <Badge variant="destructive" className="text-[9px] px-1.5 py-0">Bloqueado</Badge>}
                          </p>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" /> {p.email || "—"}</p>
                          {isMaster && p.org_name && <p className="flex items-center gap-1 text-[10px] text-muted-foreground"><Building2 className="h-2.5 w-2.5" /> {p.org_name}</p>}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={roleBadge(p.role)}><Shield className="mr-1 h-3 w-3" /> {p.role}</Badge>
                        {(isMaster || user?.role === "supervisor") && (
                            <>
                                <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => { setEditModal(p); setEditRole(p.role || "vendedor"); }}>
                                <PencilLine className="h-3 w-3" /> Mudar Permissão
                                </Button>
                                {p.id !== user?.id && (
                                    <Button variant={p.is_blocked ? "default" : "destructive"} size="sm" className="gap-1 text-xs" onClick={() => toggleBlock(p)}>
                                    {p.is_blocked ? <CheckCircle2 className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                                    {p.is_blocked ? "Desbloquear" : "Bloquear"}
                                    </Button>
                                )}
                            </>
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredProfiles.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Nenhum usuário encontrado.</p>}
                </div>
              )}
            </div>
          </TabsContent>

          {isMaster && (
            <TabsContent value="orgs">
              <div className="rounded-xl ghost-border bg-card">
                <div className="flex items-center justify-between ghost-border border-b px-4 py-3">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Todas as empresas</h2>
                    <p className="text-xs text-muted-foreground">Gerencie organizações e seus membros</p>
                  </div>
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input placeholder="Buscar empresa..." className="pl-8 h-9 text-xs" value={orgSearch} onChange={(e) => setOrgSearch(e.target.value)} />
                  </div>
                </div>
                {loading ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">Carregando...</div>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredOrgs.map((o) => (
                      <div key={o.id} className="px-4 py-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent-foreground">
                              <Building2 className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{o.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Dono: {o.owner_name} · {o.member_count} membro{o.member_count !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setExpandedOrg(expandedOrg === o.id ? null : o.id)}>
                              {expandedOrg === o.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              Membros
                            </Button>
                            <Button variant="outline" size="sm" className="gap-1 text-xs text-primary" onClick={() => { setAddMemberModal(o); setAddMemberEmail(""); }}>
                              <UserPlus className="h-3 w-3" /> Adicionar
                            </Button>
                            <Button variant="destructive" size="sm" className="gap-1 text-xs" onClick={() => deleteOrg(o)}>
                              <Trash2 className="h-3 w-3" /> Excluir
                            </Button>
                          </div>
                        </div>

                        {expandedOrg === o.id && (
                          <div className="mt-3 ml-13 space-y-1.5 pl-4 border-l-2 border-border">
                            {(o.members || []).length === 0 ? (
                              <p className="text-xs text-muted-foreground py-2">Nenhum membro nesta empresa.</p>
                            ) : (
                              (o.members || []).map((m) => (
                                <div key={m.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors">
                                  <div className="flex items-center gap-2">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                                      {m.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                                        {m.name}
                                        {m.id === o.owner_id && <Badge variant="outline" className="text-[9px] px-1 py-0 border-primary/30 text-primary">Dono</Badge>}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground">{m.email}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={`text-[10px] ${roleBadge(m.role)}`}>{m.role}</Badge>
                                    {m.id !== o.owner_id && (
                                      <Button variant="ghost" size="sm" className="h-7 gap-1 text-[10px] text-destructive hover:text-destructive" onClick={() => handleRemoveMember(m, o)}>
                                        <UserMinus className="h-3 w-3" /> Remover
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {filteredOrgs.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma empresa encontrada.</p>}
                  </div>
                )}
              </div>
            </TabsContent>
          )}

          <TabsContent value="roles">
            <div className="bg-card ghost-border rounded-xl mx-auto max-w-4xl overflow-hidden">
              <div className="px-4 py-3 ghost-border border-b flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Matriz de Permissões — RBAC</h2>
                  <p className="text-xs text-muted-foreground">O que cada função pode acessar no sistema</p>
                </div>
                <ComingSoonBadge />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-secondary/50">
                      <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Recurso</th>
                      <th className="text-center px-3 py-2 font-semibold text-primary">Supervisor</th>
                      <th className="text-center px-3 py-2 font-semibold text-accent">Atendente</th>
                      <th className="text-center px-3 py-2 font-semibold text-muted-foreground">Vendedor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[
                      { perm: "CRM — Visualizar e Criar", sup: true, att: true, ven: true },
                      { perm: "CRM — Editar qualquer Lead", sup: true, att: false, ven: false },
                      { perm: "CRM — Excluir Lead", sup: true, att: false, ven: false },
                      { perm: "CRM — Exportar em Massa", sup: true, att: false, ven: false },
                      { perm: "CRM — Transferir Lead para outro responsável", sup: true, att: false, ven: false },
                      { perm: "Inbox — Visualizar conversas (todas)", sup: true, att: false, ven: false },
                      { perm: "Inbox — Visualizar fila de espera", sup: true, att: true, ven: true },
                      { perm: "Inbox — Responder e Assumir", sup: true, att: true, ven: true },
                      { perm: "Tarefas — Visualizar de todos", sup: true, att: false, ven: false },
                      { perm: "Automações — Criar e Editar", sup: true, att: false, ven: false },
                      { perm: "Relatórios — Dashboard", sup: true, att: false, ven: false },
                      { perm: "Configurações Globais. Canais, Integrações", sup: true, att: false, ven: false },
                      { perm: "Gerenciar Usuários (Bloquear, Mudar Role)", sup: true, att: false, ven: false },
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
            <div className="bg-card ghost-border rounded-xl mx-auto max-w-4xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 ghost-border border-b">
                 <div>
                    <h2 className="text-sm font-semibold text-foreground">Log de Auditoria de Acesso</h2>
                    <p className="text-xs text-muted-foreground">Histórico de ações de sistema recentes da organização (Em breve)</p>
                 </div>
                 <ComingSoonBadge />
              </div>
              <div className="divide-y divide-border opacity-60">
                {[
                  { user: "Sistema", action: "Início de sessão - Admin", date: "2026-03-25 14:30" },
                  { user: "Admin", action: "Visualizou e editou roles", date: "2026-03-25 10:15" },
                ].map((log, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 transition-colors">
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
      </div>

      <Dialog open={!!editModal} onOpenChange={(open) => !open && setEditModal(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Alterar Permissão</DialogTitle>
            <DialogDescription>Altere o nível de acesso do usuário no sistema.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Usuário: <strong className="text-foreground">{editModal?.name}</strong></p>
            <div className="space-y-1.5">
              <Label className="text-xs">Nível de Permissão</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {isMaster && <SelectItem value="master">Master</SelectItem>}
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="atendente">Atendente</SelectItem>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditModal(null)}>Cancelar</Button>
            <Button size="sm" onClick={saveRole}>Salvar Acesso</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isMaster && (
        <Dialog open={!!addMemberModal} onOpenChange={(open) => !open && setAddMemberModal(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Adicionar Membro</DialogTitle>
              <DialogDescription>Adicione um usuário existente à empresa {addMemberModal?.name}.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">E-mail do Usuário</Label>
                <Input
                  placeholder="usuario@empresa.com"
                  value={addMemberEmail}
                  onChange={(e) => setAddMemberEmail(e.target.value)}
                  type="email"
                />
              </div>
              <Button onClick={handleAddMember} disabled={addingMember || !addMemberEmail.trim()} className="w-full">
                {addingMember && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Adicionar à Empresa
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}
