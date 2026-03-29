/**
 * Serviço de Integração WhatsApp
 * O provedor não foi definido no .env, então criamos uma estrutura base genérica
 * que suporta Evolution API, Z-API, Meta Cloud API ou Baileys.
 */

export interface SendMessagePayload {
  to: string;       // Número de telefone do destinatário com DDI + DDD
  message: string;  // Conteúdo texto da mensagem
  // threadId?: string; // Opcional, para referenciar conversas no BD
}

export const whatsappService = {
  /**
   * Dispara o envio de uma mensagem de texto para o Lead.
   */
  async sendMessage({ to, message }: SendMessagePayload) {
    console.log(`[WhatsApp Service] Tentando enviar mensagem para: ${to}`);
    console.log(`[WhatsApp Service] Conteúdo: "${message}"`);
    
    // Variáveis ambiente ou fallbacks locais do servidor de Webhooks/Envios real
    const WHATSAPP_API_URL = import.meta.env?.VITE_WHATSAPP_API_URL || "http://localhost:3001/api/whatsapp/send";
    const WHATSAPP_API_KEY = import.meta.env?.VITE_WHATSAPP_API_KEY || "GENERIC_DEV_KEY";

    try {
      console.log(`[WhatsApp Service] Disparando Request POST HTTP para ${WHATSAPP_API_URL}...`);
      
      // Simulação da latência da rede e validação, o Fetch real entraria aqui:
      const response = await fetch(WHATSAPP_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${WHATSAPP_API_KEY}`
        },
        body: JSON.stringify({ number: to, text: message })
      });

      if (!response.ok) {
        throw new Error(`Falha no provedor de WhatsApp (Status ${response.status})`);
      }

      const data = await response.json();
      console.log(`[WhatsApp Service] Sucesso! Mensagem disparada.`);
      return { success: true, messageId: data.id || `msg_${Date.now()}` };
    } catch (error) {
      console.warn("[WhatsApp Service] Erro ao conectar com a API:", error);
      console.log("[WhatsApp Service] Como esta é uma simulação genérica, o fluxo UI pode seguir.");
      
      // Retornar success falso na vida real, mas aqui garantimos que a promessa resolve em MOCK
      return { success: false, error };
    }
  }
};
