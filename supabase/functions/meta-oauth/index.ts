// Meta OAuth flow — lets users connect WhatsApp, Instagram, and Meta Ads
// directly from the app without copy-pasting tokens from the Developer Portal.
//
// Three actions:
//   POST ?action=init     — auth required. Returns Meta authorization URL.
//   POST ?action=exchange — public. Trades code for token, discovers accounts,
//                           stores in meta_oauth_sessions. Identified by
//                           HMAC-signed state parameter.
//   POST ?action=fetch    — auth required. Returns the discovered accounts for
//                           a given oauth_session_id (so the user can pick).
//   POST ?action=save     — auth required. Persists the chosen account(s) into
//                           the integrations table.
//
// Required Supabase secrets:
//   META_APP_ID
//   META_APP_SECRET
//   APP_ROOT_DOMAIN  (e.g. "upixel.app" — used to build callback URL)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const OAUTH_BASE = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

// Scope sets per integration type
const SCOPES: Record<string, string[]> = {
  whatsapp: ["whatsapp_business_messaging", "whatsapp_business_management", "business_management"],
  instagram: [
    "instagram_basic",
    "instagram_manage_messages",
    "instagram_manage_comments",
    "pages_show_list",
    "pages_read_engagement",
    "pages_manage_metadata",
    "business_management",
  ],
  ads: ["ads_read", "ads_management", "business_management"],
  all: [
    "whatsapp_business_messaging",
    "whatsapp_business_management",
    "instagram_basic",
    "instagram_manage_messages",
    "instagram_manage_comments",
    "pages_show_list",
    "pages_read_engagement",
    "pages_manage_metadata",
    "ads_read",
    "ads_management",
    "business_management",
  ],
};

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
  type: string;
  nonce: string;
  ts: number;
}

async function buildSignedState(payload: StatePayload, secret: string): Promise<string> {
  const json = JSON.stringify(payload);
  const body = base64urlEncode(json);
  const sig = await hmacSign(body, secret);
  return `${body}.${sig}`;
}

