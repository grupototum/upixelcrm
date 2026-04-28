/**
 * Utilitários para validação de tenant_id em inserts.
 *
 * No subdomínio "master", o TenantContext seta tenant.id = "master"
 * (sentinela, não UUID válido). Inserir esse valor em colunas
 * tenant_id (UUID) gera erro 400 do Postgres:
 *   "invalid input syntax for type uuid: 'master'"
 *
 * Use estes helpers para garantir que só UUID válido é enviado.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * Retorna `{ tenant_id }` apenas se `tenantId` for UUID válido,
 * caso contrário retorna `{}`. Útil para spread em payloads de insert.
 *
 * @example
 *   await supabase.from("leads").insert({
 *     name: "John",
 *     ...tenantIdField(tenant?.id),
 *   });
 */
export function tenantIdField(tenantId: string | null | undefined): Record<string, string> {
  return isValidUuid(tenantId) ? { tenant_id: tenantId } : {};
}
