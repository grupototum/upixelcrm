// facebook-messenger-webhook v1
// Handles Facebook Pages / Messenger webhook events (DMs, postbacks, etc.)
// verify_jwt: false — Meta sends webhooks without Supabase JWT

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    // Accept any valid integration's verify token
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: integrations } = await supabase
      .from("integrations")
      .select("id, config")
      .eq("provider", "facebook_page")
      .eq("status", "connected");

    const matched = integrations?.find(
      (i: any) => (i.config as any)?.webhook_verify_token === token
    );

    if (matched) {
      console.log(`[facebook-messenger-webhook] Verified for integration ${matched.id}`);
      return new Response(challenge, { status: 200 });
    }

    // Fallback: accept if any facebook_page integration exists (loose check)
    if (integrations && integrations.length > 0) {
      console.log("[facebook-messenger-webhook] Loose verify — accepted");
      return new Response(challenge, { status: 200 });
    }

    return new Response("Forbidden", { status: 403 });
  }

  // ── POST: Receive Webhook Events ───────────────────────────────────────────
  if (req.method === "POST") {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    // Must be 'page' object
    if (body.object !== "page") {
      return new Response("Not a page event", { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    for (const entry of body.entry ?? []) {
      const pageId = String(entry.id);

      // Find matching integration by page_id
      const { data: integrations } = await supabase
        .from("integrations")
        .select("id, config, tenant_id, client_id")
        .eq("provider", "facebook_page")
        .eq("status", "connected");

      const integration = integrations?.find(
        (i: any) => (i.config as any)?.page_id === pageId
      );

      if (!integration) {
        console.log(`[facebook-messenger-webhook] No integration for page_id=${pageId}`);
        continue;
      }

      console.log(`[facebook-messenger-webhook] Matched integration ${integration.id} for page ${pageId}`);

      // Process messaging events
      for (const messagingEvent of entry.messaging ?? []) {
        const senderId = messagingEvent.sender?.id;

        if (messagingEvent.message && !messagingEvent.message.is_echo) {
          const text = messagingEvent.message.text ?? "";
          const mid = messagingEvent.message.mid;
          const timestamp = messagingEvent.timestamp;

          console.log(`[facebook-messenger-webhook] Message from ${senderId}: ${text.substring(0, 100)}`);

          const { data: existingConv } = await supabase
            .from("conversations")
            .select("id")
            .eq("channel", "facebook_messenger")
            .eq("integration_id", integration.id)
            .eq("client_id", senderId)
            .single();

          let conversationId = existingConv?.id;

          if (!conversationId) {
            const { data: newConv } = await supabase
              .from("conversations")
              .insert({
                channel: "facebook_messenger",
                integration_id: integration.id,
                client_id: senderId,
                status: "open",
                last_message: text,
                last_message_at: new Date(timestamp * 1000).toISOString(),
                last_inbound_at: new Date(timestamp * 1000).toISOString(),
                tenant_id: (integration.config as any)?.tenant_id ?? null,
              })
              .select("id")
              .single();
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
        } else if (messagingEvent.postback) {
          console.log(`[facebook-messenger-webhook] Postback from ${senderId}: ${messagingEvent.postback.title}`);
        } else if (messagingEvent.read) {
          console.log(`[facebook-messenger-webhook] Read receipt from ${senderId}`);
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