async function verifyAndDecodeState(state: string, secret: string): Promise<StatePayload | null> {
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const expectedSig = await hmacSign(body, secret);
  if (expectedSig !== sig) return null;
  try {
    const payload = JSON.parse(base64urlDecode(body)) as StatePayload;
    // 30-minute TTL on state
    if (Date.now() - payload.ts > 30 * 60 * 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

// ─── Discovery helpers ───
async function discoverWhatsAppBusinessAccounts(token: string): Promise<any[]> {
  // Get businesses the user has access to
  const bizRes = await fetch(`${GRAPH_BASE}/me/businesses?access_token=${token}&fields=id,name`);
  const bizJson = await bizRes.json();
  const businesses = bizJson?.data || [];

  const wabas: any[] = [];
  for (const biz of businesses) {
    // Owned WABAs
    const ownedRes = await fetch(
      `${GRAPH_BASE}/${biz.id}/owned_whatsapp_business_accounts?access_token=${token}&fields=id,name,currency,timezone_id`
    );
    const ownedJson = await ownedRes.json();
    for (const w of ownedJson?.data || []) {
      wabas.push({ ...w, business_id: biz.id, business_name: biz.name, ownership: "owned" });
    }
    // Client WABAs (BSP scenario)
    const clientRes = await fetch(
      `${GRAPH_BASE}/${biz.id}/client_whatsapp_business_accounts?access_token=${token}&fields=id,name,currency,timezone_id`
    );
    const clientJson = await clientRes.json();
    for (const w of clientJson?.data || []) {
      wabas.push({ ...w, business_id: biz.id, business_name: biz.name, ownership: "client" });
    }
  }

  // For each WABA, fetch its phone numbers
  for (const waba of wabas) {
    const phonesRes = await fetch(
      `${GRAPH_BASE}/${waba.id}/phone_numbers?access_token=${token}&fields=id,display_phone_number,verified_name,quality_rating,code_verification_status`
    );
    const phonesJson = await phonesRes.json();
    waba.phone_numbers = phonesJson?.data || [];
  }

  return wabas;
}

async function discoverInstagramAccounts(token: string): Promise<any[]> {
  // Instagram Business accounts are linked to FB Pages
  const pagesRes = await fetch(
    `${GRAPH_BASE}/me/accounts?access_token=${token}&fields=id,name,access_token,instagram_business_account{id,username,name,profile_picture_url,followers_count}`
  );
  const pagesJson = await pagesRes.json();
  const accounts: any[] = [];
  for (const page of pagesJson?.data || []) {
    if (page.instagram_business_account) {
      accounts.push({
        ig_account_id: page.instagram_business_account.id,
        ig_username: page.instagram_business_account.username,
        ig_name: page.instagram_business_account.name,
        ig_picture: page.instagram_business_account.profile_picture_url,
        ig_followers: page.instagram_business_account.followers_count,
        page_id: page.id,
        page_name: page.name,
        page_access_token: page.access_token, // long-lived page token
      });
    }
  }
  return accounts;
}

async function discoverAdAccounts(token: string): Promise<any[]> {
  const res = await fetch(
    `${GRAPH_BASE}/me/adaccounts?access_token=${token}&fields=id,account_id,name,currency,account_status,business_name`
  );
  const data = await res.json();
  return (data?.data || []).map((a: any) => ({
    id: a.id, // act_XXXXX
    account_id: a.account_id,
    name: a.name,
    currency: a.currency,
    status: a.account_status,
    business_name: a.business_name,
  }));
}

// Exchange short-lived token for long-lived (60 days)
async function exchangeForLongLivedToken(
  shortToken: string,
  appId: string,
  appSecret: string
): Promise<string> {
  const url = `${GRAPH_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.access_token) {
    console.warn("Long-lived exchange failed, returning short-lived:", data);
    return shortToken;
  }
  return data.access_token;
}

// Generate webhook verify token
function generateVerifyToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const appId = Deno.env.get("META_APP_ID");
  const appSecret = Deno.env.get("META_APP_SECRET");
  const rootDomain = Deno.env.get("APP_ROOT_DOMAIN") || "upixel.app";

  if (!appId || !appSecret) {
    return json({ error: "META_APP_ID e META_APP_SECRET não configurados no Supabase" }, 500);
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "init";

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // ─── INIT ─── Build authorization URL with signed state
    if (action === "init") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return json({ error: "Unauthorized" }, 401);

      const { data: profile } = await supabase
        .from("profiles")
        .select("client_id")
        .eq("id", user.id)
        .single();
      if (!profile) return json({ error: "Profile not found" }, 404);

      const body = await req.json();
      const type = body.type || "all";
      const tenant = body.tenant || ""; // e.g. "acme" for acme.upixel.app
      if (!SCOPES[type]) return json({ error: `type inválido: ${type}` }, 400);

      const state = await buildSignedState(
        {
          user_id: user.id,
          client_id: profile.client_id,
          tenant,
          type,
          nonce: crypto.randomUUID(),
          ts: Date.now(),
        },
        appSecret
      );

      const redirectUri = `https://${rootDomain}/oauth/meta/callback`;
      const params = new URLSearchParams({
        client_id: appId,
        redirect_uri: redirectUri,
        state,
        scope: SCOPES[type].join(","),
        response_type: "code",
      });
      const authUrl = `${OAUTH_BASE}?${params.toString()}`;

      return json({ auth_url: authUrl, state, redirect_uri: redirectUri });
    }

    // ─── EXCHANGE ─── Public endpoint called by callback page on root domain
    if (action === "exchange") {
      const body = await req.json();
      const { code, state } = body as { code?: string; state?: string };
      if (!code || !state) return json({ error: "code e state são obrigatórios" }, 400);

      const decoded = await verifyAndDecodeState(state, appSecret);
      if (!decoded) return json({ error: "state inválido ou expirado" }, 401);

      const redirectUri = `https://${rootDomain}/oauth/meta/callback`;
      const tokenUrl =
        `${GRAPH_BASE}/oauth/access_token` +
        `?client_id=${appId}` +
        `&client_secret=${appSecret}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&code=${encodeURIComponent(code)}`;

      const tokenRes = await fetch(tokenUrl);
      const tokenJson = await tokenRes.json();
      if (!tokenJson.access_token) {
        return json({ error: "Falha na troca de código", details: tokenJson }, 400);
      }

      const longLived = await exchangeForLongLivedToken(tokenJson.access_token, appId, appSecret);

      // Discover accounts based on type (run in parallel for "all")
      const discovered: any = {};
      const tasks: Promise<any>[] = [];
      if (decoded.type === "whatsapp" || decoded.type === "all") {
        tasks.push(
          discoverWhatsAppBusinessAccounts(longLived).then((d) => (discovered.whatsapp = d))
        );
      }
      if (decoded.type === "instagram" || decoded.type === "all") {
        tasks.push(discoverInstagramAccounts(longLived).then((d) => (discovered.instagram = d)));
      }
      if (decoded.type === "ads" || decoded.type === "all") {
        tasks.push(discoverAdAccounts(longLived).then((d) => (discovered.ads = d)));
      }
      await Promise.all(tasks);

      // Persist the OAuth session for the user to pick from on the tenant
      const { data: session, error: insErr } = await adminClient
        .from("meta_oauth_sessions")
        .insert({
          user_id: decoded.user_id,
          client_id: decoded.client_id,
          tenant_subdomain: decoded.tenant,
          type: decoded.type,
          access_token: longLived,
          discovered,
        })
        .select("id")
        .single();

      if (insErr || !session) {
        console.error("Failed to save oauth session:", insErr);
        return json({ error: "Falha ao salvar sessão OAuth" }, 500);
      }

      return json({
        oauth_session_id: session.id,
        tenant_subdomain: decoded.tenant,
        type: decoded.type,
      });
    }

    // ─── FETCH ─── Authenticated. Get the discovered accounts for selection UI.
    if (action === "fetch") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return json({ error: "Unauthorized" }, 401);

      const body = await req.json();
      const { oauth_session_id } = body as { oauth_session_id?: string };
      if (!oauth_session_id) return json({ error: "oauth_session_id obrigatório" }, 400);

      const { data: session } = await adminClient
        .from("meta_oauth_sessions")
        .select("*")
        .eq("id", oauth_session_id)
        .eq("user_id", user.id)
        .gt("expires_at", new Date().toISOString())
        .eq("used", false)
        .maybeSingle();

      if (!session) return json({ error: "Sessão não encontrada ou expirada" }, 404);

      return json({
        type: session.type,
        discovered: session.discovered,
      });
    }

    // ─── SAVE ─── Authenticated. Persist the chosen account into integrations.
    if (action === "save") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return json({ error: "Unauthorized" }, 401);

      const { data: profile } = await supabase
        .from("profiles")
        .select("client_id")
        .eq("id", user.id)
        .single();
      if (!profile) return json({ error: "Profile not found" }, 404);

      const body = await req.json();
      const { oauth_session_id, provider, selection } = body as {
        oauth_session_id: string;
        provider: "whatsapp_official" | "instagram" | "meta_ads";
        selection: any;
      };

      const { data: oauthSession } = await adminClient
        .from("meta_oauth_sessions")
        .select("*")
        .eq("id", oauth_session_id)
        .eq("user_id", user.id)
        .gt("expires_at", new Date().toISOString())
        .eq("used", false)
        .maybeSingle();

      if (!oauthSession) return json({ error: "Sessão expirada" }, 404);

      const accessToken = oauthSession.access_token as string;
      let configToSave: any = {};
      let providerKey: string = provider;

      if (provider === "whatsapp_official") {
        // selection: { waba_id, business_id, phone_number_id, display_phone_number, instance_name }
        configToSave = {
          api_url: "", // not used for direct Graph API calls
          instance_name: selection.instance_name || selection.display_phone_number || "Cloud API",
          api_key: "", // not used
          phone_number_id: selection.phone_number_id,
          business_id: selection.business_id,
          waba_id: selection.waba_id,
          access_token: accessToken,
          webhook_verify_token: generateVerifyToken(),
          connected_number: selection.display_phone_number,
        };
        providerKey = "whatsapp_official";

        // Subscribe app to the WABA so we receive webhooks
        try {
          await fetch(
            `${GRAPH_BASE}/${selection.waba_id}/subscribed_apps?access_token=${accessToken}`,
            { method: "POST" }
          );
        } catch (e) {
          console.warn("WABA subscribe failed (non-fatal):", e);
        }
      } else if (provider === "instagram") {
        // selection: { ig_account_id, ig_username, page_id, page_access_token }
        configToSave = {
          ig_account_id: selection.ig_account_id,
          ig_username: selection.ig_username,
          page_id: selection.page_id,
          // Page access tokens are preferred for IG messaging; fall back to user token
          access_token: selection.page_access_token || accessToken,
          webhook_verify_token: generateVerifyToken(),
        };
        providerKey = "instagram";

        // Subscribe page to messaging webhooks
        if (selection.page_id && selection.page_access_token) {
          try {
            await fetch(
              `${GRAPH_BASE}/${selection.page_id}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,message_reactions&access_token=${selection.page_access_token}`,
              { method: "POST" }
            );
          } catch (e) {
            console.warn("Page subscribe failed (non-fatal):", e);
          }
        }
      } else if (provider === "meta_ads") {
        // selection: { ad_account_id (act_XXX), name, currency }
        configToSave = {
          access_token: accessToken,
          ad_account_id: selection.ad_account_id,
          account_name: selection.name,
          currency: selection.currency,
        };
        providerKey = "meta_ads";
      } else {
        return json({ error: `provider inválido: ${provider}` }, 400);
      }

      // Upsert into integrations table
      const { data: existing } = await adminClient
        .from("integrations")
        .select("id, config")
        .eq("client_id", profile.client_id)
        .eq("provider", providerKey)
        .filter(
          provider === "whatsapp_official" ? "config->>phone_number_id" : "id",
          "eq",
          provider === "whatsapp_official" ? selection.phone_number_id : ""
        )
        .maybeSingle();

      if (existing) {
        await adminClient
          .from("integrations")
          .update({ status: "connected", config: configToSave })
          .eq("id", existing.id);
      } else {
        await adminClient.from("integrations").insert({
          client_id: profile.client_id,
          provider: providerKey,
          status: "connected",
          config: configToSave,
        });
      }

      // Mark OAuth session as used
      await adminClient
        .from("meta_oauth_sessions")
        .update({ used: true })
        .eq("id", oauth_session_id);

      return json({ success: true, provider: providerKey, config: configToSave });
    }

    return json({ error: `Ação desconhecida: ${action}` }, 400);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("meta-oauth error:", msg);
    return json({ error: msg }, 500);
  }
});
