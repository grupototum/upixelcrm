import { useState, FormEvent } from "react";
import { Shield, Key, Tablet, Smartphone, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * Body do Security — sem AppLayout. Reutilizável em /security (legacy)
 * e em /settings (novo, com tabs).
 */
export function SecuritySettings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Nova senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Confirmação de senha não confere.");
      return;
    }
    if (!currentPassword) {
      toast.error("Informe sua senha atual.");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("Sessão inválida. Faça login novamente.");

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) {
        toast.error("Senha atual incorreta.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      const { error: signOutOthersError } = await supabase.auth.signOut({ scope: "others" });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      if (signOutOthersError) {
        toast.warning(
          "Senha trocada, mas não foi possível encerrar outras sessões. " +
          "Se você está preocupado com acesso de outros dispositivos, troque a senha de novo em alguns minutos.",
          { duration: 8000 },
        );
      } else {
        toast.success("Senha atualizada. Outras sessões foram encerradas.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "tente novamente";
      toast.error(`Não foi possível atualizar a senha: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="rounded-card ghost-border overflow-hidden bg-card border-[hsl(var(--border-strong))]">
          <CardHeader className="bg-primary/5 pb-6">
            <CardTitle className="text-lg font-bold flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              Autenticação em Duas Etapas (2FA)
              <Badge variant="outline" className="text-[10px] h-5 ml-auto">Em breve</Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Adicione uma camada extra de segurança à sua conta.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="flex items-center justify-between p-4 rounded-xl ghost-border bg-secondary/10 opacity-60">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center">
                  <Tablet className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">App de Autenticação</h4>
                  <p className="text-[11px] text-muted-foreground">Use Google Authenticator ou Authy.</p>
                </div>
              </div>
              <Switch checked={false} disabled />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl ghost-border bg-secondary/10 opacity-60">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-success/20 flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-success" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">SMS (Recuperação)</h4>
                  <p className="text-[11px] text-muted-foreground">Receba códigos via mensagem de texto.</p>
                </div>
              </div>
              <Switch checked={false} disabled />
            </div>

            <div className="pt-2 text-center">
              <p className="text-[11px] text-muted-foreground max-w-[320px] mx-auto italic">
                2FA estará disponível em breve. Por enquanto, use uma senha forte e única para sua conta.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-card ghost-border bg-card shadow-card h-full">
          <CardHeader className="pb-6">
            <CardTitle className="text-lg font-bold flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center">
                <Key className="h-5 w-5 text-accent" />
              </div>
              Alterar Senha
            </CardTitle>
            <CardDescription className="text-xs">
              Sua senha deve ter pelo menos 8 caracteres.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground pl-1">Senha Atual</Label>
                <Input
                  id="current-password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="rounded-xl ghost-border bg-secondary/10 h-11 text-sm"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground pl-1">Nova Senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="rounded-xl ghost-border bg-secondary/10 h-11 text-sm"
                  minLength={8}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground pl-1">Confirmar Nova Senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="rounded-xl ghost-border bg-secondary/10 h-11 text-sm"
                  minLength={8}
                  required
                />
              </div>
              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-xl h-11 bg-accent hover:bg-accent/80 text-white shadow-lg shadow-accent/20"
                >
                  {saving ? "Atualizando..." : "Atualizar Senha"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-card ghost-border bg-card shadow-card overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-3">
            Dispositivos Conectados
            <Badge variant="outline" className="text-[10px] h-5">Em breve</Badge>
          </CardTitle>
          <CardDescription className="text-xs">Veja e gerencie as sessões ativas da sua conta.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 rounded-xl ghost-border bg-secondary/10 p-4">
            <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              A listagem de dispositivos conectados está em desenvolvimento.
              Para encerrar todas as sessões agora, troque sua senha acima — isso invalida tokens existentes.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
