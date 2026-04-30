// WhatsApp Embedded Signup — multi-tenant flow.
//
// Because Meta's JS SDK requires every domain to be allowlisted explicitly
// (no wildcards), we run the FB.login() popup ALWAYS on the root domain
// (e.g. https://upixel.app/oauth/whatsapp/connect). The tenant subdomain
// hands a HMAC-signed state to the popup that identifies the user/client,
// so the popup can finalize the integration without needing auth on the
// root domain.
//
// Actions:
//   POST ?action=initiate — authenticated. Tenant calls this to get a
//                           popup_url (root domain) carrying a signed state.
//   POST ?action=config   — public. Returns app_id + config_id for the SDK.
//   POST ?action=finish   — public. Popup posts the embedded-signup result
//                           with the signed state; we validate, exchange
//                           code, register phone, subscribe webhook, and
//                           persist the integration.
//
// Required Supabase secrets:
//   META_APP_ID
//   META_APP_SECRET
//   META_WA_EMBEDDED_SIGNUP_CONFIG_ID
//   APP_ROOT_DOMAIN  (e.g. "upixel.app")

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

// ─── HMAC helpers for signed state ───
async function hmacSign(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function base64urlEncode(s: string): string {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function base64urlDecode(s: string): string {
  const padded = s + "=".repeat((4 - (s.length % 4)) % 4);
  return atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
}

interface StatePayload {
  user_id: string;
  client_id: string;
  tenant: string;
  ts: number;
  nonce: string;
}

async function buildSignedState(payload: StatePayload, secret: string): Promise<string> {
  const body = base64urlEncode(JSON.stringify(payload));
  const sig = await hmacSign(body, secret);
  return `${body}.${sig}`;
}

async function verifySignedState(state: string, secret: string): Promise<StatePayload | null> {
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const expected = await hmacSign(body, secret);
  if (expected !== sig) return null;
  try {
    const payload = JSON.parse(base64urlDecode(body)) as StatePayload;
    if (Date.now() - payload.ts > 30 * 60 * 1000) return null; // 30-min TTL
    return payload;
  } catch {
    return null;
  }
}

// ─── Graph helpers ───
function generateVerifyToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function exchangeCodeForToken(code: string, appId: string, appSecret: string) {
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
  const rootDomain = Deno.env.get("APP_ROOT_DOMAIN") || "upixel.app";

  if (!appId || !appSecret) {
    return json({ error: "META_APP_ID e META_APP_SECRET não configurados" }, 500);
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "config";

  // ─── INITIATE ─── Authenticated. Tenant gets a popup_url with signed state.
  if (action === "initiate") {
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

    const body = await req.json().catch(() => ({}));
    const tenant = (body.tenant as string) || "";

    const state = await buildSignedState(
      {
        user_id: user.id,
        client_id: profile.client_id,
        tenant,
        ts: Date.now(),
        nonce: crypto.randomUUID(),
      },
      appSecret
    );

    return json({
      popup_url: `https://${rootDomain}/oauth/whatsapp/connect?state=${encodeURIComponent(state)}`,
      state,
    });
  }

  // ─── CONFIG ─── Public. Returns the JS SDK config (app_id + config_id).
  if (action === "config") {
    const configId = Deno.env.get("META_WA_EMBEDDED_SIGNUP_CONFIG_ID") || "";
    return json({
      app_id: appId,
      config_id: configId,
      graph_version: GRAPH_VERSION,
    });
  }

  // ─── FINISH ─── Public. Validated by signed state (no auth header needed
  // because the popup runs on the root domain without a user session).
  if (action === "finish") {
    const body = await req.json();
    const { state, code, waba_id, phone_number_id, instance_name } = body as {
      state?: string;
      code?: string;
      waba_id?: string;
      phone_number_id?: string;
      instance_name?: string;
    };

    if (!state) return json({ error: "state obrigatório" }, 400);
    if (!code || !waba_id || !phone_number_id) {
      return json({ error: "code, waba_id e phone_number_id são obrigatórios" }, 400);
    }

    const decoded = await verifySignedState(state, appSecret);
    if (!decoded) return json({ error: "state inválido ou expirado" }, 401);

    try {
      const tokenJson = await exchangeCodeForToken(code, appId, appSecret);
      if (!tokenJson.access_token) {
        return json(
          { error: "Falha ao trocar code por token", details: tokenJson },
          400
        );
      }
      const accessToken = tokenJson.access_token as string;

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

      const { data: existing } = await adminClient
        .from("integrations")
        .select("id")
        .eq("client_id", decoded.client_id)
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
          client_id: decoded.client_id,
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
