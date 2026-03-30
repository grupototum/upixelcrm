/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "supervisor" | "atendente" | "vendedor";
  avatar?: string;
  is_blocked?: boolean;
  client_id?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string, role?: string) => Promise<{ success: boolean; error?: string }>;
  loginAsDemo: (type: "demo" | "master") => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for simulation/demo
const MOCK_USERS: Array<AuthUser & { password: string }> = [
  { id: "udem1", name: "Usuário Demo", email: "demo@upixel.com.br", role: "atendente", password: "demo123", client_id: "c1" },
  { id: "umast1", name: "Usuário Master", email: "master@upixel.com.br", role: "supervisor", password: "master123", client_id: "c1" },
];

async function fetchProfile(userId: string): Promise<AuthUser | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name || "",
    email: data.email || "",
    role: (data.role as AuthUser["role"]) || "vendedor",
    avatar: data.avatar_url || undefined,
    is_blocked: data.is_blocked || false,
    client_id: data.client_id || "default",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listen for auth state changes FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Use setTimeout to avoid Supabase deadlock on initial load
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

    // Then check existing session
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

  const login = async (email: string, password: string): Promise<boolean> => {
    // Check mock users first (for demo/simulation)
    const mockUser = MOCK_USERS.find(u => u.email === email && u.password === password);
    if (mockUser) {
      const { password: _, ...userData } = mockUser;
      setUser(userData);
      localStorage.setItem("totum_auth_user", JSON.stringify(userData));
      return true;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return !error;
  };

  const loginAsDemo = async (type: "demo" | "master") => {
    const email = type === "demo" ? "demo@upixel.com.br" : "master@upixel.com.br";
    const password = type === "demo" ? "demo123" : "master123";
    await login(email, password);
  };

  const signup = async (
    email: string,
    password: string,
    name: string,
    role: string = "vendedor"
  ): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role },
      },
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, signup, loginAsDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
