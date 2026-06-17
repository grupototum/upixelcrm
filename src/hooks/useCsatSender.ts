import { useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdge } from "@/lib/edge-invoke";
import { logger } from "@/lib/logger";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { resolveClientId } from "@/lib/tenant-utils";

const CSAT_TEXT =
  "Olá! Obrigado pelo seu contato. 😊\n\n" +
  "Como você avalia nosso atendimento? Responda com um número de *1 a 5*:\n\n" +
  "1 ⭐ – Muito ruim\n" +
  "2 ⭐ – Ruim\n" +
  "3 ⭐ – Regular\n" +
  "4 ⭐ – Bom\n" +
  "5 ⭐ – Excelente";

const WA_CHANNELS = new Set(["whatsapp", "whatsapp_cloud", "whatsapp_official"]);
const INTERVAL_MS = 2 * 60 * 1000;

export function useCsatSender() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const clientId = resolveClientId(tenant?.id, user?.client_id);

  const sendPending = useCallback(async () => {
    if (!clientId) return;

    const now = new Date().toISOString();
    const { data: pending, error } = await supabase
      .from("conversations")
      .select("id, channel, metadata, lead_id")
      .eq("client_id", clientId)
      .lte("csat_requested_at", now)
      .is("csat_sent_at", null)
      .not("csat_requested_at", "is", null);

    if (error || !pending || pending.length === 0) return;

    await Promise.all(
      pending.map(async (conv) => {
        const meta = (conv.metadata || {}) as Record<string, any>;
        const phone = meta.phone as string | undefined;
        const integrationId = meta.integration_id as string | undefined;
        const sentAt = new Date().toISOString();

        if (!phone || !WA_CHANNELS.has(conv.channel)) {
          // Non-WhatsApp or missing phone: mark done to prevent infinite retry
          await supabase
            .from("conversations")
            .update({ csat_sent_at: sentAt })
            .eq("id", conv.id);
          return;
        }

        const isCloud =
          conv.channel === "whatsapp_cloud" || conv.channel === "whatsapp_official";
        const functionName = isCloud ? "whatsapp-cloud-proxy" : "whatsapp-proxy";
        const qs = isCloud
          ? `?action=send-message${integrationId ? `&integration_id=${integrationId}` : ""}`
          : "?action=send-message";

        try {
          const { error: sendErr } = await invokeEdge(`${functionName}${qs}`, {
            body: { phone, message: CSAT_TEXT },
          });

          if (sendErr) {
            logger.warn("useCsatSender: send failed", { convId: conv.id, error: sendErr });
            return;
          }

          await supabase
            .from("conversations")
            .update({ csat_sent_at: sentAt })
            .eq("id", conv.id);

          await supabase.from("messages").insert({
            conversation_id: conv.id,
            content: CSAT_TEXT,
            type: "text",
            direction: "outbound",
            sender_name: "Pesquisa CSAT",
            metadata: { is_csat: true },
          });
        } catch (err) {
          logger.warn("useCsatSender: unexpected error", { convId: conv.id, err });
        }
      })
    );
  }, [clientId]);

  useEffect(() => {
    sendPending();
    const timer = setInterval(sendPending, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [sendPending]);
}
