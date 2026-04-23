import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

import { corsHeaders } from "../_shared/cors.ts";

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  target_user_id?: string;
  target_client_id?: string;
}

async function sendWebPush(subscription: any, payload: PushPayload): Promise<boolean> {
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@upixel.com";

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error("VAPID keys not configured");
    return false;
  }

  // Use web-push compatible approach via crypto
  const endpoint = subscription.endpoint;
  const p256dh = subscription.keys?.p256dh;
  const auth = subscription.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    console.error("Invalid subscription");
    return false;
  }

  try {
    // For Deno, we use the direct Web Push protocol
    // Import web-push compatible library
    const { default: webpush } = await import("https://esm.sh/web-push@3.6.7");
    
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/icon-192.png",
      badge: payload.badge || "/icon-192.png",
      tag: payload.tag,
      data: payload.data || {},
    });

    await webpush.sendNotification(
      { endpoint, keys: { p256dh, auth } },
      pushPayload
    );

    return true;
  } catch (err: any) {
    console.error("Push send error:", err?.statusCode, err?.body || err?.message);
    // If subscription is expired/invalid (410 Gone or 404), return false to clean up
    if (err?.statusCode === 410 || err?.statusCode === 404) {
      return false; // Caller should delete this subscription
    }
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json() as PushPayload;
    const { title, body: msgBody, target_user_id, target_client_id, ...rest } = body;

    if (!title || !msgBody) {
      return new Response(JSON.stringify({ error: "title and body are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Build query for subscriptions
    let query = adminClient.from("push_subscriptions").select("*");

    if (target_user_id) {
      query = query.eq("user_id", target_user_id);
    } else if (target_client_id) {
      query = query.eq("client_id", target_client_id);
    } else {
      return new Response(JSON.stringify({ error: "target_user_id or target_client_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: subscriptions, error } = await query;
    if (error) {
      console.error("Error fetching subscriptions:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch subscriptions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: "no_subscriptions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: PushPayload = { title, body: msgBody, ...rest };
    let sent = 0;
    const expired: string[] = [];

    for (const sub of subscriptions) {
      const success = await sendWebPush(
        { endpoint: sub.endpoint, keys: sub.keys },
        payload
      );
      if (success) {
        sent++;
      } else {
        expired.push(sub.id);
      }
    }

    // Clean up expired subscriptions
    if (expired.length > 0) {
      await adminClient.from("push_subscriptions").delete().in("id", expired);
      console.log(`Cleaned up ${expired.length} expired subscriptions`);
    }

    return new Response(JSON.stringify({ ok: true, sent, expired: expired.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("send-push error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
