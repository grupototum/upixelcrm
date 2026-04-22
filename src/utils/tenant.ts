const ROOT_DOMAINS = ["upixel.com.br", "localhost", "lovableproject.com", "lovable.app"];

/**
 * Extrai o subdomínio do hostname atual.
 * Retorna null quando estamos no domínio raiz (sem subdomínio, ou www).
 *
 * Exemplos:
 *   acme.upixel.com.br  → "acme"
 *   acme.localhost      → "acme"   (dev)
 *   localhost           → null
 *   upixel.com.br       → null
 *   www.upixel.com.br   → null
 */
export function getTenantSubdomain(): string | null {
  const hostname = window.location.hostname;

  // Verifica se o hostname inteiro é um domínio raiz conhecido
  const isRootDomain = ROOT_DOMAINS.some(
    (root) => hostname === root || hostname === `www.${root}`
  );
  if (isRootDomain) return null;

  // Extrai a parte antes do primeiro ponto
  const dotIndex = hostname.indexOf(".");
  if (dotIndex === -1) return null;

  const subdomain = hostname.slice(0, dotIndex).toLowerCase();

  // "www" é tratado como domínio raiz
  if (subdomain === "www") return null;

  return subdomain || null;
}

/**
 * Monta a URL base para um tenant.
 * Em desenvolvimento usa .localhost; em produção usa o domínio configurado.
 */
export function getTenantUrl(subdomain: string): string {
  const { protocol, port } = window.location;
  const portSuffix = port && port !== "80" && port !== "443" ? `:${port}` : "";

  if (
    window.location.hostname === "localhost" ||
    window.location.hostname.endsWith(".localhost")
  ) {
    return `${protocol}//${subdomain}.localhost${portSuffix}`;
  }

  const productionDomain = import.meta.env.VITE_ROOT_DOMAIN ?? "upixel.com.br";
  return `${protocol}//${subdomain}.${productionDomain}`;
}
