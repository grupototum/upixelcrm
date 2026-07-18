import { supabase } from "@/integrations/supabase/client";

// Repositório do fluxo de signup/provisionamento de tenant (SignupPage).
// auth.signUp NÃO mora aqui — permanece na página (fluxo de auth intocado,
// regra do Lote 4). Rollbacks manuais continuam orquestrados pela página.

/** true se o subdomínio já existe em tenants OU organizations. Erros são
 * ignorados (tratados como disponível) — mesmo comportamento do original. */
export async function isSubdomainTaken(subdomain: string): Promise<boolean> {
  const [{ data: tenantMatch }, { data: orgMatch }] = await Promise.all([
    supabase.from("tenants").select("id").eq("subdomain", subdomain).maybeSingle(),
    supabase.from("organizations").select("id").eq("subdomain", subdomain).maybeSingle(),
  ]);
  return Boolean(tenantMatch || orgMatch);
}

/** Reserva o tenant e retorna o id. */
export async function createTenant(name: string, subdomain: string): Promise<string> {
  const { data, error } = await supabase
    .from("tenants")
    .insert({ name, subdomain })
    .select("id")
    .single();
  if (error) throw error;
  if (!data) throw new Error("Erro ao reservar subdomínio.");
  return data.id;
}

/** Cria a organização do tenant e retorna o id. */
export async function createTenantOrganization(row: {
  name: string;
  slug: string;
  subdomain: string;
  tenant_id: string;
}): Promise<string> {
  const { data, error } = await supabase.from("organizations").insert(row).select("id").single();
  if (error) throw error;
  if (!data) throw new Error("Erro ao criar organização.");
  return data.id;
}

export async function deleteTenant(id: string): Promise<void> {
  const { error } = await supabase.from("tenants").delete().eq("id", id);
  if (error) throw error;
}

export async function setTenantOwner(tenantId: string, ownerId: string): Promise<void> {
  const { error } = await supabase.from("tenants").update({ owner_id: ownerId }).eq("id", tenantId);
  if (error) throw error;
}

export async function setOrganizationOwner(orgId: string, ownerId: string): Promise<void> {
  const { error } = await supabase.from("organizations").update({ owner_id: ownerId }).eq("id", orgId);
  if (error) throw error;
}

/** Valida a senha do gate de signup. Erro da edge = senha tratada como incorreta. */
export async function checkSignupGate(password: string): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke("check-signup-gate", {
    body: { password },
  });
  if (error) return false;
  return Boolean((data as { ok?: boolean } | null)?.ok);
}

/** Notifica o time sobre o signup (fire-and-forget — quem chama decide o .catch). */
export function notifySignup(body: {
  tenantId: string;
  tenantName: string;
  subdomain: string;
  ownerEmail: string;
  ownerName: string;
}): Promise<unknown> {
  return supabase.functions.invoke("notify-signup", { body });
}

/** Provisiona o subdomínio como custom domain na Vercel (fire-and-forget). */
export function provisionTenantDomain(subdomain: string): Promise<unknown> {
  return supabase.functions.invoke("tenant-provision-domain", { body: { subdomain } });
}
