import { User, Mail, Building2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PushNotificationSettings } from "@/components/pwa/PushNotificationSettings";
import { OrganizationSection } from "@/components/profile/OrganizationSection";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { updateProfileName } from "@/services/users";
import { toast } from "sonner";

/**
 * Body do Profile — sem AppLayout. Reutilizável em /profile (legacy)
 * e em /settings (novo, com tabs).
 */
export function ProfileSettings() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);

  const initials = (user?.name || "??").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfileName(user.id, name);
      toast.success("Perfil atualizado!");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar / Left Column */}
        <div className="w-full md:w-80 space-y-6">
          <Card className="rounded-card ghost-border overflow-hidden bg-card">
            <div className="h-24 bg-gradient-to-r from-primary/40 to-accent/40" />
            <CardContent className="pt-0 -mt-12 text-center pb-8">
              <div className="relative inline-block group mb-4">
                <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                  <AvatarImage src={user?.avatar || ""} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">{initials}</AvatarFallback>
                </Avatar>
                <button
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-background border border-border flex items-center justify-center shadow-lg hover:bg-secondary transition-colors opacity-0 group-hover:opacity-100 duration-200"
                  onClick={() => {}}
                  aria-label="Trocar foto de perfil (em breve)"
                  disabled
                  title="Troca de foto em breve"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              <h2 className="text-xl font-bold text-foreground">{user?.name || "Usuário"}</h2>
              <p className="text-sm text-muted-foreground capitalize">{user?.role} {user?.organization ? `· ${user.organization.name}` : ""}</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content / Right Column */}
        <div className="flex-1 space-y-6">
          <Card className="rounded-card ghost-border bg-card shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Informações Básicas</CardTitle>
              <CardDescription className="text-xs">Essas informações são visíveis para outros membros da equipe.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullname" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Nome Completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="fullname" value={name} onChange={e => setName(e.target.value)} className="pl-10 rounded-xl ghost-border bg-secondary/10 h-11 text-sm focus:ring-primary" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="email" value={user?.email || ""} disabled className="pl-10 rounded-xl ghost-border bg-secondary/10 h-11 text-sm opacity-60" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Função</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="role" value={user?.role || ""} disabled className="pl-10 rounded-xl ghost-border bg-secondary/10 h-11 text-sm capitalize opacity-60" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientid" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">ID do Tenant</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="clientid" value={user?.client_id || ""} disabled className="pl-10 rounded-xl ghost-border bg-secondary/10 h-11 text-sm opacity-60 font-mono text-[11px]" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={saving} className="rounded-xl h-11 px-8 bg-primary hover:bg-[#e04400] shadow-lg">
                  {saving ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <OrganizationSection />
          <PushNotificationSettings />
        </div>
      </div>
    </div>
  );
}
