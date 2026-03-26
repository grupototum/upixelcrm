import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "supervisor" | "atendente" | "vendedor";
  avatar?: string;
  is_blocked?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demo — replace with Supabase auth in production
const MOCK_USERS: Array<AuthUser & { password: string }> = [
  { id: "u1", name: "Admin Totum", email: "admin@totumpixel.com", role: "supervisor", password: "admin123" },
  { id: "u2", name: "Maria Gerente", email: "maria@totumpixel.com", role: "atendente", password: "maria123" },
  { id: "u3", name: "João Operador", email: "joao@totumpixel.com", role: "vendedor", password: "joao123" },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage
    try {
      const stored = localStorage.getItem("totum_auth_user");
      if (stored) {
        const parsed = JSON.parse(stored) as AuthUser;
        if (!parsed.is_blocked) setUser(parsed);
      }
    } catch { /* ignore */ }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Simulate API delay
    await new Promise((r) => setTimeout(r, 400));
    const found = MOCK_USERS.find((u) => u.email === email && u.password === password);
    if (found) {
      const { password: _, ...userData } = found;
      setUser(userData);
      localStorage.setItem("totum_auth_user", JSON.stringify(userData));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("totum_auth_user");
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
