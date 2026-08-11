// HMAC do header X-Hub-Signature-256 usado por toda a família de webhooks da
// Meta (WhatsApp Evolution/Cloud, Instagram, Facebook Messenger). A mesma
// implementação — comparação em tempo constante — vivia copiada em 4 edge
// functions; consolidada aqui.
export async function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  logLabel: string,
): Promise<boolean> {
  if (!secret) {
    // Sem secret configurado, nega — nunca aceita silenciosamente.
    console.error(`[${logLabel}] app secret not configured`);
    return false;
  }
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const expected = signatureHeader.slice("sha256=".length);
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Comparação em tempo constante — evita timing oracle sobre a assinatura.
  if (computed.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
