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

/**
 * Resolve o client_id correto pra usar em queries e inserts.
 *
 * Prioriza `tenant.id` quando for UUID válido — esse é o tenant que o user
 * está vendo no momento (em subdomain "totum.upixel.app" ou em impersonation
 * de master via picker). Cai para `user.client_id` quando não tem tenant válido
 * (típico em rotas pré-login ou em master view do subdomínio raiz).
 *
 * BUG histórico (anteriormente `user?.client_id ?? tenant?.id`): users master
 * têm `user.client_id === user.id` (o próprio profile id), o que NÃO é um tenant.
 * Esse fallback prematuro fazia o master criar registros com client_id apontando
 * pro próprio profile — registros ficavam órfãos (invisíveis ao tenant correto).
 *
 * Use SEMPRE este helper em vez de `user?.client_id ?? tenant?.id`.
 */
export function resolveClientId(
  tenantId: string | null | undefined,
  userClientId: string | null | undefined,
): string | null {
  if (isValidUuid(tenantId)) return tenantId;
  if (isValidUuid(userClientId)) return userClientId;
  // Fallback para strings não-UUID legadas (ex: "demo1", "c1") — preserva
  // compat com tenants antigos que ainda não foram migrados para UUID.
  return userClientId ?? tenantId ?? null;
}
