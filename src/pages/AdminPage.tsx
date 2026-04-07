import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Users, Building2, Shield, Mail, Search, Ban, CheckCircle2,
  PencilLine, Eye, Trash2
} from "lucide-react";

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
}

export default function AdminPage() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editModal, setEditModal] = useState<ProfileRow | null>(null);
  const [editRole, setEditRole] = useState("");
  const [orgSearch, setOrgSearch] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const [profilesRes, orgsRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("organizations").select("*").order("created_at", { ascending: false }),
    ]);

    const profilesList = (profilesRes.data || []) as ProfileRow[];
    const orgsList = (orgsRes.data || []) as OrgRow[];

    // Enrich profiles with org name
    const orgMap = new Map(orgsList.map(o => [o.id, o.name]));
    for (const p of profilesList) {
      if (p.organization_id) p.org_name = orgMap.get(p.organization_id) || "—";
    }

    // Enrich orgs with member count and owner name
    for (const o of orgsList) {
      o.member_count = profilesList.filter(p => p.organization_id === o.id).length;
      const owner = profilesList.find(p => p.id === o.owner_id);
      o.owner_name = owner?.name || "—";
    }

    setProfiles(profilesList);
    setOrgs(orgsList);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filteredProfiles = profiles.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const filteredOrgs = orgs.filter(o =>
    o.name.toLowerCase().includes(orgSearch.toLowerCase()) ||
    o.slug.toLowerCase().includes(orgSearch.toLowerCase())
  );

  const toggleBlock = async (profile: ProfileRow) => {
    const { error } = await supabase.rpc("admin_toggle_block" as any, {
      target_user_id: profile.id,
      block_status: !profile.is_blocked,
    });
    if (error) {
      // Fallback: direct update via edge function or show error
      toast.error("Erro ao alterar status: " + error.message);
      return;
    }
    toast.success(profile.is_blocked ? "Usuário desbloqueado" : "Usuário bloqueado");
    fetchData();
  };

  const saveRole = async () => {
    if (!editModal) return;
    const { error } = await supabase.rpc("admin_set_role" as any, {
      target_user_id: editModal.id,
      new_role: editRole,
    });
    if (error) {
      toast.error("Erro ao alterar role: " + error.message);
      return;
    }
    toast.success("Role atualizado com sucesso");
    setEditModal(null);
    fetchData();
  };

  const deleteOrg = async (org: OrgRow) => {
    if (!confirm(`Excluir a empresa "${org.name}"? Membros perderão o vínculo.`)) return;
    const { error } = await supabase.from("organizations").delete().eq("id", org.id);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
      return;
    }
    toast.success("Empresa excluída");
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
    { label: "Empresas", value: orgs.length, icon: Building2 },
    { label: "Bloqueados", value: profiles.filter(p => p.is_blocked).length, icon: Ban },
    { label: "Masters", value: profiles.filter(p => p.role === "master").length, icon: Shield },
  ];

  if (user?.role !== "master") {
    return (
      <AppLayout title="Acesso Negado">
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Apenas usuários master podem acessar este painel.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Painel Administrativo" subtitle="Gerencie todos os usuários e empresas do sistema">
      <div className="animate-fade-in space-y-6 p-6">
        {/* Stats */}
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
            <TabsTrigger value="orgs" className="text-xs gap-1.5"><Building2 className="h-3 w-3" /> Empresas</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <div className="rounded-xl ghost-border bg-card">
              <div className="flex items-center justify-between ghost-border border-b px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Todos os usuários</h2>
                  <p className="text-xs text-muted-foreground">Visão global de todos os usuários cadastrados</p>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar usuário..."
                    className="pl-8 h-9 text-xs"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
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
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" /> {p.email || "—"}
                          </p>
                          {p.org_name && (
                            <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Building2 className="h-2.5 w-2.5" /> {p.org_name}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={roleBadge(p.role)}>
                          <Shield className="mr-1 h-3 w-3" /> {p.role}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">{p.client_id.slice(0, 8)}…</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-xs"
                          onClick={() => { setEditModal(p); setEditRole(p.role); }}
                        >
                          <PencilLine className="h-3 w-3" /> Role
                        </Button>
                        <Button
                          variant={p.is_blocked ? "default" : "destructive"}
                          size="sm"
                          className="gap-1 text-xs"
                          onClick={() => toggleBlock(p)}
                        >
                          {p.is_blocked ? <CheckCircle2 className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                          {p.is_blocked ? "Desbloquear" : "Bloquear"}
                        </Button>
                      </div>
                    </div>
                  ))}
                  {filteredProfiles.length === 0 && (
                    <p className="p-6 text-center text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Orgs Tab */}
          <TabsContent value="orgs">
            <div className="rounded-xl ghost-border bg-card">
              <div className="flex items-center justify-between ghost-border border-b px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Todas as empresas</h2>
                  <p className="text-xs text-muted-foreground">Gerencie as organizações cadastradas no sistema</p>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar empresa..."
                    className="pl-8 h-9 text-xs"
                    value={orgSearch}
                    onChange={(e) => setOrgSearch(e.target.value)}
                  />
                </div>
              </div>

              {loading ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Carregando...</div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredOrgs.map((o) => (
                    <div key={o.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent-foreground">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{o.name}</p>
                          <p className="text-[10px] text-muted-foreground">slug: {o.slug}</p>
                          <p className="text-xs text-muted-foreground">
                            Dono: {o.owner_name} · {o.member_count} membro{o.member_count !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {new Date(o.created_at).toLocaleDateString("pt-BR")}
                        </Badge>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="gap-1 text-xs"
                          onClick={() => deleteOrg(o)}
                        >
                          <Trash2 className="h-3 w-3" /> Excluir
                        </Button>
                      </div>
                    </div>
                  ))}
                  {filteredOrgs.length === 0 && (
                    <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma empresa encontrada.</p>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Role Modal */}
      <Dialog open={!!editModal} onOpenChange={(open) => !open && setEditModal(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Alterar Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Usuário: <strong>{editModal?.name}</strong></p>
            <div className="space-y-1.5">
              <Label className="text-xs">Nova Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="master">Master</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="atendente">Atendente</SelectItem>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditModal(null)}>Cancelar</Button>
            <Button size="sm" onClick={saveRole}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
