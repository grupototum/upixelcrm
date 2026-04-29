import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Shield, Key, Monitor, LogOut, Loader2, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SessionInfo {
  device: string;
  browser: string;
  startedAt: string;
  email: string | null;
}

function parseUserAgent(ua: string): { device: string; browser: string } {
  const lower = ua.toLowerCase();
  let device = "Desktop";
  if (/iphone|ipad|ipod/.test(lower)) device = "iPhone/iPad";
  else if (/android/.test(lower)) device = "Android";
  else if (/windows/.test(lower)) device = "Windows";
  else if (/mac/.test(lower)) device = "macOS";
  else if (/linux/.test(lower)) device = "Linux";

  let browser = "Navegador";
  if (/edg/.test(lower)) browser = "Edge";
  else if (/chrome/.test(lower)) browser = "Chrome";
  else if (/firefox/.test(lower)) browser = "Firefox";
  else if (/safari/.test(lower)) browser = "Safari";

  return { device, browser };
}

export default function SecurityPage() {
  const { user, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);
  const [session, setSession] = useState<SessionInfo | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const s = data.session;
      if (!s) return;
      const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
      const { device, browser } = parseUserAgent(ua);
      setSession({
        device,
        browser,
        startedAt: new Date(s.expires_at ? (s.expires_at - 3600) * 1000 : Date.now()).toISOString(),
        email: s.user?.email ?? null,
      });
    });
    return () => {
      mounted = false;
    };
  }, []);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
    if (!/[A-Za-z]/.test(pwd)) return "A senha deve conter ao menos uma letra.";
    if (!/[0-9]/.test(pwd)) return "A senha deve conter ao menos um número.";
    return null;
  };

  const updatePassword = async () => {
    if (!user?.email) {
      toast.error("Sessão inválida.");
      return;
    }
    if (!currentPassword) {
      toast.error("Informe sua senha atual.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    const validationErr = validatePassword(newPassword);
    if (validationErr) {
      toast.error(validationErr);
      return;
    }

    setSavingPassword(true);
    try {
      // Re-authenticate to confirm current password
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInErr) {
        toast.error("Senha atual incorreta.");
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast.error("Erro ao atualizar a senha: " + error.message);
        return;
      }

      toast.success("Senha atualizada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar a senha.");
    } finally {
      setSavingPassword(false);
    }
  };

  const signOutEverywhere = async () => {
    if (!confirm("Encerrar sua sessão em todos os dispositivos? Você precisará fazer login novamente.")) {
      return;
    }
    setSigningOutAll(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) {
        toast.error("Erro ao encerrar sessões: " + error.message);
        return;
      }
      toast.success("Sessões encerradas.");
      await logout();
    } finally {
      setSigningOutAll(false);
    }
  };

  return (
    <AppLayout title="Segurança" subtitle="Proteja sua conta e gerencie sua sessão">
      <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Conta */}
          <Card className="rounded-2xl ghost-border overflow-hidden bg-card/30 backdrop-blur-xl border-primary/20">
            <CardHeader className="bg-primary/5 pb-6">
              <CardTitle className="text-lg font-bold flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                Conta
              </CardTitle>
              <CardDescription className="text-xs">
                Informações da conta autenticada nesta sessão.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl ghost-border bg-secondary/10">
                <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-muted-foreground">E-mail de acesso</p>
                  <p className="text-sm font-semibold truncate">{user?.email || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl ghost-border bg-secondary/10">
                <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-muted-foreground">Função</p>
                  <p className="text-sm font-semibold capitalize">{user?.role || "—"}</p>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground italic pt-1">
                Em breve: autenticação em duas etapas (2FA) com app autenticador.
              </p>
            </CardContent>
          </Card>

          {/* Alterar Senha */}
          <Card className="rounded-2xl ghost-border bg-card/30 backdrop-blur-xl shadow-card h-full">
            <CardHeader className="pb-6">
              <CardTitle className="text-lg font-bold flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center">
                  <Key className="h-5 w-5 text-accent" />
                </div>
                Alterar Senha
              </CardTitle>
              <CardDescription className="text-xs">
                Mínimo 8 caracteres, ao menos uma letra e um número.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground pl-1">Senha Atual</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="rounded-xl ghost-border bg-secondary/10 h-11 text-sm"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={savingPassword}
                  autoComplete="current-password"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground pl-1">Nova Senha</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="rounded-xl ghost-border bg-secondary/10 h-11 text-sm"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={savingPassword}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground pl-1">Confirmar Nova Senha</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="rounded-xl ghost-border bg-secondary/10 h-11 text-sm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={savingPassword}
                  autoComplete="new-password"
                />
              </div>
              <div className="pt-4">
                <Button
                  className="w-full rounded-xl h-11 bg-accent hover:bg-accent/80 text-white shadow-lg shadow-accent/20"
                  onClick={updatePassword}
                  disabled={savingPassword}
                >
                  {savingPassword ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Atualizar Senha
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sessão atual */}
        <Card className="rounded-2xl ghost-border bg-card/50 backdrop-blur-xl shadow-card overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Sessão Atual</CardTitle>
                <CardDescription className="text-xs">
                  Encerre sua sessão em todos os dispositivos por questões de segurança.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs h-9 bg-destructive/5 text-destructive hover:bg-destructive shadow-sm hover:text-white transition-all"
                onClick={signOutEverywhere}
                disabled={signingOutAll}
              >
                {signingOutAll ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <LogOut className="h-3 w-3 mr-1.5" />}
                Sair de todas as sessões
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/20">
              {session ? (
                <div className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                      <Monitor className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-foreground">
                          {session.browser} no {session.device}
                        </h4>
                        <Badge className="bg-success/20 text-success border-none text-[10px] h-4">
                          Sessão Atual
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {session.email || "—"} · iniciada {new Date(session.startedAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Carregando sessão…
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
