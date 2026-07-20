import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

// Repositório da resolução de tenant/organization por subdomínio (bootstrap
// do TenantContext). Erros são engolidos de propósito — mesmo comportamento
// do código original, que tratava qualquer falha como "não encontrado".

/** Organization pelo subdomínio (1ª tentativa de resolução). */
export async function getOrganizationBySubdomain(
  subdomain: string
): Promise<Tables<"organizations"> | null> {
  const { data } = await supabase
    .from("organizations")
    .select("*")
    .eq("subdomain", subdomain)
    .maybeSingle();
  return data ?? null;
}

/** Tenant ativo pelo id (tenant pai de uma organization resolvida). */
export async function getActiveTenantById(tenantId: string): Promise<Tables<"tenants"> | null> {
  const { data } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .eq("is_active", true)
    .single();
  return data ?? null;
}

/** Tenant ativo pelo subdomínio (fallback de retrocompatibilidade, sem organization). */
export async function getActiveTenantBySubdomain(
  subdomain: string
): Promise<Tables<"tenants"> | null> {
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("subdomain", subdomain)
    .eq("is_active", true)
    .single();
  if (error || !data) return null;
  return data;
}
