import { useState, useEffect, FormEvent } from "react";
import { logger } from "@/lib/logger";
import { supabase } from "@/integrations/supabase/client";
import * as signupRepo from "@/services/signup";
import { deleteOrganization, setProfileOrganization } from "@/services/users";
import { getTenantUrl } from "@/utils/tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, Building2, Globe, Mail, Lock, User, ShieldCheck } from "lucide-react";

const SUBDOMAIN_REGEX = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;
const ROOT_DOMAIN = import.meta.env.VITE_ROOT_DOMAIN ?? "upixel.app";
const GATE_SESSION_KEY = "upixel.signup.gate";

type Step = "gate" | "form" | "success";

export default function SignupPage() {
  const [step, setStep] = useState<Step>(() =>
    sessionStorage.getItem(GATE_SESSION_KEY) === "1" ? "form" : "gate"
  );

  // Gate
  const [gatePassword, setGatePassword] = useState("");
  const [gateError, setGateError]       = useState("");
  const [gateLoading, setGateLoading]   = useState(false);

  // Form
  const [companyName, setCompanyName] = useState("");
  const [subdomain, setSubdomain]     = useState("");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [name, setName]               = useState("");

  // Feedback
  const [subdomainStatus, setSubdomainStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");
  const [error, setError]                 = useState("");
  const [loading, setLoading]             = useState(false);
  const [createdSubdomain, setCreatedSubdomain] = useState("");

  /* ── Gate ── */
  const handleGateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!gatePassword.trim()) return;
    setGateLoading(true);
    setGateError("");

    try {
      const ok = await signupRepo.checkSignupGate(gatePassword);

      if (!ok) {
        setGateError("Senha incorreta.");
        setGatePassword("");
        return;
      }

      sessionStorage.setItem(GATE_SESSION_KEY, "1");
      setStep("form");
    } catch (e) {
      logger.error("signup gate check failed:", e);
      setGateError("Erro de conexão. Tente novamente.");
    } finally {
      setGateLoading(false);
    }
  };

  /* ── Subdomain check ── */
  useEffect(() => {
    if (!subdomain) { setSubdomainStatus("idle"); return; }
    if (!SUBDOMAIN_REGEX.test(subdomain)) { setSubdomainStatus("invalid"); return; }

    setSubdomainStatus("checking");
    let alive = true;
    const timer = setTimeout(async () => {
      const taken = await signupRepo.isSubdomainTaken(subdomain);
      if (alive) setSubdomainStatus(taken ? "taken" : "available");
    }, 500);

    return () => { alive = false; clearTimeout(timer); };
  }, [subdomain]);

  const handleSubdomainInput = (value: string) => {
    setSubdomain(value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
  };

  const isFormValid =
    companyName.trim().length > 0 &&
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 6 &&
    subdomainStatus === "available";

  /* ── Signup ── */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setError("");
    setLoading(true);

    let tenantId: string | null = null;
    let orgId: string | null    = null;

    try {
      try {
        tenantId = await signupRepo.createTenant(companyName.trim(), `t-${subdomain}`);
      } catch (tenantError) {
        setError((tenantError as { message?: string })?.message ?? "Erro ao reservar subdomínio.");
        setLoading(false);
        return;
      }

      try {
        orgId = await signupRepo.createTenantOrganization({
          name: companyName.trim(),
          slug: subdomain,
          subdomain,
          tenant_id: tenantId,
        });
      } catch (orgError) {
        // Rollback do tenant (erro ignorado como no original)
        await signupRepo.deleteTenant(tenantId).catch(() => {});
        setError((orgError as { message?: string })?.message ?? "Erro ao criar organização.");
        setLoading(false);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { name: name.trim(), tenant_id: tenantId, role: "supervisor" },
        },
      });

      if (authError || !authData.user) {
        await deleteOrganization(orgId).catch(() => {});
        await signupRepo.deleteTenant(tenantId).catch(() => {});
        setError(authError?.message ?? "Erro ao criar conta.");
        setLoading(false);
        return;
      }

      // Erros abaixo eram ignorados no original — preservado
      await signupRepo.setTenantOwner(tenantId, authData.user.id).catch(() => {});
      await signupRepo.setOrganizationOwner(orgId, authData.user.id).catch(() => {});
      await setProfileOrganization(authData.user.id, orgId).catch(() => {});

      signupRepo.notifySignup({
        tenantId,
        tenantName: companyName.trim(),
        subdomain,
        ownerEmail: email.trim(),
        ownerName: name.trim(),
      }).catch(() => undefined);

      // 7. Provisiona o subdomínio como custom domain na Vercel
      // (fire-and-forget). SSL é provisionado automaticamente em ~10s.
      signupRepo.provisionTenantDomain(subdomain).catch(() => undefined);

      setCreatedSubdomain(subdomain);
      setStep("success");
    } catch (e) {
      logger.error("signup failed, rolling back:", e);
      if (orgId)    await deleteOrganization(orgId).catch(() => {});
      if (tenantId) await signupRepo.deleteTenant(tenantId).catch(() => {});
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoToApp = () => {
    window.location.href = getTenantUrl(createdSubdomain);
  };

  /* ── Renders ── */
  if (step === "gate") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Área restrita</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Informe a senha de acesso para continuar.
            </p>
          </div>

          <form
            onSubmit={handleGateSubmit}
            className="bg-card border border-border rounded-card p-6 shadow-xl space-y-4"
          >
            {gateError && (
              <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-xs text-destructive">{gateError}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="gate-password" className="text-xs">Senha de acesso</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="gate-password"
                  type="password"
                  value={gatePassword}
                  onChange={(e) => setGatePassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 h-10"
                  required
                  autoFocus
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-10 font-medium"
              disabled={!gatePassword.trim() || gateLoading}
            >
              {gateLoading ? (
                <div className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
              ) : (
                "Continuar"
              )}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Conta criada!</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Sua empresa foi configurada em{" "}
              <span className="font-medium text-foreground">
                {createdSubdomain}.{ROOT_DOMAIN}
              </span>
            </p>
          </div>
          <Button className="w-full" onClick={handleGoToApp}>
            Acessar meu CRM
          </Button>
          <p className="text-xs text-muted-foreground">
            Verifique seu e-mail para confirmar a conta, se solicitado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Cadastrar novo cliente</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Preencha os dados para criar o tenant.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-card p-6 shadow-xl space-y-4"
        >
          {error && (
            <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs">Nome do responsável</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="João Silva" className="pl-10 h-10" required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company" className="text-xs">Nome da empresa</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="company" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Soluções" className="pl-10 h-10" required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subdomain" className="text-xs">Subdomínio</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="subdomain" value={subdomain}
                onChange={(e) => handleSubdomainInput(e.target.value)}
                placeholder="acme" className="pl-10 pr-28 h-10" required />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                .{ROOT_DOMAIN}
              </span>
            </div>
            {subdomain && (
              <p className={`text-xs ${
                subdomainStatus === "available" ? "text-green-600 dark:text-green-400" :
                subdomainStatus === "taken"     ? "text-destructive" :
                subdomainStatus === "invalid"   ? "text-destructive" :
                "text-muted-foreground"
              }`}>
                {subdomainStatus === "checking" && "Verificando disponibilidade..."}
                {subdomainStatus === "available" && "✓ Subdomínio disponível"}
                {subdomainStatus === "taken"     && "✗ Subdomínio já está em uso"}
                {subdomainStatus === "invalid"   && "Use apenas letras minúsculas, números e hífens (mín. 3 caracteres)"}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs">E-mail</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="joao@acme.com.br" className="pl-10 h-10" required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="password" type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" className="pl-10 h-10" required minLength={6} />
            </div>
          </div>

          <Button type="submit" className="w-full h-10 font-medium"
            disabled={!isFormValid || loading}>
            {loading ? (
              <div className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
            ) : (
              "Criar conta do cliente"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
