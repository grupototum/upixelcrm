import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

// Ponto ÚNICO de leitura de sessão/usuário fora do AuthContext (Lote 4, L4-5).
// Fluxos de auth (signIn/signUp/signOut/updateUser/onAuthStateChange) continuam
// exclusivos do AuthContext, SignupPage e SecuritySettings — aqui é só leitura.

/** Sessão atual (null se deslogado). */
export async function getCurrentSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/** Usuário autenticado atual (null se deslogado). */
export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
