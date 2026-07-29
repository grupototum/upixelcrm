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

async function exchangeCodeForUserToken(
  code: string,
  appId: string,
  appSecret: string,
  redirectUri?: string,
) {
  const url = new URL(`${GRAPH_BASE}/oauth/access_token`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("code", code);
  // Standard OAuth redirect flow requer redirect_uri idêntico ao usado no dialog.
  // Facebook Login for Business (config_id flow) ignora esse param.
  if (redirectUri) url.searchParams.set("redirect_uri", redirectUri);
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
      .select("client_id, tenant_id, role")
      .eq("id", user.id)
      .single();
    if (!profile) return json({ error: "Profile not found" }, 404);

    // resolveClientId server-side (mesma lógica do whatsapp-proxy): masters têm
    // profile.client_id = próprio profile.id (não é tenant). Prefere tenant_id válido.
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);

    const profileRow = profile as { client_id?: string | null; tenant_id?: string | null };
    const reqBody = await req.clone().json().catch(() => ({} as Record<string, unknown>));
    const bodyTenantId = (reqBody as { tenant_id?: string }).tenant_id;

    let tenantId: string | null = null;
    if (isUuid(bodyTenantId)) tenantId = bodyTenantId;
    if (!tenantId && isUuid(profileRow.tenant_id)) tenantId = profileRow.tenant_id;
    if (!tenantId && isUuid(profileRow.client_id)) {
      // Confirma que client_id é tenant real
      const { data: t } = await userClient.from("tenants").select("id").eq("id", profileRow.client_id).maybeSingle();
      if (t) tenantId = profileRow.client_id;
    }
    if (!tenantId) {
      return json({
        error: "tenant_id requerido. Master deve mandar tenant_id no body.",
      }, 400);
    }
    const clientId = tenantId;

    const appId = Deno.env.get("META_APP_ID");
    const appSecret = Deno.env.get("META_APP_SECRET");
    if (!appId || !appSecret) {
      return json({
        error: "Embedded Signup ainda não configurado. Faltam META_APP_ID e META_APP_SECRET no Supabase.",
        code: "EMBEDDED_NOT_CONFIGURED",
      }, 503);
    }

    const body = await req.json().catch(() => ({}));
    const { code, selected_page_ids, redirect_uri, user_token, session_id } = body as {
      code?: string;
      selected_page_ids?: string[];
      redirect_uri?: string;
      user_token?: string; // legado — clientes antigos ainda mandam o token
      session_id?: string; // fluxo atual — handle opaco de meta_oauth_sessions
    };

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Códigos OAuth são single-use: `list` troca o code por user_token (long-lived),
    // guarda-o server-side em meta_oauth_sessions e devolve só o session_id.
    // `finish` resolve o token pela sessão — o token nunca mais transita no browser.
    let longToken: string | undefined = user_token;

    if (!longToken && session_id) {
      const { data: sess } = await adminClient
        .from("meta_oauth_sessions")
        .select("id, access_token, used, expires_at")
        .eq("id", session_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!sess || sess.used || new Date(sess.expires_at as string) < new Date()) {
        return json({ error: "Sessão OAuth expirada. Refaça a conexão com o Facebook.", code: "SESSION_EXPIRED" }, 400);
      }
      longToken = sess.access_token as string;
    }

    if (!longToken) {
      if (!code) return json({ error: "Missing code or user_token" }, 400);

      const exch = await exchangeCodeForUserToken(code, appId, appSecret, redirect_uri);
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

      // Long-lived user token (~60d) — usado tanto pra list quanto pra finish
      longToken = await exchangeForLongLivedToken(shortToken, appId, appSecret);
    }

    // List pages com o token (curto ou longo)
    const pages = await listUserPages(longToken);
    if (pages.length === 0) {
      return json({
        error: "Nenhuma página Facebook encontrada para este usuário.",
        code: "NO_PAGES",
      }, 400);
    }

    // ─── LIST ─── Guarda o long-lived token server-side e devolve as páginas +
    // um session_id opaco. XSS na app não consegue mais roubar o token da Meta.
    if (action === "list") {
      const { data: sessRow, error: sessErr } = await adminClient
        .from("meta_oauth_sessions")
        .insert({
          user_id: user.id,
          client_id: clientId,
          type: "fb_embedded_signup",
          access_token: longToken,
          discovered: pages.map((p) => ({ id: p.id, name: p.name, category: p.category ?? null })),
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          used: false,
        })
        .select("id")
        .single();
      if (sessErr || !sessRow) {
        return json({ error: "Falha ao criar sessão OAuth", details: sessErr?.message }, 500);
      }
      return json({
        pages: pages.map((p) => ({ id: p.id, name: p.name, category: p.category ?? null })),
        session_id: sessRow.id,
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

      const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/facebook-messenger-webhook`;
      const saved: Array<{
        integration_id: string;
        page_id: string;
        page_name: string;
        subscribed: boolean;
        subscribe_error?: string;
      }> = [];
      const errors: Array<{ page_id: string; page_name: string; op: string; error: string }> = [];

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
          const { error: updErr } = await adminClient
            .from("integrations")
            .update({ ...integrationRow, updated_at: new Date().toISOString() })
            .eq("id", existing.id);
          if (updErr) {
            console.error("[facebook-page-embedded-signup] update error:", page.id, updErr);
            errors.push({ page_id: page.id, page_name: page.name, op: "update", error: updErr.message });
            continue;
          }
          integrationId = existing.id as string;
        } else {
          const { data: newInt, error: insErr } = await adminClient
            .from("integrations")
            .insert(integrationRow)
            .select("id")
            .single();
          if (insErr || !newInt) {
            console.error("[facebook-page-embedded-signup] insert error:", page.id, insErr);
            errors.push({
              page_id: page.id,
              page_name: page.name,
              op: "insert",
              error: insErr?.message ?? "no row returned",
            });
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

      if (saved.length === 0 && errors.length > 0) {
        const firstErr = errors[0];
        return json({
          error: `Falha ao salvar páginas: [${firstErr.op}] ${firstErr.error}`,
          errors,
          debug: { tenantId, clientId, attempted: toSave.length },
        }, 500);
      }

      // Sessão OAuth é single-use: consumida com sucesso, marca como usada.
      if (session_id && saved.length > 0) {
        await adminClient
          .from("meta_oauth_sessions")
          .update({ used: true })
          .eq("id", session_id)
          .eq("user_id", user.id);
      }

      return json({
        success: saved.length > 0,
        message: `${saved.length} página(s) conectada(s)${errors.length > 0 ? `, ${errors.length} com erro` : ""}`,
        integrations: saved,
        errors,
        debug: { tenantId, clientId, attempted: toSave.length },
      });
    }

    return json({ error: `Ação desconhecida: ${action}` }, 400);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[facebook-page-embedded-signup] error:", msg);
    return json({ error: msg }, 500);
  }
});
