import { supabase } from "@/integrations/supabase/client";

// Repositório do domínio users (profiles) — somente as leituras/escritas usadas
// por hooks e componentes moderados. Gestão administrativa de usuários e
// organizações (UsersPage, OrganizationSection, Signup) é área sensível e fica
// fora deste módulo até o Lote 4.

/** client_id do perfil do usuário autenticado (null se perfil não existe). */
export async function getProfileClientId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("client_id")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data?.client_id ?? null;
}

/** Membros do tenant (para mentions e afins). */
export async function listClientMembers(
  clientId: string
): Promise<{ id: string; name: string | null; email: string | null }[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email")
    .eq("client_id", clientId);
  if (error) throw error;
  return data ?? [];
}

/** Agentes ativos do tenant (atribuição de conversas). */
export async function listActiveAgents(clientId: string): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("client_id", clientId)
    .in("role", ["supervisor", "atendente", "vendedor", "master"])
    .eq("is_blocked", false)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function updateProfileName(userId: string, name: string): Promise<void> {
  // profiles.name existe no banco mas não nos tipos gerados (schema drift)
  const { error } = await supabase.from("profiles").update({ name } as never).eq("id", userId);
  if (error) throw error;
}
