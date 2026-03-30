import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Eye, EyeOff, AlertCircle, Lock, User } from "lucide-react";
import upixelIconLight from "@/assets/upixel_icon_light.png";
import upixelIconDark from "@/assets/upixel_icon_dark.png";

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
      const result = await signup(email, password, name);
      setLoading(false);
      if (result.success) {
        setSuccess("Conta criada com sucesso! Você já pode fazer login.");
        setIsSignup(false);
        setName("");
        setPassword("");
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
        </form>
      </div>
    </div>
  );
}
