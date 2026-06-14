import { describe, it, expect } from "vitest";
import { isValidUuid, tenantIdField, resolveClientId } from "@/lib/tenant-utils";

const UUID = "123e4567-e89b-42d3-a456-426614174000";
const OTHER_UUID = "00000000-0000-4000-8000-000000000001";

describe("isValidUuid", () => {
  it("aceita UUID v4 válido (case-insensitive)", () => {
    expect(isValidUuid(UUID)).toBe(true);
    expect(isValidUuid(UUID.toUpperCase())).toBe(true);
  });

  it("rejeita sentinela 'master', strings legadas, null e undefined", () => {
    expect(isValidUuid("master")).toBe(false);
    expect(isValidUuid("demo1")).toBe(false);
    expect(isValidUuid("")).toBe(false);
    expect(isValidUuid(null)).toBe(false);
    expect(isValidUuid(undefined)).toBe(false);
  });

  it("rejeita UUID malformado", () => {
    expect(isValidUuid(UUID.slice(0, -1))).toBe(false);
    expect(isValidUuid(UUID + "0")).toBe(false);
    expect(isValidUuid(UUID.replace("-", ""))).toBe(false);
  });
});

describe("tenantIdField", () => {
  it("retorna { tenant_id } para UUID válido", () => {
    expect(tenantIdField(UUID)).toEqual({ tenant_id: UUID });
  });

  it("retorna {} para 'master', null e undefined — evita 400 do Postgres", () => {
    expect(tenantIdField("master")).toEqual({});
    expect(tenantIdField(null)).toEqual({});
    expect(tenantIdField(undefined)).toEqual({});
  });
});

describe("resolveClientId", () => {
  it("prioriza tenant.id quando é UUID válido", () => {
    expect(resolveClientId(UUID, OTHER_UUID)).toBe(UUID);
  });

  it("cai para user.client_id quando tenant é sentinela 'master'", () => {
    expect(resolveClientId("master", OTHER_UUID)).toBe(OTHER_UUID);
  });

  it("cai para user.client_id quando tenant é null/undefined", () => {
    expect(resolveClientId(null, OTHER_UUID)).toBe(OTHER_UUID);
    expect(resolveClientId(undefined, OTHER_UUID)).toBe(OTHER_UUID);
  });

  it("preserva client_id legado não-UUID como último recurso", () => {
    expect(resolveClientId(null, "demo1")).toBe("demo1");
    expect(resolveClientId("master", "c1")).toBe("c1");
  });

  it("usa tenantId não-UUID se não houver client_id (compat legada)", () => {
    expect(resolveClientId("demo1", null)).toBe("demo1");
  });

  it("retorna null quando nada disponível", () => {
    expect(resolveClientId(null, null)).toBeNull();
    expect(resolveClientId(undefined, undefined)).toBeNull();
  });
});
