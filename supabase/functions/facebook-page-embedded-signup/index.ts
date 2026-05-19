// Facebook Page Embedded Signup — multi-tenant flow
//
// Same pattern as whatsapp-embedded-signup / instagram-exchange-token:
// the FB.login() popup runs on the root domain (upixel.app/oauth/facebook-page/connect)
// because Meta's SDK doesn't allow wildcards in allowed domains. The tenant
// subdomain initiates the flow with a HMAC-signed state that identifies the
// user/client, so the popup can finalize without auth on the root domain.
//
// Actions:
//   POST ?action=initiate — authenticated. Tenant calls this to get a popup_url
//                           (root domain) carrying a signed state.
//   POST ?action=config   — public. Returns app_id + config_id for the SDK.
//   POST ?action=finish   — public. Popup posts back code + selected pages.
//                           We validate state, exchange code, fetch long-lived
//                           page tokens, subscribe each page to the Messenger
//                           webhook, and persist one integrations row per page.
//
// Required Supabase secrets:
//   META_APP_ID
//   META_APP_SECRET
//   META_FB_PAGE_EMBEDDED_SIGNUP_CONFIG_ID  (Facebook Login for Business config)
//   APP_ROOT_DOMAIN                         (e.g. "upixel.app")

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

const WEBHOOK_SUBSCRIBED_FIELDS = "messages,messaging_postbacks,messaging_read,message_deliveries";

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

