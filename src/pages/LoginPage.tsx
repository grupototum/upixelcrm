import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Eye, EyeOff, AlertCircle, Lock, User, Building2 } from "lucide-react";
import upixelIconLight from "@/assets/upixel_icon_light.png";
import upixelIconDark from "@/assets/upixel_icon_dark.png";

interface OrgOption {
  id: string;
  name: string;
  slug: string;
}

export default function LoginPage() {
  const { theme } = useTheme();
  const { login, signup, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Organization fields for signup
  const [orgMode, setOrgMode] = useState<"none" | "select" | "create">("none");
  const [organizations, setOrganizations] = useState<OrgOption[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [newOrgName, setNewOrgName] = useState("");

  // Load available organizations for signup
  useEffect(() => {
    if (isSignup) {
      supabase.from("organizations").select("id, name, slug").then(({ data }) => {
        if (data) setOrganizations(data as OrgOption[]);
      });
    }
  }, [isSignup]);

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate("/", { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (isSignup) {
      if (!name.trim()) {
        setError("Informe seu nome");
        setLoading(false);
        return;
      }
      if (orgMode === "create" && !newOrgName.trim()) {
        setError("Informe o nome da empresa");
        setLoading(false);
        return;
      }

      // Pass org info via metadata
      const orgMeta: Record<string, string> = {};
      if (orgMode === "select" && selectedOrgId) {
        orgMeta.organization_id = selectedOrgId;
      } else if (orgMode === "create" && newOrgName.trim()) {
        orgMeta.new_org_name = newOrgName.trim();
      }

      const result = await signup(email, password, name, "vendedor", orgMeta);
      setLoading(false);
      if (result.success) {
        setSuccess("Conta criada com sucesso! Verifique seu e-mail para confirmar.");
        setIsSignup(false);
        setName("");
        setPassword("");
        setOrgMode("none");
        setNewOrgName("");
        setSelectedOrgId("");
      } else {
        setError(result.error || "Erro ao criar conta");
      }
    } else {
      const ok = await login(email, password);
      setLoading(false);
      if (ok) {
        navigate("/", { replace: true });
      } else {
        setError("E-mail ou senha inválidos");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo area */}
        <div className="text-center mb-8">
          <img
            src={theme === "dark" ? upixelIconDark : upixelIconLight}
            alt="uPixel"
            className="h-14 w-14 mx-auto"
          />
          <h1 className="text-2xl font-bold text-foreground">uPixel CRM</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isSignup ? "Crie sua conta para começar" : "Faça login para acessar o sistema"}
          </p>
        </div>

        {/* Login/Signup form */}
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 shadow-xl space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <p className="text-xs text-green-600 dark:text-green-400">{success}</p>
            </div>
          )}

          {isSignup && (
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs">Nome</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="pl-10 h-10"
                  required
                />
              </div>
            </div>
          )}

          {isSignup && (
            <div className="space-y-1.5">
              <Label className="text-xs">Empresa (opcional)</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`flex-1 text-xs border rounded-lg px-3 py-2 transition-colors ${orgMode === "select" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                  onClick={() => setOrgMode(orgMode === "select" ? "none" : "select")}
                >
                  Entrar em existente
                </button>
                <button
                  type="button"
                  className={`flex-1 text-xs border rounded-lg px-3 py-2 transition-colors ${orgMode === "create" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                  onClick={() => setOrgMode(orgMode === "create" ? "none" : "create")}
                >
                  Criar nova
                </button>
              </div>

              {orgMode === "select" && (
                <div className="relative mt-1.5">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <select
                    value={selectedOrgId}
                    onChange={(e) => setSelectedOrgId(e.target.value)}
                    className="w-full pl-10 h-10 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="">Selecione uma empresa...</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {orgMode === "create" && (
                <div className="relative mt-1.5">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="Nome da empresa"
                    className="pl-10 h-10"
                  />
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs">E-mail</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
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
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10 pr-10 h-10"
                required
                minLength={6}
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full h-10 font-medium" disabled={loading}>
            {loading ? (
              <div className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
            ) : isSignup ? (
              "Criar Conta"
            ) : (
              "Entrar"
            )}
          </Button>

          <div className="text-center space-y-2">
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => {
                setIsSignup(!isSignup);
                setError("");
                setSuccess("");
              }}
            >
              {isSignup ? "Já tem conta? Faça login" : "Não tem conta? Cadastre-se"}
            </button>
          </div>

          <div className="pt-4">
            <p className="text-center text-[10px] text-muted-foreground">
              Use suas credenciais para acessar o sistema
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
