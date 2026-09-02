import { supabase } from "@/integrations/supabase/client";
import { untypedRpc } from "@/lib/supabase-untyped";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

// Repositório do domínio users (profiles, notifications) e, a partir do
// Lote 4, também da gestão administrativa de usuários/organizações.

/** Perfil completo por id; null em erro ou inexistente (bootstrap do AuthContext). */
export async function getProfileById(userId: string): Promise<Tables<"profiles"> | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error || !data) return null;
  return data;
}

export async function ensureOwnProfile(): Promise<void> {
  const { error } = await untypedRpc("ensure_own_profile");
  if (error) throw error;
}

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

/** Agentes ativos do tenant (atribuição de conversas).
 * Inclui masters globais que podem não ter profile no tenant específico. */
export async function listActiveAgents(clientId: string): Promise<{ id: string; name: string; avatar_url?: string | null }[]> {
  const { data: tenantProfiles, error } = await supabase
    .from("profiles")
    .select("id, name, avatar_url")
    .eq("client_id", clientId)
    .in("role", ["supervisor", "atendente", "vendedor", "master"])
    .eq("is_blocked", false)
    .order("name");
  if (error) throw error;

  const tenantIds = (tenantProfiles ?? []).map((p) => p.id);
  const { data: masterProfiles } = await supabase
    .from("profiles")
    .select("id, name, avatar_url")
    .eq("role", "master")
    .eq("is_blocked", false)
    .not("id", "in", `(${tenantIds.join(",") || "00000000-0000-0000-0000-000000000000"})`);

  const all = [...(tenantProfiles ?? []), ...(masterProfiles ?? [])];
  const seen = new Set<string>();
  return all.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

export async function updateProfileName(userId: string, name: string): Promise<void> {
  // profiles.name existe no banco mas não nos tipos gerados (schema drift)
  const { error } = await supabase.from("profiles").update({ name } as never).eq("id", userId);
  if (error) throw error;
}

/** Notificações in-app (mentions e afins). */
export async function insertNotifications(rows: TablesInsert<"notifications">[]): Promise<void> {
  const { error } = await supabase.from("notifications").insert(rows);
  if (error) throw error;
}

export async function listNotifications(userId: string, limit = 20) {
  const { data } = await supabase
    .from("notifications")
    .select("id, title, body, type, read, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase.from("notifications").update({ read: true }).eq("id", id);
}

// ---- push_subscriptions ----

export async function upsertPushSubscription(row: TablesInsert<"push_subscriptions">): Promise<void> {
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(row, { onConflict: "user_id,endpoint" });
  if (error) throw error;
}

export async function deletePushSubscription(userId: string, endpoint: string): Promise<void> {
  await supabase.from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", endpoint);
}

// ---- administração de usuários/organizações (Lote 4 — UsersPage) ----
// As decisões de permissão (quem pode chamar o quê) ficam na página;
// aqui só o acesso. RPCs fazem a checagem real no servidor.

/**
 * Lista profiles para a tela de administração. Passe EXATAMENTE um filtro
 * (tenantId | organizationId | selfId) ou nenhum (master vê todos).
 */
export async function listProfilesForAdmin(filter: {
  tenantId?: string;
  organizationId?: string;
  selfId?: string;
} = {}): Promise<Record<string, unknown>[]> {
  let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });
  if (filter.tenantId) query = query.eq("tenant_id", filter.tenantId);
  else if (filter.organizationId) query = query.eq("organization_id", filter.organizationId);
  else if (filter.selfId !== undefined) query = query.eq("id", filter.selfId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listOrganizations(): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listAuditLogs(tenantId?: string, limit = 50): Promise<Record<string, unknown>[]> {
  let query = supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(limit);
  if (tenantId) query = query.eq("tenant_id", tenantId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function insertAuditLog(row: {
  user_id?: string | null;
  user_name: string;
  action: string;
  details: Record<string, unknown> | null;
  tenant_id: string | null;
}): Promise<void> {
  const { error } = await supabase.from("audit_log").insert(row as never);
  if (error) throw error;
}

/* eslint-disable @typescript-eslint/no-explicit-any -- RPCs administrativas fora dos tipos gerados */
export async function setUserBlocked(asMaster: boolean, targetUserId: string, blockStatus: boolean): Promise<void> {
  const rpcName = asMaster ? "admin_toggle_block" : "supervisor_toggle_block";
  const { error } = await supabase.rpc(rpcName as any, {
    target_user_id: targetUserId,
    block_status: blockStatus,
  });
  if (error) throw error;
}

export async function adminDeleteUser(targetUserId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_delete_user" as any, { target_user_id: targetUserId });
  if (error) throw error;
}

export async function adminApproveUser(targetUserId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_approve_user" as any, { target_user_id: targetUserId });
  if (error) throw error;
}

export async function setUserRole(asMaster: boolean, targetUserId: string, newRole: string): Promise<void> {
  const rpcName = asMaster ? "admin_set_role" : "supervisor_set_role";
  const { error } = await supabase.rpc(rpcName as any, {
    target_user_id: targetUserId,
    new_role: newRole,
  });
  if (error) throw error;
}

export async function adminAddOrgMember(targetUserId: string, targetOrgId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_add_org_member" as any, {
    target_user_id: targetUserId,
    target_org_id: targetOrgId,
  });
  if (error) throw error;
}

export async function adminRemoveOrgMember(targetUserId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_remove_org_member" as any, { target_user_id: targetUserId });
  if (error) throw error;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function deleteOrganization(orgId: string): Promise<void> {
  const { error } = await supabase.from("organizations").delete().eq("id", orgId);
  if (error) throw error;
}

// ---- empresa do usuário (OrganizationSection) ----

export async function getProfileOrganizationId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data?.organization_id ?? null;
}

export async function getOrganizationById(orgId: string): Promise<Tables<"organizations"> | null> {
  const { data, error } = await supabase.from("organizations").select("*").eq("id", orgId).single();
  if (error) throw error;
  return data ?? null;
}

export async function listOrgMembers(
  orgId: string
): Promise<{ id: string; name: string; email: string | null; role: string; avatar_url: string | null }[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email, role, avatar_url")
    .eq("organization_id", orgId);
  if (error) throw error;
  return (data ?? []) as never;
}

export async function insertOrganization(row: {
  name: string;
  slug: string;
  subdomain: string;
  tenant_id: string | null;
  owner_id: string;
}): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.from("organizations").insert(row as never).select().single();
  if (error) throw error;
  return data;
}

/** Vincula (ou desvincula, com null) o profile a uma organização. */
export async function setProfileOrganization(
  userId: string,
  organizationId: string | null,
  extra: Record<string, unknown> = {}
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ organization_id: organizationId, ...extra } as never)
    .eq("id", userId);
  if (error) throw error;
}

