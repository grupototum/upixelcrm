import { logger } from "@/lib/logger";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { isValidUuid } from "@/lib/tenant-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Building2, Plus, Users, Crown, UserPlus, Loader2, LogOut, UserMinus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface OrgMember {
  id: string;
  name: string;
  email: string | null;
  role: string;
  avatar_url: string | null;
}

export function OrganizationSection() {
  const { user } = useAuth();
  const [org, setOrg] = useState<any>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [newOrgSubdomain, setNewOrgSubdomain] = useState("");
  const { tenant } = useTenant();

  const fetchOrg = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (profile?.organization_id) {
        const { data: orgData } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", profile.organization_id)
          .single();
        setOrg(orgData);

        if (orgData) {
          const { data: memberData } = await supabase
            .from("profiles")
            .select("id, name, email, role, avatar_url")
            .eq("organization_id", orgData.id);
          setMembers(memberData || []);
        }
      } else {
        setOrg(null);
        setMembers([]);
      }
    } catch (e) {
      logger.error("Error fetching org:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrg();
  }, [user?.id]);

  const handleCreateOrg = async () => {
    if (!newOrgName.trim() || !user) return;
    setCreating(true);
    try {
      const slug = newOrgName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const orgSubdomain = newOrgSubdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, "") || slug;
      
      const { data: newOrg, error } = await supabase.from("organizations")
        .insert({
          name: newOrgName.trim(),
          slug: `${slug}-${Date.now()}`,
          subdomain: orgSubdomain,
          tenant_id: isValidUuid(tenant?.id) ? tenant.id : null,
          owner_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Update profile with org and shared client_id
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ organization_id: newOrg.id } as any)
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast.success("Empresa criada com sucesso!");
      setCreateOpen(false);
      setNewOrgName("");
      setNewOrgSubdomain("");
      fetchOrg();
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar empresa");
    } finally {
      setCreating(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !org) return;
    setInviting(true);
    try {
      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("id, organization_id")
        .eq("email", inviteEmail.trim())
        .single();

      if (!targetProfile) {
        toast.error("Usuário não encontrado com esse e-mail. O usuário precisa ter uma conta cadastrada.");
        return;
      }

      if (targetProfile.organization_id) {
        toast.error("Esse usuário já pertence a uma empresa.");
        return;
      }

      const { error } = await supabase.rpc("owner_add_org_member" as any, {
        target_user_id: targetProfile.id,
        target_org_id: org.id,
      });

      if (error) throw error;

      toast.success(`${inviteEmail} adicionado à empresa!`);
      setInviteOpen(false);
      setInviteEmail("");
      fetchOrg();
    } catch (e: any) {
      toast.error(e.message || "Erro ao adicionar membro");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Remover ${memberName} da empresa?`)) return;
    try {
      const { error } = await supabase.rpc("owner_remove_org_member" as any, {
        target_user_id: memberId,
      });
      if (error) throw error;
      toast.success(`${memberName} removido da empresa`);
      fetchOrg();
    } catch (e: any) {
      toast.error(e.message || "Erro ao remover membro");
    }
  };

  const handleLeaveOrg = async () => {
    if (!user || !org) return;
    if (org.owner_id === user.id) {
      toast.error("O dono da empresa não pode sair. Transfira a propriedade primeiro.");
      return;
    }
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ organization_id: null, client_id: user.id } as any)
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Você saiu da empresa.");
      fetchOrg();
    } catch (e: any) {
      toast.error(e.message || "Erro ao sair da empresa");
    }
  };

  const B = Badge as any;

  if (loading) {
    return (
      <Card className="rounded-2xl ghost-border bg-card/50 backdrop-blur-xl shadow-card">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!org) {
    return (
      <Card className="rounded-2xl ghost-border bg-card/50 backdrop-blur-xl shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" /> Empresa
          </CardTitle>
          <CardDescription className="text-xs">
            Crie ou associe-se a uma empresa para compartilhar leads, contatos e dados com sua equipe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 space-y-4">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-muted flex items-center justify-center">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Você ainda não pertence a uma empresa</p>
              <p className="text-xs text-muted-foreground mt-1">Crie uma empresa para compartilhar dados com sua equipe</p>
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-xl gap-2">
                  <Plus className="h-4 w-4" /> Criar Empresa
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Criar Empresa</DialogTitle>
                  <DialogDescription>Todos os membros da empresa compartilharão leads, contatos e demais dados.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome da Empresa</Label>
                    <Input
                      placeholder="Ex: Grupo Totum"
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Subdomínio</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Ex: totum"
                        value={newOrgSubdomain}
                        onChange={(e) => setNewOrgSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                        className="rounded-xl"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">.upixel.app</span>
                    </div>                  </div>
                  <Button onClick={handleCreateOrg} disabled={creating || !newOrgName.trim()} className="w-full rounded-xl">
                    {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Criar Empresa
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isOwner = org.owner_id === user?.id;

  return (
    <Card className="rounded-2xl ghost-border bg-card/50 backdrop-blur-xl shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" /> {org.name}
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {members.length} membro{members.length !== 1 ? "s" : ""} · Dados compartilhados entre a equipe
              {org.subdomain && (
                <span className="ml-2 text-primary font-medium">· {org.subdomain}.upixel.app</span>
              )}
            </CardDescription>
          </div>
          {isOwner && (
            <B className="bg-primary/10 text-primary border-primary/20 text-[10px] gap-1">
              <Crown className="h-3 w-3" /> Proprietário
            </B>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Membros
            </h4>
            {isOwner && (
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary h-7 rounded-lg">
                    <UserPlus className="h-3.5 w-3.5" /> Adicionar
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl">
                  <DialogHeader>
                    <DialogTitle>Adicionar Membro</DialogTitle>
                    <DialogDescription>O usuário precisa já ter uma conta cadastrada no sistema.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">E-mail do Usuário</Label>
                      <Input
                        placeholder="usuario@empresa.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="rounded-xl"
                        type="email"
                      />
                    </div>
                    <Button onClick={handleInviteMember} disabled={inviting || !inviteEmail.trim()} className="w-full rounded-xl">
                      {inviting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Adicionar à Empresa
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <div className="space-y-1.5">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/5 hover:bg-secondary/10 transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {m.name?.slice(0, 2).toUpperCase() || "??"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.name || "Sem nome"}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{m.email}</p>
                </div>
                <B variant="outline" className="text-[10px] capitalize">{m.role}</B>
                {org.owner_id === m.id && <Crown className="h-3.5 w-3.5 text-primary" />}
                {isOwner && org.owner_id !== m.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-[10px] text-destructive hover:text-destructive rounded-lg"
                    onClick={() => handleRemoveMember(m.id, m.name || "Membro")}
                  >
                    <UserMinus className="h-3 w-3" /> Remover
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {!isOwner && (
          <div className="pt-2">
            <Button variant="outline" size="sm" className="text-xs gap-1.5 text-destructive border-destructive/30 rounded-xl" onClick={handleLeaveOrg}>
              <LogOut className="h-3.5 w-3.5" /> Sair da Empresa
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
