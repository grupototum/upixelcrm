// Facebook Page Embedded Signup (via Facebook Login for Business).
//
// Follows the same Bearer-auth pattern as instagram-exchange-token —
// the user is already authenticated on the tenant subdomain when they
// click "Conectar Facebook", and FB.login() runs in-place (the Meta App
// must have the tenant origin allow-listed).
//
// Fluxo:
//   1. Frontend chama FB.login() com config_id de Facebook Page
//   2. Popup retorna { code }
//   3. Frontend POST { code } pra essa Edge Function (action=list) — recebe
//      a lista de páginas que o usuário gerencia (sem tokens) pra UI escolher
//   4. Frontend POST { code, selected_page_ids: [...] } (action=finish) —
//      executa exchange, busca page tokens, subscreve webhook, salva
//      uma row em `integrations` por página escolhida
//
// Secrets necessários (Supabase Edge):
//   META_APP_ID
//   META_APP_SECRET
//
// Optional secret (frontend reads via VITE_META_FB_PAGE_CONFIG_ID):
//   META_FB_PAGE_EMBEDDED_SIGNUP_CONFIG_ID — exposed via action=config

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

const GRAPH_API_VERSION = "v22.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const WEBHOOK_SUBSCRIBED_FIELDS = "messages,messaging_postbacks,messaging_read,message_deliveries";

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

