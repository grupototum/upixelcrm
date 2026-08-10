// facebook-messenger-webhook v2
// Handles Facebook Pages / Messenger webhook events (DMs, postbacks, etc.)
// verify_jwt: false — Meta sends webhooks without Supabase JWT
//
// v2 fixes vs v1 (deployed manually):
//   - validate X-Hub-Signature-256 HMAC on every POST (rejects forged events)
//   - removed "loose verify" fallback that broke multi-tenant isolation
//   - tenant_id now read from integrations.tenant_id (top-level), not config
//   - conversations.client_id now stores the tenant client_id (Upixel customer),
//     not the Facebook senderId — Facebook user id moved to metadata.sender_id
//     and a stable per-page-per-sender contact identifier
//   - dedup inbound messages by mid (Meta retries are common)
//   - separate handling of postback / read receipts without dropping the
//     surrounding loop on errors

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FB_APP_SECRET = Deno.env.get("FACEBOOK_APP_SECRET") ?? Deno.env.get("META_APP_SECRET") ?? "";

// ── HMAC verification of X-Hub-Signature-256 ──────────────────────────────────
async function verifySignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  if (!FB_APP_SECRET) {
    // If no secret is configured, deny — never silently accept.
    console.error("[facebook-messenger-webhook] FACEBOOK_APP_SECRET not configured");
    return false;
  }
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const expected = signatureHeader.slice("sha256=".length);
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(FB_APP_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (computed.length !== expected.length) return false;
  // Timing-safe compare
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

serve(async (req: Request) => {
  const url = new URL(req.url);

  // ── GET: Webhook Verification ──────────────────────────────────────────────
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode !== "subscribe" || !token || !challenge) {
      return new Response("Bad request", { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: integrations } = await supabase
      .from("integrations")
      .select("id, config")
      .eq("provider", "facebook_page")
      .eq("status", "connected");

    const matched = integrations?.find(
      (i: { config: { webhook_verify_token?: string } | null }) =>
        i.config?.webhook_verify_token === token,
    );

    if (matched) {
      console.log(`[facebook-messenger-webhook] Verified for integration ${matched.id}`);
      return new Response(challenge, { status: 200 });
    }

    // No loose fallback — every Page must register with its own verify token.
    return new Response("Forbidden", { status: 403 });
  }

  // ── POST: Receive Webhook Events ───────────────────────────────────────────
  if (req.method === "POST") {
    const rawBody = await req.text();

    // Validate Meta signature BEFORE parsing/processing
    const sigOk = await verifySignature(rawBody, req.headers.get("x-hub-signature-256"));
    if (!sigOk) {
      console.warn("[facebook-messenger-webhook] Invalid X-Hub-Signature-256");
      return new Response("Forbidden", { status: 403 });
    }

    let body: { object?: string; entry?: Array<Record<string, unknown>> };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    if (body.object !== "page") {
      return new Response("Not a page event", { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    for (const entry of body.entry ?? []) {
      const pageId = String(entry.id);

      // Find matching integration by page_id (multi-tenant: each tenant has its own)
      const { data: integrations } = await supabase
        .from("integrations")
        .select("id, config, tenant_id, client_id")
        .eq("provider", "facebook_page")
        .eq("status", "connected");

      const integration = integrations?.find(
        (i: { config: { page_id?: string } | null }) => i.config?.page_id === pageId,
      );

      if (!integration) {
        console.log(`[facebook-messenger-webhook] No integration for page_id=${pageId}`);
        continue;
      }

      console.log(
        `[facebook-messenger-webhook] Matched integration ${integration.id} for page ${pageId}`,
      );

      const tenantId = integration.tenant_id ?? null;
      const tenantClientId = integration.client_id;

      const messaging = (entry.messaging as Array<Record<string, unknown>>) ?? [];

      for (const messagingEvent of messaging) {
        try {
          const sender = messagingEvent.sender as { id?: string } | undefined;
          const senderId = sender?.id;
          if (!senderId) continue;

          const message = messagingEvent.message as
            | { mid?: string; text?: string; is_echo?: boolean }
            | undefined;
          const postback = messagingEvent.postback as { title?: string } | undefined;
          const read = messagingEvent.read as { watermark?: number } | undefined;

          if (message && !message.is_echo) {
            const text = message.text ?? "";
            const mid = message.mid;
            const timestamp = Number(messagingEvent.timestamp ?? Date.now());

            console.log(
              `[facebook-messenger-webhook] Message from ${senderId}: ${text.substring(0, 100)}`,
            );

            // Dedup by mid — Meta retries the same event on transient failures
            if (mid) {
              const { data: existingMsg } = await supabase
                .from("messages")
                .select("id")
                .eq("metadata->>mid", mid)
                .maybeSingle();
              if (existingMsg) {
                console.log(`[facebook-messenger-webhook] Duplicate mid=${mid}, skipping`);
                continue;
              }
            }

            // Conversation key: (channel, integration_id, sender_id-on-page)
            // We DO NOT use senderId as client_id — client_id refers to the
            // Upixel tenant customer that owns this Page.
            const { data: existingConv } = await supabase
              .from("conversations")
              .select("id")
              .eq("channel", "facebook_messenger")
              .eq("integration_id", integration.id)
              .eq("metadata->>sender_id", senderId)
              .maybeSingle();

            let conversationId = existingConv?.id as string | undefined;

            if (!conversationId) {
              const { data: newConv, error: convErr } = await supabase
                .from("conversations")
                .insert({
                  channel: "facebook_messenger",
                  integration_id: integration.id,
                  client_id: tenantClientId,
                  tenant_id: tenantId,
                  status: "open",
                  last_message: text,
                  last_message_at: new Date(timestamp * 1000).toISOString(),
                  last_inbound_at: new Date(timestamp * 1000).toISOString(),
                  metadata: { sender_id: senderId, page_id: pageId },
                })
                .select("id")
                .single();
              if (convErr) {
                console.error(`[facebook-messenger-webhook] conversation insert error:`, convErr);
                continue;
              }
              conversationId = newConv?.id;
            } else {
              await supabase
                .from("conversations")
                .update({
                  last_message: text,
                  last_message_at: new Date(timestamp * 1000).toISOString(),
                  last_inbound_at: new Date(timestamp * 1000).toISOString(),
                  status: "open",
                })
                .eq("id", conversationId);
            }

            if (conversationId) {
              await supabase.from("messages").insert({
                conversation_id: conversationId,
                direction: "inbound",
                sender_name: senderId,
                content: text,
                type: "text",
                metadata: {
                  source: "facebook_messenger",
                  mid,
                  sender_id: senderId,
                  page_id: pageId,
                  timestamp,
                },
              });
            }
          } else if (postback) {
            console.log(
              `[facebook-messenger-webhook] Postback from ${senderId}: ${postback.title}`,
            );
          } else if (read) {
            console.log(`[facebook-messenger-webhook] Read receipt from ${senderId}`);
          }
        } catch (err) {
          // Keep processing remaining events — never let a single bad event
          // drop the whole batch (Meta will retry, causing duplicates).
          console.error("[facebook-messenger-webhook] event handler error:", err);
        }
      }
    }

    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response("Method not allowed", { status: 405 });
});
