// WhatsApp Official Cloud API — direct integration with Meta's Graph API.
// This endpoint replaces Evolution API as the proxy for sending official messages.
// The Lite/Baileys flow (whatsapp-proxy) is left untouched and continues to be used
// for non-official conversations.
//
// Supported actions (via ?action= query param):
//   - send-text     : send a text message
//   - send-media    : send an image/video/audio/document
//   - send-template : send an approved template message
//
// Graph API reference:
//   POST https://graph.facebook.com/v21.0/{phone_number_id}/messages
//   Headers: Authorization: Bearer {access_token}
//   Body:    { messaging_product: "whatsapp", to, type, ... }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

interface OfficialConfig {
  api_url?: string;
  instance_name?: string;
  api_key?: string;
  phone_number_id?: string;
  business_id?: string;
  access_token?: string;
}

// Format phone for Meta: digits only, with country code (default +55 if missing)
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  // If it doesn't already start with a country code, assume Brazil
  if (digits.length <= 11) return `55${digits}`;
  return digits;
}

async function callGraph(
  phoneNumberId: string,
  accessToken: string,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; status: number; body: any }> {
  const res = await fetch(`${GRAPH_BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let body: any;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  return { ok: res.ok, status: res.status, body };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("client_id")
      .eq("id", user.id)
      .single();
    if (!profile) return jsonResponse({ error: "Profile not found" }, 404);

    const clientId = profile.client_id;
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "send-text";
    const instanceNameParam = url.searchParams.get("instance_name") || "";

    // Lookup the official integration row (provider = "whatsapp_official")
    const baseQuery = adminClient
      .from("integrations")
      .select("*")
      .eq("client_id", clientId)
      .eq("provider", "whatsapp_official");

    const { data: integration } = instanceNameParam
      ? await baseQuery.filter("config->>instance_name", "eq", instanceNameParam).maybeSingle()
      : await baseQuery.order("created_at", { ascending: true }).limit(1).maybeSingle();

    if (!integration?.config) {
      return jsonResponse({ error: "WhatsApp Official não configurado" }, 400);
    }

    const config = integration.config as OfficialConfig;
    const { phone_number_id, access_token } = config;

    if (!phone_number_id || !access_token) {
      return jsonResponse(
        { error: "phone_number_id ou access_token ausentes na configuração" },
        400
      );
    }

    const body = await req.json().catch(() => ({}));

    // Helper: ensure conversation exists, return id
    async function ensureConversation(formattedPhone: string, lastMessage: string) {
      const channel = "whatsapp_official";
      const { data: existing } = await adminClient
        .from("conversations")
        .select("id")
        .eq("client_id", clientId)
        .eq("channel", channel)
        .eq("metadata->>phone", formattedPhone)
        .maybeSingle();

      if (existing) return existing.id;

      const { data: lead } = await adminClient
        .from("leads")
        .select("id")
        .eq("client_id", clientId)
        .or(`phone.ilike.%${formattedPhone.slice(-8)}%`)
        .limit(1)
        .maybeSingle();

      const convPayload: any = {
        client_id: clientId,
        lead_id: lead?.id || null,
        channel,
        status: "open",
        last_message: lastMessage,
        last_message_at: new Date().toISOString(),
        metadata: { phone: formattedPhone, instance_name: config.instance_name },
      };

      let inserted = await adminClient
        .from("conversations")
        .insert({ ...convPayload, integration_id: integration.id })
        .select("id")
        .single();
      if (inserted.error) {
        inserted = await adminClient
          .from("conversations")
          .insert(convPayload)
          .select("id")
          .single();
      }
      // Channel-constraint fallback (older DBs)
      if (inserted.error) {
        inserted = await adminClient
          .from("conversations")
          .insert({
            ...convPayload,
            channel: "whatsapp",
            metadata: { ...convPayload.metadata, original_channel: "whatsapp_official" },
          })
          .select("id")
          .single();
      }
      return inserted.data?.id ?? null;
    }

    async function recordOutboundMessage(
      convId: string,
      content: string,
      type: string,
      metadata: Record<string, unknown>,
      displayLast: string
    ) {
      const baseMsg = {
        client_id: clientId,
        conversation_id: convId,
        content,
        type,
        direction: "outbound",
        sender_name: "Você",
        metadata: { channel: "whatsapp_official", ...metadata },
      };
      const ins = await adminClient.from("messages").insert(baseMsg);
      if (ins.error?.code === "23514") {
        // Map disallowed types to allowed (older constraint)
        const fallback = (t: string) => {
          if (t === "video" || t === "document") return "file";
          if (t === "sticker") return "image";
          if (t === "location" || t === "contact" || t === "template") return "text";
          return t;
        };
        await adminClient.from("messages").insert({
          ...baseMsg,
          type: fallback(type),
          metadata: { ...baseMsg.metadata, original_type: type },
        });
      }
      await adminClient
        .from("conversations")
        .update({
          last_message: displayLast,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", convId);
    }

    // ── send-text ───────────────────────────────────────────────
    if (action === "send-text") {
      const { phone, message } = body as { phone?: string; message?: string };
      if (!phone || !message) {
        return jsonResponse({ error: "phone e message são obrigatórios" }, 400);
      }
      const to = formatPhone(phone);

      const { ok, status, body: graphBody } = await callGraph(phone_number_id, access_token, {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: false, body: message },
      });

      if (!ok) {
        console.error("Graph API send-text error:", graphBody);
        return jsonResponse(
          {
            error: "Falha ao enviar pelo WhatsApp Cloud API",
            details: graphBody,
          },
          status
        );
      }

      const convId = await ensureConversation(to, message);
      const wamid = graphBody?.messages?.[0]?.id;
      if (convId) {
        await recordOutboundMessage(
          convId,
          message,
          "text",
          { wamid, graph_response: graphBody },
          message
        );
      }

      return jsonResponse({ success: true, wamid, conversation_id: convId, graph: graphBody });
    }

    // ── send-media ──────────────────────────────────────────────
    if (action === "send-media") {
      const { phone, mediaUrl, mediaType, fileName, caption } = body as {
        phone?: string;
        mediaUrl?: string;
        mediaType?: string;
        fileName?: string;
        caption?: string;
      };
      if (!phone || !mediaUrl) {
        return jsonResponse({ error: "phone e mediaUrl são obrigatórios" }, 400);
      }
      const to = formatPhone(phone);
      const type = (mediaType || "image").toLowerCase();
      const allowed = ["image", "audio", "video", "document", "sticker"];
      if (!allowed.includes(type)) {
        return jsonResponse({ error: `mediaType inválido: ${type}` }, 400);
      }

      const mediaPayload: Record<string, unknown> = { link: mediaUrl };
      if (caption && (type === "image" || type === "video" || type === "document")) {
        mediaPayload.caption = caption;
      }
      if (type === "document" && fileName) {
        mediaPayload.filename = fileName;
      }

      const { ok, status, body: graphBody } = await callGraph(phone_number_id, access_token, {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type,
        [type]: mediaPayload,
      });

      if (!ok) {
        console.error("Graph API send-media error:", graphBody);
        return jsonResponse(
          {
            error: "Falha ao enviar mídia pelo WhatsApp Cloud API",
            details: graphBody,
          },
          status
        );
      }

      const display =
        type === "audio" ? "🎵 Áudio"
        : type === "video" ? "🎥 Vídeo"
        : type === "image" ? "📷 Imagem"
        : type === "sticker" ? "🩷 Sticker"
        : `📎 ${fileName || "Arquivo"}`;

      const convId = await ensureConversation(to, display);
      const wamid = graphBody?.messages?.[0]?.id;
      if (convId) {
        await recordOutboundMessage(
          convId,
          mediaUrl,
          type,
          { wamid, media_url: mediaUrl, filename: fileName, caption, graph_response: graphBody },
          display
        );
      }

      return jsonResponse({ success: true, wamid, conversation_id: convId, graph: graphBody });
    }

    // ── send-template ───────────────────────────────────────────
    // Used to (re)open a 24h window with an approved template.
    if (action === "send-template") {
      const { phone, templateName, languageCode, components } = body as {
        phone?: string;
        templateName?: string;
        languageCode?: string;
        components?: unknown[];
      };
      if (!phone || !templateName) {
        return jsonResponse({ error: "phone e templateName são obrigatórios" }, 400);
      }
      const to = formatPhone(phone);

      const templatePayload: Record<string, unknown> = {
        name: templateName,
        language: { code: languageCode || "pt_BR" },
      };
      if (Array.isArray(components) && components.length > 0) {
        templatePayload.components = components;
      }

      const { ok, status, body: graphBody } = await callGraph(phone_number_id, access_token, {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "template",
        template: templatePayload,
      });

      if (!ok) {
        console.error("Graph API send-template error:", graphBody);
        return jsonResponse(
          {
            error: "Falha ao enviar template pelo WhatsApp Cloud API",
            details: graphBody,
          },
          status
        );
      }

      const display = `📋 Template: ${templateName}`;
      const convId = await ensureConversation(to, display);
      const wamid = graphBody?.messages?.[0]?.id;
      if (convId) {
        await recordOutboundMessage(
          convId,
          display,
          "template",
          {
            wamid,
            template_name: templateName,
            language: languageCode || "pt_BR",
            components,
            graph_response: graphBody,
          },
          display
        );
      }

      return jsonResponse({ success: true, wamid, conversation_id: convId, graph: graphBody });
    }

    return jsonResponse({ error: `Ação desconhecida: ${action}` }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("whatsapp-official-send error:", message);
    return jsonResponse({ error: message }, 500);
  }
});
