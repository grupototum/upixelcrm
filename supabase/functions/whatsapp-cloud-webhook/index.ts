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

const GRAPH_API_VERSION = "v22.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// HMAC-SHA256 do raw body com META_APP_SECRET. Constant-time compare.
// Meta envia header: X-Hub-Signature-256: sha256=<hex>
async function verifyMetaSignature(rawBody: string, header: string | null, appSecret: string): Promise<boolean> {
  if (!header) return false;
  const expectedPrefix = "sha256=";
  if (!header.startsWith(expectedPrefix)) return false;
  const providedHex = header.slice(expectedPrefix.length).trim().toLowerCase();
  if (providedHex.length !== 64) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(appSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const expectedHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0")).join("");

  if (expectedHex.length !== providedHex.length) return false;
  let diff = 0;
  for (let i = 0; i < expectedHex.length; i++) {
    diff |= expectedHex.charCodeAt(i) ^ providedHex.charCodeAt(i);
  }
  return diff === 0;
}

// Mapeia evento de status de template da Meta -> status local da tabela whatsapp_templates.
function mapTemplateEventToStatus(event: string | undefined): "APPROVED" | "REJECTED" | "PENDING" | null {
  switch ((event ?? "").toUpperCase()) {
    case "APPROVED": return "APPROVED";
    case "REJECTED":
    case "FLAGGED":
    case "PAUSED":
    case "DISABLED":
      return "REJECTED";
    case "PENDING":
    case "IN_APPEAL":
      return "PENDING";
    default: return null;
  }
}

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
): Promise<string | null> {
  try {
    // 1) Pede a URL temporária da mídia
    const metaRes = await fetch(`${GRAPH_BASE}/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!metaRes.ok) return null;
    const metaData = await metaRes.json();
    const downloadUrl = metaData.url;
    if (!downloadUrl) return null;

    // 2) Baixa o binário
    const fileRes = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!fileRes.ok) return null;
    const buffer = new Uint8Array(await fileRes.arrayBuffer());

    const cleanMime = (mimeType || metaData.mime_type || "application/octet-stream").split(";")[0].trim();
    const extMap: Record<string, string> = {
      "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
      "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/aac": "aac",
      "video/mp4": "mp4", "application/pdf": "pdf",
    };
    const ext = extMap[cleanMime] ?? "bin";
    const fileName = `wac_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await adminClient.storage.from("whatsapp_media").upload(fileName, buffer, {
      contentType: cleanMime, upsert: false,
    });
    if (error) return null;

    const { data } = adminClient.storage.from("whatsapp_media").getPublicUrl(fileName);
    return data.publicUrl;
  } catch {
    return null;
  }
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
    await adminClient.from("conversations").update({
      last_message: displayText,
      last_message_at: new Date().toISOString(),
      unread_count: (existingConv.unread_count ?? 0) + 1,
      status: "open",
    }).eq("id", convId);
  } else {
    const leadId = await findOrCreateLead(adminClient, clientId, phone, senderName);
    const { data: newConv } = await adminClient.from("conversations").insert({
      client_id: clientId, lead_id: leadId, channel, status: "open",
      last_message: displayText, last_message_at: new Date().toISOString(),
      unread_count: 1,
      metadata: { phone, integration_id: integrationId, lead_name: senderName },
    }).select("id").single();
    if (!newConv) return null;
    convId = newConv.id;
  }

  await adminClient.from("messages").insert({
    client_id: clientId, conversation_id: convId, content, type: msgType,
    direction: "inbound", sender_name: senderName,
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
    const appSecret = Deno.env.get("META_APP_SECRET");
    if (!appSecret) {
      console.error("META_APP_SECRET not set — refusing to process webhook");
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.text();
    const sigHeader = req.headers.get("x-hub-signature-256");
    const sigValid = await verifyMetaSignature(rawBody, sigHeader, appSecret);
    if (!sigValid) {
      console.warn("Invalid X-Hub-Signature-256", { hasHeader: !!sigHeader });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = JSON.parse(rawBody);
    if (body.object !== "whatsapp_business_account") {
      return new Response(JSON.stringify({ ok: true, skipped: "not_whatsapp" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    for (const entry of (body.entry ?? [])) {
      const wabaId = entry.id; // Business Account ID

      for (const change of (entry.changes ?? [])) {
        // ── Template status update (APPROVED / REJECTED / FLAGGED / PAUSED) ──
        if (change.field === "message_template_status_update") {
          const v = change.value ?? {};
          const tplName = v.message_template_name as string | undefined;
          const mapped = mapTemplateEventToStatus(v.event as string | undefined);
          if (tplName && mapped) {
            const { data: rows } = await adminClient
              .from("integrations").select("client_id")
              .eq("provider", "whatsapp_cloud")
              .eq("config->>business_account_id", wabaId)
              .limit(50);
            for (const row of (rows ?? [])) {
              await adminClient.from("whatsapp_templates")
                .update({ status: mapped, updated_at: new Date().toISOString() })
                .eq("client_id", row.client_id).eq("name", tplName);
            }
          } else {
            console.log("template_status_update unmapped", { tplName, event: v.event, reason: v.reason });
          }
          continue;
        }

        // ── Eventos de conta (não bloqueiam, mas registramos no log estruturado) ──
        if (change.field === "account_update" || change.field === "account_alerts" || change.field === "account_review_update") {
          console.log(`whatsapp_account_event field=${change.field} waba=${wabaId} value=`, change.value);
          continue;
        }

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
              const publicUrl = await downloadAndStoreMedia(adminClient, accessToken, mediaId, mime);
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