export async function findProfileBasicsByEmail(
  email: string
): Promise<{ id: string; organization_id: string | null } | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, organization_id")
    .eq("email", email)
    .single();
  if (error) throw error;
  return data ?? null;
}

/* eslint-disable @typescript-eslint/no-explicit-any -- RPCs fora dos tipos gerados */
export async function ownerAddOrgMember(targetUserId: string, targetOrgId: string): Promise<void> {
  const { error } = await supabase.rpc("owner_add_org_member" as any, {
    target_user_id: targetUserId,
    target_org_id: targetOrgId,
  });
  if (error) throw error;
}

export async function ownerRemoveOrgMember(targetUserId: string): Promise<void> {
  const { error } = await supabase.rpc("owner_remove_org_member" as any, { target_user_id: targetUserId });
  if (error) throw error;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Cria usuário via edge admin-create-user. O accessToken vem de quem chama
 * (sessão continua responsabilidade do AuthContext/página — Lote 4 L4-5).
 * Retorna o JSON da resposta; lança se !response.ok com a mensagem da API.
 */
export async function invokeAdminCreateUser(
  accessToken: string,
  payload: { name: string; email: string; password: string; role: string; organization_id: string | null }
): Promise<{ user: { id: string } }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const response = await fetch(`${supabaseUrl}/functions/v1/admin-create-user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Erro ao criar usuário");
  return result;
}
