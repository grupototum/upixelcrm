import type { Organization, Tenant } from "@/contexts/TenantContext";

const EMPTY_TENANT_ID = "00000000-0000-0000-0000-000000000000";

export interface AccessProfile {
  role: string;
  approval_status?: string | null;
  tenant_id?: string | null;
  client_id?: string | null;
  organization_id?: string | null;
}

export type AccessDenialReason = "pending" | "rejected" | "wrong_org" | "wrong_tenant";

export const ACCESS_DENIAL_MESSAGES: Record<AccessDenialReason, string> = {
  pending:
    "Sua conta está aguardando aprovação do administrador. Você receberá acesso assim que for aprovada.",
  rejected: "Sua conta foi recusada pelo administrador. Entre em contato com o suporte.",
  wrong_org: "Usuário não pertence a esta organização. Verifique o endereço de acesso.",
  wrong_tenant: "Usuário não pertence a esta empresa. Verifique o endereço de acesso.",
};

export function evaluateProfileAccess(
  profile: AccessProfile,
  tenant: Tenant | null,
  organization: Organization | null
): AccessDenialReason | null {
  if (profile.approval_status === "pending") return "pending";
  if (profile.approval_status === "rejected") return "rejected";
  if (profile.role === "master") return null;

  if (organization) {
    return profile.organization_id === organization.id ? null : "wrong_org";
  }

  if (tenant) {
    const tenantId =
      profile.tenant_id && profile.tenant_id !== EMPTY_TENANT_ID ? profile.tenant_id : null;
    const belongs = tenantId === tenant.id || (!tenantId && profile.client_id === tenant.id);
    return belongs ? null : "wrong_tenant";
  }

  return null;
}
