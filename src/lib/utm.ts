/**
 * UTM / Ad attribution capture
 * - Lê UTMs da URL atual e persiste em localStorage (first-touch attribution)
 * - Disponível para uso em qualquer formulário público (signup, lead capture)
 */

const STORAGE_KEY = "upixel_attribution";

export interface AttributionData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  gclid?: string;
  ad_campaign_id?: string;
  ad_adset_id?: string;
  ad_id?: string;
  referrer?: string;
  landing_page?: string;
  captured_at?: string;
}

/**
 * Lê UTMs/click IDs da URL atual e mescla com o que já foi capturado.
 * First-touch wins: se já existe attribution salva, mantém a antiga.
 */
export function captureAttribution(): AttributionData {
  if (typeof window === "undefined") return {};

  const params = new URLSearchParams(window.location.search);
  const captured: AttributionData = {};

  const fields: (keyof AttributionData)[] = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "fbclid",
    "gclid",
    "ad_campaign_id",
    "ad_adset_id",
    "ad_id",
  ];

  fields.forEach(f => {
    const v = params.get(f);
    if (v) captured[f] = v;
  });

  if (Object.keys(captured).length === 0) {
    return getStoredAttribution();
  }

  captured.referrer = document.referrer || undefined;
  captured.landing_page = window.location.pathname;
  captured.captured_at = new Date().toISOString();

  // First-touch: only save if nothing exists yet
  const existing = getStoredAttribution();
  if (Object.keys(existing).length === 0) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(captured));
    } catch (_) { /* silent */ }
  }

  return existing && Object.keys(existing).length > 0 ? existing : captured;
}

export function getStoredAttribution(): AttributionData {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

export function clearAttribution(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (_) { /* silent */ }
}

/**
 * Helper: detecta a origem mais provável baseado nos parâmetros de atribuição
 */
export function detectOrigin(attr: AttributionData): string {
  if (attr.gclid) return "Google Ads";
  if (attr.fbclid) return "Meta Ads";
  if (attr.utm_source === "facebook" || attr.utm_source === "instagram") return "Meta Ads";
  if (attr.utm_source === "google") return "Google Ads";
  if (attr.utm_source === "linkedin") return "LinkedIn";
  if (attr.utm_source === "tiktok") return "TikTok Ads";
  if (attr.utm_source) return attr.utm_source;
  if (attr.referrer && !attr.referrer.includes(window.location.hostname)) return "Website (Externo)";
  return "Website";
}
