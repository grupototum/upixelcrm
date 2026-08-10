import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";
import { ACCESS_DENIAL_MESSAGES, type AccessDenialReason } from "@/lib/auth-access";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Eye, EyeOff, AlertCircle, Lock, Sparkles, CheckCircle2 } from "lucide-react";
import upixelIconLight from "@/assets/upixel_icon_light.png";
import upixelIconDark from "@/assets/upixel_icon_dark.png";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const URL_ERROR_MESSAGES: Record<string, string> = {
  expired: "Seu link de acesso expirou ou é inválido. Solicite um novo Magic Link.",
  blocked: ACCESS_DENIAL_MESSAGES.blocked,
  pending: ACCESS_DENIAL_MESSAGES.pending,
  rejected: ACCESS_DENIAL_MESSAGES.rejected,
  wrong_org: ACCESS_DENIAL_MESSAGES.wrong_org,
  wrong_tenant: ACCESS_DENIAL_MESSAGES.wrong_tenant,
} satisfies Record<AccessDenialReason | "expired", string>;

type LoginMode = "password" | "magic";

export default function LoginPage() {
  const { theme } = useTheme();
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [mode, setMode] = useState<LoginMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [magicEmail, setMagicEmail] = useState("");
  const [magicError, setMagicError] = useState("");
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  const urlError = useMemo(() => {
    const code = searchParams.get("error");
    return code ? URL_ERROR_MESSAGES[code] ?? URL_ERROR_MESSAGES.expired : "";
  }, [searchParams]);

  useEffect(() => {
    if (isAuthenticated) navigate("/", { replace: true });
  }, [isAuthenticated, navigate]);

  const clearUrlError = () => {
    if (searchParams.get("error")) setSearchParams({}, { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    clearUrlError();
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      navigate("/", { replace: true });
    } else {
      setError(result.error || "E-mail ou senha inválidos");
    }
  };

  const handleMagicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMagicError("");
    clearUrlError();

    if (!EMAIL_REGEX.test(magicEmail.trim())) {
      setMagicError("Informe um e-mail válido.");
      return;
    }

    setMagicLoading(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: magicEmail.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setMagicLoading(false);

    if (otpError) {
      setMagicError(otpError.message);
      return;
    }
    setMagicSent(true);
  };

  const switchMode = (next: LoginMode) => {
    setMode(next);
    setError("");
    setMagicError("");
    setMagicSent(false);
  };

  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center px-4"
      style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif", letterSpacing: "-0.06em" }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img
            src={theme === "dark" ? upixelIconDark : upixelIconLight}
            alt="uPixel"
            className="h-14 w-14 mx-auto"
          />
          <h1 className="text-2xl font-bold text-foreground">uPixel CRM</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Faça login para acessar o sistema
          </p>
        </div>

        <div className="bg-card border border-border rounded-card p-6 shadow-xl space-y-4">
          {urlError && (
            <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-xs text-destructive">{urlError}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-1 bg-muted rounded-lg p-1">
            <button
              type="button"
              onClick={() => switchMode("password")}
              className={`h-8 rounded-md text-xs font-medium transition-colors ${
                mode === "password"
                  ? "bg-card text-foreground border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Senha
            </button>
            <button
              type="button"
              onClick={() => switchMode("magic")}
              className={`h-8 rounded-md text-xs font-medium transition-colors ${
                mode === "magic"
                  ? "bg-card text-foreground border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Magic Link
            </button>
          </div>

          {mode === "password" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                  <p className="text-xs text-destructive">{error}</p>
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
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword
                      ? <EyeOff className="h-4 w-4 text-muted-foreground" />
                      : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full h-10 font-medium" disabled={loading}>
                {loading
                  ? <div className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                  : "Entrar"}
              </Button>
            </form>
          ) : magicSent ? (
            <div className="text-center space-y-3 py-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">Verifique seu email.</p>
              <p className="text-xs text-muted-foreground">
                Enviamos um link de acesso para{" "}
                <span className="font-medium text-foreground">{magicEmail.trim()}</span>
              </p>
            </div>
          ) : (
            <form onSubmit={handleMagicSubmit} className="space-y-4" noValidate>
              <p className="text-xs text-muted-foreground">
                Receba um link de acesso por e-mail, sem precisar de senha.
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="magic-email" className="text-xs">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="magic-email"
                    type="email"
                    value={magicEmail}
                    onChange={(e) => {
                      setMagicEmail(e.target.value);
                      setMagicError("");
                    }}
                    placeholder="seu@email.com"
                    className="pl-10 h-10"
                    aria-invalid={magicError ? true : undefined}
                  />
                </div>
                {magicError && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {magicError}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full h-10 font-medium" disabled={magicLoading}>
                {magicLoading
                  ? <div className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                  : (
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Enviar Magic Link
                    </span>
                  )}
              </Button>
            </form>
          )}

          <p className="text-center text-[10px] text-muted-foreground pt-2">
            Use suas credenciais para acessar o sistema
          </p>
        </div>
      </div>
    </div>
  );
}
