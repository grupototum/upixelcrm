// WhatsApp Cloud API — receptor de webhooks da Meta (formato Graph API).
// Roteamento determinístico por integration_id (query string) — evita
// colisão cross-tenant quando dois tenants têm phone_number_ids parecidos.
//
// Suporta:
//   - GET /...?hub.mode=subscribe&hub.verify_token=X&hub.challenge=Y  → handshake da Meta
//   - POST {object:"whatsapp_business_account", entry:[...]}          → mensagens / statuses
//
// Formato Meta:
//   entry[].changes[].field = "messages"
//   entry[].changes[].value.messages[]    → mensagens recebidas
//   entry[].changes[].value.statuses[]    → updates de delivery/read

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";
import { isDuplicateMessage } from "../_shared/messageDedup.ts";
import { verifyMetaSignature } from "../_shared/verifyMetaSignature.ts";
import { downloadAndStoreMetaMedia, resolveGraphMediaUrl } from "../_shared/downloadMetaMedia.ts";

const WA_APP_SECRET = Deno.env.get("META_APP_SECRET") ?? Deno.env.get("FACEBOOK_APP_SECRET") ?? "";

const GRAPH_API_VERSION = "v22.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

type CloudConfig = {
  phone_number_id: string;
  business_account_id: string;
  access_token: string;
  display_phone_number?: string;
  display_name?: string;
  webhook_verify_token?: string;
};

interface IntegrationRow {
  id: string;
  client_id: string;
  config: CloudConfig;
}

// Baixa mídia da Meta CDN e armazena no Supabase Storage.
async function downloadAndStoreMedia(
  adminClient: any, accessToken: string, mediaId: string, mimeType: string,
  clientId: string,
): Promise<string | null> {
  const resolved = await resolveGraphMediaUrl(mediaId, accessToken, GRAPH_BASE);
  if (!resolved) return null;
  return downloadAndStoreMetaMedia(adminClient, resolved.url, mimeType || resolved.mimeType || "", clientId, "wac", accessToken);
}

async function findOrCreateLead(
  adminClient: any, clientId: string, phone: string, name: string,
): Promise<string | null> {
  const phoneSuffix = phone.length >= 8 ? phone.slice(-8) : phone;
  const { data: existing } = await adminClient
    .from("leads").select("id").eq("client_id", clientId)
    .or(`phone.ilike.%${phoneSuffix}%`).limit(1).maybeSingle();
  if (existing) return existing.id;

  const { data: firstCol } = await adminClient
    .from("pipeline_columns").select("id")
    .eq("client_id", clientId).order("order", { ascending: true }).limit(1).maybeSingle();
  if (!firstCol) return null;

  const { data: newLead } = await adminClient.from("leads").insert({
    client_id: clientId, name, phone,
    column_id: firstCol.id,
    tags: ["whatsapp_cloud-auto"],
    origin: "whatsapp_cloud",
  }).select("id").single();

  if (!newLead) return null;

  await adminClient.from("timeline_events").insert({
    client_id: clientId, lead_id: newLead.id, type: "stage_change",
    content: `Lead "${name}" criado automaticamente via WhatsApp Cloud`, user_name: "Sistema",
  });

  return newLead.id;
}

