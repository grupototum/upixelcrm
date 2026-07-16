// Envio de mensagem pelo canal WhatsApp/Evolution — mesmo contrato usado hoje
// pelo uPixel (ver `sendBotMessage` em supabase/functions/whatsapp-webhook).

export interface EvolutionConfig {
  api_url: string;
  api_key: string;
  instance_name: string;
}

// Normaliza o número no mesmo formato do uPixel (prefixo 55 quando ausente).
function formatNumber(phone: string): string {
  const clean = phone.replace(/\D/g, "");
  return clean.startsWith("55") ? clean : `55${clean}`;
}

export async function sendWhatsAppText(
  config: EvolutionConfig,
  phone: string,
  text: string,
): Promise<void> {
  const url = `${config.api_url.replace(/\/+$/, "")}/message/sendText/${config.instance_name}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        apikey: config.api_key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ number: formatNumber(phone), text }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Evolution HTTP ${res.status}: ${body.slice(0, 500)}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}
