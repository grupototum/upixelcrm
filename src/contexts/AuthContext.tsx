/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_id: string | null;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "supervisor" | "atendente" | "vendedor" | "master";
  avatar?: string;
  is_blocked?: boolean;
  client_id?: string;
  tenant_id?: string | null;
  organization_id?: string | null;
  organization?: Organization | null;
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
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) return null;

  let organization: Organization | null = null;
  const orgId = (data as any).organization_id;
  if (orgId) {
    const { data: orgData } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", orgId)
      .single();
    if (orgData) organization = orgData as Organization;
  }

  return {
    id: data.id,
    name: data.name || "",
    email: data.email || "",
    role: (data.role as AuthUser["role"]) || "vendedor",
    avatar: data.avatar_url || undefined,
    is_blocked: data.is_blocked || false,
    client_id: data.client_id || data.id,
    tenant_id: (data as any).tenant_id || null,
    organization_id: orgId || null,
    organization,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant } = useTenant();

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

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };

    // Valida se o usuário pertence ao tenant do subdomínio atual
    if (tenant) {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const profile = await fetchProfile(authUser.id);
        if (!profile || profile.tenant_id !== tenant.id) {
          await supabase.auth.signOut();
          return {
            success: false,
            error: "Usuário não pertence a esta empresa. Verifique o endereço de acesso.",
          };
        }
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