async function upsertConversationAndMessage(
  adminClient: any, clientId: string, phone: string, senderName: string,
  content: string, msgType: string, meta: Record<string, unknown>, integrationId: string,
  direction: "inbound" | "outbound" = "inbound",
) {
  const channel = "whatsapp_cloud";
  const { data: existingConv } = await adminClient
    .from("conversations")
    .select("id, unread_count")
    .eq("client_id", clientId)
    .eq("channel", channel)
    .eq("metadata->>phone", phone)
    .maybeSingle();

  let displayText = content;
  if (msgType === "audio") displayText = "🎵 Áudio";
  else if (msgType === "image") displayText = "📷 Imagem";
  else if (msgType === "video") displayText = "🎥 Vídeo";
  else if (msgType === "file") displayText = "📎 Arquivo";

  let convId: string;
  if (existingConv) {
    convId = existingConv.id;
    // Outbound echo do app do cliente NÃO incrementa unread_count
    // (não é uma mensagem nova esperando resposta).
    const update: Record<string, unknown> = {
      last_message: displayText,
      last_message_at: new Date().toISOString(),
      status: "open",
    };
    if (direction === "inbound") {
      update.unread_count = (existingConv.unread_count ?? 0) + 1;
    }
    await adminClient.from("conversations").update(update).eq("id", convId);
  } else {
    const leadId = await findOrCreateLead(adminClient, clientId, phone, senderName);
    const { data: newConv } = await adminClient.from("conversations").insert({
      client_id: clientId, lead_id: leadId, channel, status: "open",
      last_message: displayText, last_message_at: new Date().toISOString(),
      unread_count: direction === "inbound" ? 1 : 0,
      metadata: { phone, integration_id: integrationId, lead_name: senderName },
    }).select("id").single();
    if (!newConv) return null;
    convId = newConv.id;
  }

  await adminClient.from("messages").insert({
    client_id: clientId, conversation_id: convId, content, type: msgType,
    direction, sender_name: senderName,
    metadata: { channel, ...meta },
  });

  return convId;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const integrationIdFromUrl = url.searchParams.get("integration_id");

  // ── GET handshake da Meta ──
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token) {
      const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

      // Se a query trouxe integration_id, valida só naquela integration.
      if (integrationIdFromUrl) {
        const { data } = await adminClient
          .from("integrations")
          .select("config")
          .eq("id", integrationIdFromUrl)
          .eq("provider", "whatsapp_cloud")
          .maybeSingle();
        const stored = (data?.config as CloudConfig | undefined)?.webhook_verify_token;
        if (stored && stored === token) {
          return new Response(challenge ?? "", { status: 200, headers: corsHeaders });
        }
        return new Response("Forbidden", { status: 403, headers: corsHeaders });
      }

      // Fallback: aceita se algum tenant tiver esse verify_token cadastrado.
      const { data: rows } = await adminClient
        .from("integrations")
        .select("config")
        .eq("provider", "whatsapp_cloud")
        .limit(200);
      const valid = (rows ?? []).some((r: any) => (r.config as CloudConfig)?.webhook_verify_token === token);
      if (valid) return new Response(challenge ?? "", { status: 200, headers: corsHeaders });
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  // ── POST eventos ──
  try {
    const rawBody = await req.text();

    // Valida a assinatura da Meta ANTES de processar; o anti-spoofing por
    // phone_number_id continua como defesa em profundidade.
    const sigOk = await verifyMetaSignature(rawBody, req.headers.get("x-hub-signature-256"), WA_APP_SECRET, "whatsapp-cloud-webhook");
    if (!sigOk) {
      console.warn("[whatsapp-cloud-webhook] Invalid X-Hub-Signature-256");
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
    }
    if (body.object !== "whatsapp_business_account") {
      return new Response(JSON.stringify({ ok: true, skipped: "not_whatsapp" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    for (const entry of (body.entry ?? [])) {
      const wabaId = entry.id; // Business Account ID

      for (const change of (entry.changes ?? [])) {
        if (change.field !== "messages") continue;
        const value = change.value ?? {};
        const phoneNumberId = value.metadata?.phone_number_id;
        if (!phoneNumberId) continue;

        // Roteamento: prefere integration_id da query string (mais seguro).
        let integration: IntegrationRow | null = null;
        if (integrationIdFromUrl) {
          const { data } = await adminClient
            .from("integrations")
            .select("id, client_id, config")
            .eq("id", integrationIdFromUrl)
            .eq("provider", "whatsapp_cloud")
            .maybeSingle();
          if (data) {
            const cfg = data.config as CloudConfig;
            // Anti-spoofing: phone_number_id do payload tem que casar com o config.
            if (cfg?.phone_number_id !== phoneNumberId) {
              console.warn(`Mismatch: integration ${integrationIdFromUrl} expects phone_number_id ${cfg?.phone_number_id} but got ${phoneNumberId}`);
              continue;
            }
            integration = data as IntegrationRow;
          }
        }

        // Fallback: lookup por (waba_id, phone_number_id) para webhooks sem integration_id.
        if (!integration) {
          const { data: candidates } = await adminClient
            .from("integrations")
            .select("id, client_id, config")
            .eq("provider", "whatsapp_cloud")
            .eq("config->>business_account_id", wabaId)
            .limit(50);
          integration = (candidates as IntegrationRow[] | null ?? []).find(
            (i) => i.config?.phone_number_id === phoneNumberId,
          ) ?? null;
        }

        if (!integration) {
          console.log(`No integration found for phone_number_id ${phoneNumberId}`);
          continue;
        }

        const clientId = integration.client_id;
        const integrationId = integration.id;
        const accessToken = integration.config.access_token;

        // Processar mensagens recebidas
        for (const msg of (value.messages ?? [])) {
          // Idempotência: mesma proteção que os echoes já tinham. Sem ela, a
          // reentrega da Meta duplicava a mensagem inbound.
          if (await isDuplicateMessage(adminClient, "meta_message_id", msg.id)) {
            console.log("Duplicate cloud message ignored:", msg.id);
            continue;
          }

          const from = msg.from; // já vem normalizado pela Meta
          const senderName = value.contacts?.[0]?.profile?.name ?? from;
          let msgType = "text";
          let content = "";
          const meta: Record<string, unknown> = {
            meta_message_id: msg.id,
            integration_id: integrationId,
          };

          if (msg.type === "text") {
            content = msg.text?.body ?? "";
          } else if (msg.type === "image" || msg.type === "audio" || msg.type === "video" || msg.type === "document") {
            msgType = msg.type === "document" ? "file" : msg.type;
            const mediaPayload = msg[msg.type];
            const mediaId = mediaPayload?.id;
            const mime = mediaPayload?.mime_type ?? "";
            if (mediaId) {
              const publicUrl = await downloadAndStoreMedia(adminClient, accessToken, mediaId, mime, clientId);
              content = publicUrl ?? "";
              meta.media_url = publicUrl;
              meta.mime_type = mime;
              meta.filename = mediaPayload?.filename;
            }
            if (mediaPayload?.caption) {
              meta.caption = mediaPayload.caption;
            }
          } else if (msg.type === "location") {
            msgType = "text";
            content = `📍 Localização: ${msg.location?.latitude}, ${msg.location?.longitude}`;
            meta.location = msg.location;
          } else if (msg.type === "contacts") {
            msgType = "text";
            const c = msg.contacts?.[0];
            content = `👤 Contato: ${c?.name?.formatted_name ?? "(sem nome)"}`;
            meta.contacts = msg.contacts;
          } else if (msg.type === "interactive") {
            msgType = "text";
            const ix = msg.interactive;
            content = ix?.button_reply?.title ?? ix?.list_reply?.title ?? "[Resposta interativa]";
            meta.interactive = ix;
          } else {
            // Tipo desconhecido — registra placeholder
            msgType = "text";
            content = `[Mensagem do tipo ${msg.type} — não exibida]`;
          }

          await upsertConversationAndMessage(
            adminClient, clientId, from, senderName, content, msgType, meta, integrationId,
          );
        }

        // ── Coexistence: SMB Message Echoes ──
        // Quando o usuário envia uma mensagem pelo APP WhatsApp Business no celular,
        // a Meta replica o evento no webhook como smb_message_echoes (mesmo formato
        // do messages[] mas representa uma mensagem OUTBOUND vinda do app, não do API).
        // Marcamos como outbound + source=smb_app pra UI distinguir no inbox.
        for (const echo of (value.smb_message_echoes ?? [])) {
          const to = echo.to ?? echo.recipient_id ?? echo.from; // depende da versão
          if (!to) continue;
          const senderName = (integration.config as CloudConfig).display_name ?? "WhatsApp Business";
          let msgType = "text";
          let content = "";
          const meta: Record<string, unknown> = {
            meta_message_id: echo.id,
            integration_id: integrationId,
            source: "smb_app",
            coexistence: true,
            timestamp: echo.timestamp,
          };

          if (echo.type === "text") {
            content = echo.text?.body ?? "";
          } else if (echo.type === "image" || echo.type === "audio" || echo.type === "video" || echo.type === "document") {
            msgType = echo.type === "document" ? "file" : echo.type;
            const mediaPayload = echo[echo.type];
            const mediaId = mediaPayload?.id;
            const mime = mediaPayload?.mime_type ?? "";
            if (mediaId) {
              const publicUrl = await downloadAndStoreMedia(adminClient, accessToken, mediaId, mime, clientId);
              content = publicUrl ?? "";
              meta.media_url = publicUrl;
              meta.mime_type = mime;
            }
            if (mediaPayload?.caption) meta.caption = mediaPayload.caption;
          } else {
            content = `[Mensagem do app — tipo ${echo.type}]`;
          }

          // Dedup por meta_message_id: se já gravamos esse echo (Meta às vezes
          // reenvia), pula. Conversation match por phone destinatário.
          const { data: existingMsg } = await adminClient
            .from("messages")
            .select("id")
            .eq("metadata->>meta_message_id", echo.id)
            .maybeSingle();
          if (existingMsg) continue;

          await upsertConversationAndMessage(
            adminClient, clientId, to, senderName, content, msgType, meta, integrationId,
            "outbound",
          );
        }

        // Statuses (delivered/read/failed) — opcional, gravamos só em metadata da mensagem
        for (const status of (value.statuses ?? [])) {
          const messageId = status.id;
          if (!messageId) continue;
          // Best effort — atualiza metadata da mensagem outbound
          try {
            const { data: msgRow } = await adminClient
              .from("messages")
              .select("id, metadata")
              .eq("metadata->>meta_message_id", messageId)
              .maybeSingle();
            if (msgRow) {
              const newMeta = { ...(msgRow.metadata ?? {}), delivery_status: status.status, delivery_status_at: status.timestamp };
              await adminClient.from("messages").update({ metadata: newMeta }).eq("id", msgRow.id);
            }
          } catch { /* ignore */ }
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("whatsapp-cloud-webhook error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