async function readBody(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

interface PageEntry {
  id: string;
  name: string;
  access_token: string;
  category?: string;
}

async function exchangeCodeForUserToken(code: string, appId: string, appSecret: string) {
  const url = new URL(`${GRAPH_BASE}/oauth/access_token`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("code", code);
  const res = await fetch(url.toString());
  return { ok: res.ok, status: res.status, data: await readBody(res) };
}

async function exchangeForLongLivedToken(
  shortToken: string,
  appId: string,
  appSecret: string,
): Promise<string> {
  const url = new URL(`${GRAPH_BASE}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", shortToken);
  const res = await fetch(url.toString());
  const data = await res.json();
  if (!data.access_token) {
    console.warn("[facebook-page-embedded-signup] Long-lived exchange failed, falling back to short:", data);
    return shortToken;
  }
  return data.access_token as string;
}

async function listUserPages(userToken: string): Promise<PageEntry[]> {
  const url = new URL(`${GRAPH_BASE}/me/accounts`);
  url.searchParams.set("fields", "id,name,access_token,category");
  url.searchParams.set("access_token", userToken);
  const res = await fetch(url.toString());
  const data = await res.json();
  if (!data?.data) {
    console.warn("[facebook-page-embedded-signup] me/accounts returned no data:", data);
    return [];
  }
  return data.data as PageEntry[];
}

async function subscribePageToMessenger(pageId: string, pageToken: string): Promise<{ success: boolean; error?: string }> {
  try {
    const url = new URL(`${GRAPH_BASE}/${pageId}/subscribed_apps`);
    url.searchParams.set("subscribed_fields", WEBHOOK_SUBSCRIBED_FIELDS);
    url.searchParams.set("access_token", pageToken);
    const res = await fetch(url.toString(), { method: "POST" });
    const data = await res.json();
    if (data.success) return { success: true };
    return { success: false, error: data?.error?.message ?? "unknown subscribe error" };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function generateVerifyToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "list";

  // ─── CONFIG ─── Public. Returns the JS SDK config for the popup.
  if (action === "config") {
    const appId = Deno.env.get("META_APP_ID");
    const configId = Deno.env.get("META_FB_PAGE_EMBEDDED_SIGNUP_CONFIG_ID") ?? "";
    return json({
      app_id: appId ?? "",
      config_id: configId,
      graph_version: GRAPH_API_VERSION,
    });
  }

  // ─── Authenticated actions: list, finish ───
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const { data: profile } = await userClient
      .from("profiles")
      .select("client_id, tenant_id")
      .eq("id", user.id)
      .single();
    if (!profile) return json({ error: "Profile not found" }, 404);

    const clientId = (profile as { client_id: string }).client_id;
    const tenantId = (profile as { tenant_id?: string | null }).tenant_id ?? null;

    const appId = Deno.env.get("META_APP_ID");
    const appSecret = Deno.env.get("META_APP_SECRET");
    if (!appId || !appSecret) {
      return json({
        error: "Embedded Signup ainda não configurado. Faltam META_APP_ID e META_APP_SECRET no Supabase.",
        code: "EMBEDDED_NOT_CONFIGURED",
      }, 503);
    }

    const body = await req.json().catch(() => ({}));
    const { code, selected_page_ids } = body as {
      code?: string;
      selected_page_ids?: string[];
    };
    if (!code) return json({ error: "Missing code from Embedded Signup popup" }, 400);

    // ─── 1) Exchange code → short-lived user token
    const exch = await exchangeCodeForUserToken(code, appId, appSecret);
    if (!exch.ok) {
      const metaErr = (exch.data as { error?: { message?: string } })?.error?.message ?? `HTTP ${exch.status}`;
      return json({
        error: `Falha ao trocar código por token: ${metaErr}`,
        code: "TOKEN_EXCHANGE_FAILED",
        details: exch.data,
      }, 502);
    }
    const shortToken = (exch.data as { access_token?: string })?.access_token;
    if (!shortToken) return json({ error: "No access_token in Meta response", details: exch.data }, 502);

    // 2) Long-lived user token (~60d)
    const longToken = await exchangeForLongLivedToken(shortToken, appId, appSecret);

    // 3) List pages
    const pages = await listUserPages(longToken);
    if (pages.length === 0) {
      return json({
        error: "Nenhuma página Facebook encontrada para este usuário.",
        code: "NO_PAGES",
      }, 400);
    }

    // ─── LIST ─── Return pages so UI can show selection. NEVER include
    // page tokens here — they only leave the server when saved to integrations.
    if (action === "list") {
      return json({
        pages: pages.map((p) => ({ id: p.id, name: p.name, category: p.category ?? null })),
        // signed code so client can re-submit safely
        // (alternative: cache the user_token in a server-side oauth_session row)
      });
    }

    // ─── FINISH ─── Save the selected pages and subscribe webhooks.
    if (action === "finish") {
      const toSave =
        selected_page_ids && selected_page_ids.length > 0
          ? pages.filter((p) => selected_page_ids.includes(p.id))
          : pages;

      if (toSave.length === 0) {
        return json({ error: "Nenhuma página selecionada foi encontrada na conta." }, 400);
      }

      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/facebook-messenger-webhook`;
      const saved: Array<{
        integration_id: string;
        page_id: string;
        page_name: string;
        subscribed: boolean;
        subscribe_error?: string;
      }> = [];

      for (const page of toSave) {
        // Match existing integration on (client_id, provider, page_id)
        const { data: existing } = await adminClient
          .from("integrations")
          .select("id, config")
          .eq("client_id", clientId)
          .eq("provider", "facebook_page")
          .filter("config->>page_id", "eq", page.id)
          .maybeSingle();

        const existingConfig = (existing?.config ?? null) as { webhook_verify_token?: string } | null;
        const verifyToken = existingConfig?.webhook_verify_token ?? generateVerifyToken();

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

        const integrationRow = {
          client_id: clientId,
          tenant_id: tenantId,
          provider: "facebook_page" as const,
          status: "connected" as const,
          access_token: longToken,
          config,
        };

        let integrationId: string;
        if (existing) {
          await adminClient
            .from("integrations")
            .update({ ...integrationRow, updated_at: new Date().toISOString() })
            .eq("id", existing.id);
          integrationId = existing.id as string;
        } else {
          const { data: newInt, error: insErr } = await adminClient
            .from("integrations")
            .insert(integrationRow)
            .select("id")
            .single();
          if (insErr || !newInt) {
            console.error("[facebook-page-embedded-signup] insert error:", insErr);
            continue;
          }
          integrationId = newInt.id as string;
        }

        const sub = await subscribePageToMessenger(page.id, page.access_token);
        saved.push({
          integration_id: integrationId,
          page_id: page.id,
          page_name: page.name,
          subscribed: sub.success,
          ...(sub.error ? { subscribe_error: sub.error } : {}),
        });
      }

      return json({
        success: true,
        message: `${saved.length} página(s) conectada(s)`,
        integrations: saved,
      });
    }

    return json({ error: `Ação desconhecida: ${action}` }, 400);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[facebook-page-embedded-signup] error:", msg);
    return json({ error: msg }, 500);
  }
});