// ─── HMAC helpers for signed state (same shape as whatsapp-embedded-signup) ───
async function hmacSign(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
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
  // Timing-safe compare
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;
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

async function exchangeCodeForToken(code: string, appId: string, appSecret: string) {
  const url =
    `${GRAPH_BASE}/oauth/access_token` +
    `?client_id=${appId}` +
    `&client_secret=${appSecret}` +
    `&code=${encodeURIComponent(code)}`;
  const res = await fetch(url);
  return res.json();
}

async function exchangeForLongLivedToken(
  shortToken: string,
  appId: string,
  appSecret: string,
): Promise<string> {
  const url =
    `${GRAPH_BASE}/oauth/access_token` +
    `?grant_type=fb_exchange_token` +
    `&client_id=${appId}` +
    `&client_secret=${appSecret}` +
    `&fb_exchange_token=${shortToken}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.access_token) {
    console.warn("[facebook-page-embedded-signup] Long-lived exchange failed, returning short:", data);
    return shortToken;
  }
  return data.access_token;
}

interface PageRecord {
  id: string;
  name: string;
  access_token: string;
  category?: string;
}

async function listUserPages(userToken: string): Promise<PageRecord[]> {
  const res = await fetch(
    `${GRAPH_BASE}/me/accounts?fields=id,name,access_token,category&access_token=${userToken}`,
  );
  const data = await res.json();
  if (!data.data) {
    console.warn("[facebook-page-embedded-signup] me/accounts returned no data:", data);
    return [];
  }
  return data.data as PageRecord[];
}

async function subscribePageToMessenger(pageId: string, pageToken: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${GRAPH_BASE}/${pageId}/subscribed_apps?subscribed_fields=${WEBHOOK_SUBSCRIBED_FIELDS}&access_token=${pageToken}`,
      { method: "POST" },
    );
    const data = await res.json();
    if (data.success) {
      console.log(`[facebook-page-embedded-signup] Page ${pageId} subscribed to Messenger webhook`);
      return true;
    }
    console.warn(`[facebook-page-embedded-signup] Subscribe warning for ${pageId}:`, data);
    return false;
  } catch (err) {
    console.error(`[facebook-page-embedded-signup] Subscribe error for ${pageId}:`, err);
    return false;
  }
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

  // ─── INITIATE ─── Authenticated. Tenant gets popup_url + signed state.
  if (action === "initiate") {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
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
      appSecret,
    );

    return json({
      popup_url: `https://${rootDomain}/oauth/facebook-page/connect?state=${encodeURIComponent(state)}`,
      state,
    });
  }

  // ─── CONFIG ─── Public. JS SDK config for the popup page on root domain.
  if (action === "config") {
    const configId = Deno.env.get("META_FB_PAGE_EMBEDDED_SIGNUP_CONFIG_ID") || "";
    return json({
      app_id: appId,
      config_id: configId,
      graph_version: GRAPH_VERSION,
    });
  }

  // ─── FINISH ─── Public. Validated by signed state.
  // Popup posts back { state, code, selected_page_ids? }.
  // If selected_page_ids is omitted, all pages returned by /me/accounts are
  // saved. UI can pre-filter to one or many.
  if (action === "finish") {
    const body = await req.json();
    const { state, code, selected_page_ids } = body as {
      state?: string;
      code?: string;
      selected_page_ids?: string[];
    };

    if (!state) return json({ error: "state obrigatório" }, 400);
    if (!code) return json({ error: "code obrigatório" }, 400);

    const decoded = await verifySignedState(state, appSecret);
    if (!decoded) return json({ error: "state inválido ou expirado" }, 401);

    try {
      // 1. Exchange code → short-lived user token
      const tokenJson = await exchangeCodeForToken(code, appId, appSecret);
      if (!tokenJson.access_token) {
        return json({ error: "Falha ao trocar code", details: tokenJson }, 400);
      }
      const shortToken = tokenJson.access_token as string;

      // 2. Trade for long-lived (~60d) user token
      const longToken = await exchangeForLongLivedToken(shortToken, appId, appSecret);

      // 3. List pages the user manages (each comes with its own long-lived page token)
      const pages = await listUserPages(longToken);
      if (pages.length === 0) {
        return json({ error: "Nenhuma página Facebook encontrada para este usuário." }, 400);
      }

      // 4. Filter to selected pages (or save all)
      const toSave = selected_page_ids && selected_page_ids.length > 0
        ? pages.filter((p) => selected_page_ids.includes(p.id))
        : pages;

      if (toSave.length === 0) {
        return json({ error: "Nenhuma página selecionada foi encontrada na conta." }, 400);
      }

      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      const savedIntegrations: Array<{
        integration_id: string;
        page_id: string;
        page_name: string;
        subscribed: boolean;
      }> = [];

      for (const page of toSave) {
        // 5. Check for existing integration (client_id + page_id pair)
        const { data: existing } = await adminClient
          .from("integrations")
          .select("id, config")
          .eq("client_id", decoded.client_id)
          .eq("provider", "facebook_page")
          .filter("config->>page_id", "eq", page.id)
          .maybeSingle();

        // Preserve existing verify_token on re-connect so Meta doesn't re-handshake
        const verifyToken =
          (existing?.config as { webhook_verify_token?: string } | null)?.webhook_verify_token
          ?? generateVerifyToken();

        const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/facebook-messenger-webhook`;

        const config = {
          page_id: page.id,
          page_name: page.name,
          page_category: page.category ?? "",
          page_access_token: page.access_token,
          app_id: appId,
          webhook_url: webhookUrl,
          webhook_verify_token: verifyToken,
          signup_method: "embedded_signup",
          connected_at: new Date().toISOString(),
        };

        let integrationId: string;
        if (existing) {
          await adminClient
            .from("integrations")
            .update({
              status: "connected",
              access_token: longToken,
              config,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
          integrationId = existing.id as string;
          console.log(
            `[facebook-page-embedded-signup] Updated integration ${integrationId} (${page.name})`,
          );
        } else {
          const { data: newInt, error: insErr } = await adminClient
            .from("integrations")
            .insert({
              client_id: decoded.client_id,
              provider: "facebook_page",
              status: "connected",
              access_token: longToken,
              config,
            })
            .select("id")
            .single();
          if (insErr || !newInt) {
            console.error(`[facebook-page-embedded-signup] Insert error:`, insErr);
            continue;
          }
          integrationId = newInt.id as string;
          console.log(
            `[facebook-page-embedded-signup] Created integration ${integrationId} (${page.name})`,
          );
        }

        // 6. Subscribe the page to Messenger webhook
        const subscribed = await subscribePageToMessenger(page.id, page.access_token);

        savedIntegrations.push({
          integration_id: integrationId,
          page_id: page.id,
          page_name: page.name,
          subscribed,
        });
      }

      return json({
        success: true,
        message: `${savedIntegrations.length} página(s) conectada(s)`,
        integrations: savedIntegrations,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[facebook-page-embedded-signup] finish error:", msg);
      return json({ error: msg }, 500);
    }
  }

  // ─── LIST ─── Authenticated. Returns the user's pages without saving — used
  // when the UI wants the user to pick which page(s) to connect.
  if (action === "list") {
    const body = await req.json();
    const { state, code } = body as { state?: string; code?: string };
    if (!state || !code) return json({ error: "state e code obrigatórios" }, 400);

    const decoded = await verifySignedState(state, appSecret);
    if (!decoded) return json({ error: "state inválido ou expirado" }, 401);

    try {
      const tokenJson = await exchangeCodeForToken(code, appId, appSecret);
      if (!tokenJson.access_token) {
        return json({ error: "Falha ao trocar code", details: tokenJson }, 400);
      }
      const longToken = await exchangeForLongLivedToken(
        tokenJson.access_token,
        appId,
        appSecret,
      );
      const pages = await listUserPages(longToken);
      // NOTE: returning page_access_token would be a leak risk. Send only id,
      // name, category for selection. The finish call re-derives tokens.
      return json({
        pages: pages.map((p) => ({ id: p.id, name: p.name, category: p.category })),
        // Echo back so caller can re-submit; signed state still required.
        // (Alternative: cache server-side in oauth_sessions like meta-oauth does.)
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[facebook-page-embedded-signup] list error:", msg);
      return json({ error: msg }, 500);
    }
  }

  return json({ error: `Ação desconhecida: ${action}` }, 400);
});
