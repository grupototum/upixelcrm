// Validação estrita de URL de webhook (anti-SSRF). Espelha
// supabase/functions/_shared/webhook-url.ts — mantenha os dois em sincronia.
export function isStrictWebhookUrl(url: string): boolean {
  if (!url || !url.startsWith("https://")) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    if (host.length === 0) return false;
    if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false;
    if (/^127\./.test(host)) return false;
    if (/^0\./.test(host)) return false;
    if (/^10\./.test(host)) return false;
    if (/^192\.168\./.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
    if (/^169\.254\./.test(host)) return false;
    if (host === "[::1]" || host === "::1") return false;
    return true;
  } catch {
    return false;
  }
}
