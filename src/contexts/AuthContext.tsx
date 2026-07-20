/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import * as usersRepo from "@/services/users";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

// Após 30 min sem qualquer interação (mousemove/keydown/click/touch/scroll),
// força logout — protege sessões esquecidas em máquinas compartilhadas.
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

export interface AuthOrganization {
  id: string;
  name: string;
  slug: string;
  subdomain?: string | null;
  tenant_id?: string | null;
  owner_id: string | null;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  // Hierarquia: master (cross-tenant) > admin (full power no tenant) > supervisor
  // > gerente > vendedor > atendente. 'supervisor' é alias legacy de 'admin' — mantido
  // pra compat com dados existentes (substituído gradualmente).
  role: "master" | "admin" | "supervisor" | "gerente" | "vendedor" | "atendente";
  avatar?: string;
  is_blocked?: boolean;
  approval_status?: "pending" | "approved" | "rejected";
  client_id?: string;
  tenant_id?: string | null;
  organization_id?: string | null;
  organization?: AuthOrganization | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchProfile(userId: string): Promise<AuthUser | null> {
  const data = await usersRepo.getProfileById(userId);

  if (!data) return null;

  let organization: AuthOrganization | null = null;
  const orgId = data.organization_id;
  if (orgId) {
    try {
      const orgData = await usersRepo.getOrganizationById(orgId);
      if (orgData) organization = orgData as AuthOrganization;
    } catch {
      // preserva comportamento original: erro ao buscar organization não bloqueia o login
    }
  }

  return {
    id: data.id,
    name: data.name || "",
    email: data.email || "",
    role: (data.role as AuthUser["role"]) || "vendedor",
    avatar: data.avatar_url || undefined,
    is_blocked: data.is_blocked || false,
    approval_status: (data.approval_status as AuthUser["approval_status"]) || "approved",
    client_id: data.client_id || data.id,
    tenant_id: data.tenant_id || null,
    organization_id: orgId || null,
    organization,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant, organization: currentOrg } = useTenant();
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blockListenerRef = useRef<{ unsubscribe?: () => void } | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setTimeout(async () => {
            const profile = await fetchProfile(session.user.id);
            if (profile && !profile.is_blocked) {
              setUser(profile);
            } else {
              setUser(null);
            }
            setIsLoading(false);
          }, 0);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        if (profile && !profile.is_blocked) {
          setUser(profile);
        }
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Idle timeout — força logout após 30 min sem atividade. ────────────────
  // Resetado por qualquer interação (mouse/keyboard/touch/scroll). Quando o
  // user é null, o handler não faz nada (não precisa armar timer).
  useEffect(() => {
    if (!user) return;

    const armTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(async () => {
        toast.warning("Sua sessão expirou por inatividade. Faça login novamente.", { duration: 8000 });
        await supabase.auth.signOut();
        setUser(null);
      }, IDLE_TIMEOUT_MS);
    };

    const events: Array<keyof WindowEventMap> = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    let throttled = false;
    const onActivity = () => {
      if (throttled) return;
      throttled = true;
      armTimer();
      setTimeout(() => { throttled = false; }, 1000);
    };

    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    armTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [user]);

  // ── Realtime block listener — admin bloquia user → logout imediato. ───────
  // Sem isso, user bloqueado permanece logado até troca de aba ou refresh.
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`auth-block-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload) => {
          const next = payload.new as { is_blocked?: boolean; approval_status?: string };
          if (next.is_blocked || next.approval_status === "rejected") {
            toast.error("Acesso revogado pelo administrador.", { duration: 8000 });
            void supabase.auth.signOut().then(() => setUser(null));
          }
        },
      )
      .subscribe();

    blockListenerRef.current = channel;
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      await supabase.auth.signOut();
      return { success: false, error: "Erro ao obter usuário." };
    }

    const profile = await fetchProfile(authUser.id);
    if (!profile) {
      await supabase.auth.signOut();
      return { success: false, error: "Perfil não encontrado." };
    }

    // Bloquear login de usuários pendentes ou rejeitados
    if (profile.approval_status === "pending") {
      await supabase.auth.signOut();
      return {
        success: false,
        error: "Sua conta está aguardando aprovação do administrador. Você receberá acesso assim que for aprovada.",
      };
    }
    if (profile.approval_status === "rejected") {
      await supabase.auth.signOut();
      return {
        success: false,
        error: "Sua conta foi recusada pelo administrador. Entre em contato com o suporte.",
      };
    }

    // role='master' tem acesso irrestrito a todos os tenants e orgs
    if (profile.role === "master") {
      return { success: true };
    }

    // Validação por organization (quando subdomain resolve para uma org)
    if (currentOrg) {
      if (profile.organization_id !== currentOrg.id) {
        await supabase.auth.signOut();
        return {
          success: false,
          error: "Usuário não pertence a esta organização. Verifique o endereço de acesso.",
        };
      }
      return { success: true };
    }

    // Validação por tenant (fallback quando subdomain resolve diretamente para tenant)
    if (tenant) {
      if (profile.tenant_id !== tenant.id) {
        await supabase.auth.signOut();
        return {
          success: false,
          error: "Usuário não pertence a esta empresa. Verifique o endereço de acesso.",
        };
      }
    }

    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
