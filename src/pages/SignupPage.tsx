import { useState, useEffect, FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getTenantUrl } from "@/utils/tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, Building2, Globe, Mail, Lock, User, ShieldCheck } from "lucide-react";

const SUBDOMAIN_REGEX = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;
const ROOT_DOMAIN = import.meta.env.VITE_ROOT_DOMAIN ?? "upixel.app";
const SIGNUP_PASSWORD = import.meta.env.VITE_SIGNUP_PASSWORD ?? "";
const GATE_STORAGE_KEY = "upixel.signup.unlocked";

type Step = "form" | "success";

export default function SignupPage() {
  // Gate de senha
  const [gateUnlocked, setGateUnlocked] = useState<boolean>(() => {
    if (!SIGNUP_PASSWORD) return true;
    return sessionStorage.getItem(GATE_STORAGE_KEY) === "1";
  });
  const [gatePassword, setGatePassword] = useState("");
  const [gateError, setGateError] = useState("");

  const [step, setStep] = useState<Step>("form");

  // Campos do form
  const [companyName, setCompanyName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  // Feedback
  const [subdomainStatus, setSubdomainStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdSubdomain, setCreatedSubdomain] = useState("");

  useEffect(() => {
    if (!subdomain) { setSubdomainStatus("idle"); return; }
    if (!SUBDOMAIN_REGEX.test(subdomain)) { setSubdomainStatus("invalid"); return; }

    setSubdomainStatus("checking");
    const timer = setTimeout(async () => {
      // Verificar em tenants E organizations
      const [{ data: tenantMatch }, { data: orgMatch }] = await Promise.all([
        supabase.from("tenants").select("id").eq("subdomain", subdomain).maybeSingle(),
        supabase.from("organizations").select("id").eq("subdomain", subdomain).maybeSingle(),
      ]);

      setSubdomainStatus(tenantMatch || orgMatch ? "taken" : "available");
    }, 500);

    return () => clearTimeout(timer);
  }, [subdomain]);

  const handleGateSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (gatePassword === SIGNUP_PASSWORD) {
      sessionStorage.setItem(GATE_STORAGE_KEY, "1");
      setGateUnlocked(true);
      setGateError("");
    } else {
      setGateError("Senha incorreta");
    }
  };

  const handleSubdomainInput = (value: string) => {
    setSubdomain(value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
  };

  const isFormValid =
    companyName.trim().length > 0 &&
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 6 &&
    subdomainStatus === "available";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setError("");
    setLoading(true);

    let tenantId: string | null = null;
    let orgId: string | null = null;

    try {
      // 1. Criar tenant (entidade-pai)
      const { data: tenantData, error: tenantError } = await supabase
        .from("tenants")
        .insert({ name: companyName.trim(), subdomain: `t-${subdomain}` })
        .select("id")
        .single();

      if (tenantError || !tenantData) {
        setError(tenantError?.message ?? "Erro ao reservar subdomínio. Tente novamente.");
        setLoading(false);
        return;
      }
      tenantId = tenantData.id;

      // 2. Criar organization com o subdomain público
      const { data: orgData, error: orgError } = await supabase.from("organizations")
        .insert({
          name: companyName.trim(),
          slug: subdomain,
          subdomain: subdomain,
          tenant_id: tenantId,
        })
        .select("id")
        .single();

      if (orgError || !orgData) {
        // Rollback tenant
        await supabase.from("tenants").delete().eq("id", tenantId);
        setError(orgError?.message ?? "Erro ao criar organização. Tente novamente.");
        setLoading(false);
        return;
      }
      orgId = orgData.id;

      // 3. Criar conta de usuário (handle_new_user seta tenant_id via meta)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim(),
            tenant_id: tenantId,
            role: "supervisor",
          },
        },
      });

      if (authError || !authData.user) {
        await supabase.from("organizations").delete().eq("id", orgId);
        await supabase.from("tenants").delete().eq("id", tenantId);
        setError(authError?.message ?? "Erro ao criar conta. Tente novamente.");
        setLoading(false);
        return;
      }

      // 4. Vincular proprietário ao tenant e à org
      await supabase
        .from("tenants")
        .update({ owner_id: authData.user.id })
        .eq("id", tenantId);

      await supabase.from("organizations")
        .update({ owner_id: authData.user.id })
        .eq("id", orgId);

      // 5. Atualizar organization_id no profile
      await supabase.from("profiles")
        .update({ organization_id: orgId })
        .eq("id", authData.user.id);

      setCreatedSubdomain(subdomain);
      setStep("success");
    } catch {
      if (orgId) {
        await supabase.from("organizations").delete().eq("id", orgId);
      }
      if (tenantId) {
        await supabase.from("tenants").delete().eq("id", tenantId);
      }
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoToApp = () => {
    window.location.href = getTenantUrl(createdSubdomain);
  };

  if (!gateUnlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Área restrita</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Informe a senha para acessar o cadastro de novos clientes.
            </p>
          </div>

          <form
            onSubmit={handleGateSubmit}
            className="bg-card border border-border rounded-2xl p-6 shadow-xl space-y-4"
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
                  autoFocus
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-10 font-medium">
              Entrar
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center px-4">
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
              <span className="font-medium text-foreground">{createdSubdomain}.{ROOT_DOMAIN}</span>
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Cadastrar novo cliente</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Preencha os dados para criar o tenant.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-2xl p-6 shadow-xl space-y-4"
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
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="João Silva"
                className="pl-10 h-10"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company" className="text-xs">Nome da empresa</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Soluções"
                className="pl-10 h-10"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subdomain" className="text-xs">Subdomínio</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="subdomain"
                value={subdomain}
                onChange={(e) => handleSubdomainInput(e.target.value)}
                placeholder="acme"
                className="pl-10 pr-28 h-10"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                .{ROOT_DOMAIN}
              </span>
            </div>
            {subdomain && (
              <p className={`text-xs ${
                subdomainStatus === "available" ? "text-green-600 dark:text-green-400" :
                subdomainStatus === "taken" ? "text-destructive" :
                subdomainStatus === "invalid" ? "text-destructive" :
                "text-muted-foreground"
              }`}>
                {subdomainStatus === "checking" && "Verificando disponibilidade..."}
                {subdomainStatus === "available" && "✓ Subdomínio disponível"}
                {subdomainStatus === "taken" && "✗ Subdomínio já está em uso"}
                {subdomainStatus === "invalid" && "Use apenas letras minúsculas, números e hífens (mín. 3 caracteres)"}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs">E-mail</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="joao@acme.com.br"
                className="pl-10 h-10"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10 h-10"
                required
                minLength={6}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-10 font-medium"
            disabled={!isFormValid || loading}
          >
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
