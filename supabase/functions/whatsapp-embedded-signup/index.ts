// WhatsApp Embedded Signup — finalizes the connection after the user completes
// Meta's hosted Embedded Signup flow on the frontend.
//
// The frontend uses FB.login() with a config_id of type "Embedded Signup" and
// listens for postMessage events of type "WA_EMBEDDED_SIGNUP". On FINISH it
// receives { code, waba_id, phone_number_id } and posts them here.
//
// This function:
//   1. Exchanges the code for a long-lived business token
//   2. Registers the phone number on WhatsApp Cloud (POST /{phone-id}/register)
//   3. Subscribes the app to the WABA so webhooks fire
//   4. Persists the integration in the integrations table
//
// Required Supabase secrets:
//   META_APP_ID
//   META_APP_SECRET
//   APP_ROOT_DOMAIN  (used to mirror redirect_uri sent by FB.login)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

function generateVerifyToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

function generatePin(): string {
  // 6-digit numeric PIN required by /register. We persist it so we can rotate later.
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function exchangeCodeForToken(code: string, appId: string, appSecret: string) {
  // Embedded Signup uses code-based auth with no redirect_uri (response_type=code,
  // override_default_response_type=true). Pass an empty redirect_uri to satisfy
  // Graph's signature.
  const url =
    `${GRAPH_BASE}/oauth/access_token` +
    `?client_id=${appId}` +
    `&client_secret=${appSecret}` +
    `&code=${encodeURIComponent(code)}`;
  const res = await fetch(url);
  return res.json();
}

async function fetchPhoneNumberDetails(phoneNumberId: string, token: string) {
  const res = await fetch(
    `${GRAPH_BASE}/${phoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status&access_token=${token}`
  );
  return res.json();
}

async function fetchWabaDetails(wabaId: string, token: string) {
  const res = await fetch(
    `${GRAPH_BASE}/${wabaId}?fields=id,name,currency,timezone_id&access_token=${token}`
  );
  return res.json();
}

async function registerPhoneNumber(phoneNumberId: string, token: string, pin: string) {
  const res = await fetch(`${GRAPH_BASE}/${phoneNumberId}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messaging_product: "whatsapp", pin }),
  });
  return res.json();
}

async function subscribeAppToWaba(wabaId: string, token: string) {
  const res = await fetch(`${GRAPH_BASE}/${wabaId}/subscribed_apps`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const appId = Deno.env.get("META_APP_ID");
  const appSecret = Deno.env.get("META_APP_SECRET");

  if (!appId || !appSecret) {
    return json({ error: "META_APP_ID e META_APP_SECRET não configurados" }, 500);
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "config";

  // ─── CONFIG ─── Public. Returns the JS SDK config (app_id + config_id) so the
  // frontend can initialize FB.login() without exposing secrets.
  if (action === "config") {
    const configId = Deno.env.get("META_WA_EMBEDDED_SIGNUP_CONFIG_ID") || "";
    return json({
      app_id: appId,
      config_id: configId,
      graph_version: GRAPH_VERSION,
    });
  }

  // ─── FINISH ─── Authenticated. Frontend hands over code + waba_id +
  // phone_number_id captured from the WA_EMBEDDED_SIGNUP event.
  if (action === "finish") {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { data: profile } = await userClient
      .from("profiles")
      .select("client_id")
      .eq("id", user.id)
      .single();
    if (!profile) return json({ error: "Profile not found" }, 404);

    const body = await req.json();
    const { code, waba_id, phone_number_id, instance_name } = body as {
      code?: string;
      waba_id?: string;
      phone_number_id?: string;
      instance_name?: string;
    };

    if (!code || !waba_id || !phone_number_id) {
      return json({ error: "code, waba_id e phone_number_id são obrigatórios" }, 400);
    }

    try {
      const tokenJson = await exchangeCodeForToken(code, appId, appSecret);
      if (!tokenJson.access_token) {
        return json(
          { error: "Falha ao trocar code por token", details: tokenJson },
          400
        );
      }
      const accessToken = tokenJson.access_token as string;

      // Best-effort enrichment — don't fail the whole flow if these fail
      const [phoneDetails, wabaDetails] = await Promise.all([
        fetchPhoneNumberDetails(phone_number_id, accessToken).catch(() => ({})),
        fetchWabaDetails(waba_id, accessToken).catch(() => ({})),
      ]);

      const pin = generatePin();
      const registerResult = await registerPhoneNumber(phone_number_id, accessToken, pin)
        .catch((e) => ({ error: { message: String(e) } }));

      const subscribeResult = await subscribeAppToWaba(waba_id, accessToken)
        .catch((e) => ({ error: { message: String(e) } }));

      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const displayPhone = (phoneDetails as any)?.display_phone_number || "";
      const verifiedName = (phoneDetails as any)?.verified_name || "";
      const wabaName = (wabaDetails as any)?.name || "";

      const config = {
        api_url: "",
        instance_name: instance_name || verifiedName || displayPhone || "Cloud API",
        api_key: "",
        phone_number_id,
        business_id: waba_id,
        waba_id,
        access_token: accessToken,
        webhook_verify_token: generateVerifyToken(),
        connected_number: displayPhone,
        verified_name: verifiedName,
        waba_name: wabaName,
        registration_pin: pin,
        signup_method: "embedded_signup",
        register_result: registerResult,
        subscribe_result: subscribeResult,
      };

      // Upsert by phone_number_id within client_id
      const { data: existing } = await adminClient
        .from("integrations")
        .select("id")
        .eq("client_id", profile.client_id)
        .eq("provider", "whatsapp_official")
        .eq("config->>phone_number_id", phone_number_id)
        .maybeSingle();

      if (existing) {
        await adminClient
          .from("integrations")
          .update({ status: "connected", config })
          .eq("id", existing.id);
      } else {
        await adminClient.from("integrations").insert({
          client_id: profile.client_id,
          provider: "whatsapp_official",
          status: "connected",
          config,
        });
      }

      return json({
        success: true,
        provider: "whatsapp_official",
        phone_number_id,
        waba_id,
        display_phone_number: displayPhone,
        verified_name: verifiedName,
        registered: !(registerResult as any)?.error,
        subscribed: !(subscribeResult as any)?.error,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("whatsapp-embedded-signup finish error:", msg);
      return json({ error: msg }, 500);
    }
  }

  return json({ error: `Ação desconhecida: ${action}` }, 400);
});
