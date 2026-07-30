import { describe, expect, it } from "vitest";
import { evaluateProfileAccess } from "@/lib/auth-access";
import type { Organization, Tenant } from "@/contexts/TenantContext";

const tenant: Tenant = {
  id: "t-1",
  name: "Acme",
  subdomain: "acme",
  plan: "free",
  owner_id: null,
  is_active: true,
  created_at: "",
  updated_at: "",
};

const organization: Organization = {
  id: "o-1",
  name: "Acme",
  slug: "acme",
  subdomain: "acme",
  tenant_id: "t-1",
  owner_id: null,
  created_at: "",
  updated_at: "",
};

describe("evaluateProfileAccess", () => {
  it("bloqueia conta pendente antes de qualquer outra checagem", () => {
    expect(
      evaluateProfileAccess(
        { role: "supervisor", approval_status: "pending", tenant_id: "t-1" },
        tenant,
        null
      )
    ).toBe("pending");
  });

  it("bloqueia conta rejeitada", () => {
    expect(
      evaluateProfileAccess(
        { role: "vendedor", approval_status: "rejected", tenant_id: "t-1" },
        tenant,
        null
      )
    ).toBe("rejected");
  });

  it("master aprovado passa em qualquer workspace", () => {
    expect(
      evaluateProfileAccess(
        { role: "master", approval_status: "approved", tenant_id: null },
        tenant,
        organization
      )
    ).toBeNull();
  });

  it("valida por organization quando o subdomínio resolve para org", () => {
    expect(
      evaluateProfileAccess(
        { role: "supervisor", approval_status: "approved", organization_id: "o-1" },
        tenant,
        organization
      )
    ).toBeNull();
    expect(
      evaluateProfileAccess(
        { role: "supervisor", approval_status: "approved", organization_id: "o-2" },
        tenant,
        organization
      )
    ).toBe("wrong_org");
  });

  it("valida por tenant quando não há organization", () => {
    expect(
      evaluateProfileAccess(
        { role: "supervisor", approval_status: "approved", tenant_id: "t-1" },
        tenant,
        null
      )
    ).toBeNull();
    expect(
      evaluateProfileAccess(
        { role: "supervisor", approval_status: "approved", tenant_id: "t-2" },
        tenant,
        null
      )
    ).toBe("wrong_tenant");
  });

  it("aceita perfil legado sem tenant_id quando client_id é o tenant", () => {
    expect(
      evaluateProfileAccess(
        { role: "vendedor", approval_status: "approved", tenant_id: null, client_id: "t-1" },
        tenant,
        null
      )
    ).toBeNull();
  });

  it("trata tenant_id zero-uuid (backfill M55) como não vinculado", () => {
    expect(
      evaluateProfileAccess(
        {
          role: "vendedor",
          approval_status: "approved",
          tenant_id: "00000000-0000-0000-0000-000000000000",
          client_id: "t-1",
        },
        tenant,
        null
      )
    ).toBeNull();
  });

  it("permite acesso quando não há tenant nem org resolvidos", () => {
    expect(
      evaluateProfileAccess(
        { role: "vendedor", approval_status: "approved", tenant_id: null },
        null,
        null
      )
    ).toBeNull();
  });
});
