// Instagram Embedded Signup (via Facebook Login for Business).
//
// Fluxo:
//   1. Frontend chama FB.login(...) com config_id de Instagram
//   2. Popup permite ao usuário escolher Pages que possuem Instagram Business
//   3. Popup retorna { code } e via postMessage entrega page_ids/ig_user_id
//   4. Frontend POSTa pra essa Edge Function com { code, ig_user_id, page_id }
//   5. Aqui:
//      - troca code → user_access_token via /oauth/access_token
//      - extende pra long-lived (60 dias) via /oauth/access_token?grant_type=fb_exchange_token
//      - busca page_access_token a partir do user token (este é permanente, sem expirar!)
//      - subscribe app na IG account: POST /{ig_user_id}/subscribed_apps
//      - cria integration provider='instagram' com ig_account_id + access_token
//
// Secrets necessários (Supabase Edge):
//   META_APP_ID
//   META_APP_SECRET

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

const GRAPH_API_VERSION = "v22.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const jsonResponse = (body: unknown, status = 200) =>
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
  instagram_business_account?: { id: string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return jsonResponse({ error: "Unauthorized" }, 401);

    const { data: profile } = await userClient
      .from("profiles")
      .select("client_id, tenant_id, role")
      .eq("id", user.id)
      .single();
    if (!profile) return jsonResponse({ error: "Profile not found" }, 404);

    // resolveClientId server-side (mesma lógica do whatsapp-proxy).
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);
    const profileRow = profile as { client_id?: string | null; tenant_id?: string | null };
    const reqBody = await req.clone().json().catch(() => ({} as Record<string, unknown>));
    const bodyTenantId = (reqBody as { tenant_id?: string }).tenant_id;
    let tenantId: string | null = null;
    if (isUuid(bodyTenantId)) tenantId = bodyTenantId;
    if (!tenantId && isUuid(profileRow.tenant_id)) tenantId = profileRow.tenant_id;
    if (!tenantId && isUuid(profileRow.client_id)) {
      const { data: t } = await userClient.from("tenants").select("id").eq("id", profileRow.client_id).maybeSingle();
      if (t) tenantId = profileRow.client_id;
    }
    if (!tenantId) {
      return jsonResponse({ error: "tenant_id requerido. Master deve mandar tenant_id no body." }, 400);
    }
    const clientId = tenantId;

    const appId = Deno.env.get("META_APP_ID");
    const appSecret = Deno.env.get("META_APP_SECRET");
    if (!appId || !appSecret) {
      return jsonResponse({
        error: "Embedded Signup ainda não configurado. Faltam META_APP_ID e META_APP_SECRET no Supabase.",
        code: "EMBEDDED_NOT_CONFIGURED",
      }, 503);
    }

    const body = await req.json();
    const { code, page_id, ig_user_id } = body as {
      code?: string;
      page_id?: string;     // se popup já mandou; senão escolhemos a primeira página com IG
      ig_user_id?: string;  // idem
    };

    if (!code) {
      return jsonResponse({ error: "Missing code from Embedded Signup popup" }, 400);
    }

    // ── 1) Troca code → short-lived user token ──
    const tokenUrl = new URL(`${GRAPH_BASE}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("code", code);
    const tokenRes = await fetch(tokenUrl.toString(), { method: "GET" });
    const tokenData = await readBody(tokenRes);
    if (!tokenRes.ok) {
      const metaErr = (tokenData as any)?.error?.message ?? `HTTP ${tokenRes.status}`;
      return jsonResponse({
        error: `Falha ao trocar código por token: ${metaErr}`,
        code: "TOKEN_EXCHANGE_FAILED",
        details: tokenData,
      }, 502);
    }
    const shortLivedToken = (tokenData as any)?.access_token;
    if (!shortLivedToken) {
      return jsonResponse({ error: "Meta não devolveu access_token", details: tokenData }, 502);
    }

    // ── 2) Estende pra long-lived (60 dias) ──
    const llUrl = new URL(`${GRAPH_BASE}/oauth/access_token`);
    llUrl.searchParams.set("grant_type", "fb_exchange_token");
    llUrl.searchParams.set("client_id", appId);
    llUrl.searchParams.set("client_secret", appSecret);
    llUrl.searchParams.set("fb_exchange_token", shortLivedToken);
    const llRes = await fetch(llUrl.toString(), { method: "GET" });
    const llData = await readBody(llRes);
    const longLivedToken = (llData as any)?.access_token ?? shortLivedToken; // fallback

    // ── 3) Lista pages que o user gerencia + IG accounts vinculadas ──
    const pagesRes = await fetch(
      `${GRAPH_BASE}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${longLivedToken}`,
    );
    const pagesData = await readBody(pagesRes);
    if (!pagesRes.ok) {
      return jsonResponse({
        error: "Falha ao listar Pages do Facebook",
        details: pagesData,
      }, 502);
    }
    const allPages = ((pagesData as any)?.data ?? []) as PageEntry[];
    const pagesWithIG = allPages.filter((p) => p.instagram_business_account?.id);

    if (pagesWithIG.length === 0) {
      return jsonResponse({
        error: "Nenhuma Página Facebook conectada a uma conta Instagram Business foi encontrada. " +
          "Conecte sua conta Instagram a uma Página Facebook primeiro em business.facebook.com.",
        code: "NO_IG_BUSINESS_ACCOUNT",
      }, 400);
    }

    // ── 4) Seleciona a Page específica (se frontend mandou) ou a primeira ──
    let chosen: PageEntry | undefined;
    if (page_id) {
      chosen = pagesWithIG.find((p) => p.id === page_id);
    } else if (ig_user_id) {
      chosen = pagesWithIG.find((p) => p.instagram_business_account?.id === ig_user_id);
    }
    if (!chosen) {
      // Se múltiplas pages, devolve lista pro frontend deixar usuário escolher
      if (pagesWithIG.length > 1) {
        return jsonResponse({
          needs_selection: true,
          pages: pagesWithIG.map((p) => ({
            page_id: p.id,
            page_name: p.name,
            ig_user_id: p.instagram_business_account!.id,
          })),
          long_lived_token: longLivedToken, // ⚠ devolve pro frontend chamar de novo com escolha
        });
      }
      chosen = pagesWithIG[0];
    }

    const pageAccessToken = chosen.access_token; // este é PERMANENTE quando vem do long-lived user token
    const igUserId = chosen.instagram_business_account!.id;

    // ── 5) Busca info da conta IG (username, profile pic) ──
    let igUsername = "";
    let igName = "";
    let igProfilePic = "";
    try {
      const infoRes = await fetch(
        `${GRAPH_BASE}/${igUserId}?fields=username,name,profile_picture_url&access_token=${pageAccessToken}`,
      );
      if (infoRes.ok) {
        const info = await infoRes.json();
        igUsername = info.username ?? "";
        igName = info.name ?? "";
        igProfilePic = info.profile_picture_url ?? "";
      }
    } catch { /* ignore */ }

    // ── 6) Registra webhook subscription na conta IG ──
    let webhookRegistered = false;
    let webhookError: string | null = null;
    try {
      // Subscribed apps na própria IG account (não na Page) — necessário pra messages/comments/mentions
      const subRes = await fetch(
        `${GRAPH_BASE}/${igUserId}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,messaging_seen,comments,mentions,story_insights`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${pageAccessToken}` },
        },
      );
      if (subRes.ok) {
        webhookRegistered = true;
      } else {
        const e = await readBody(subRes);
        webhookError = (e as any)?.error?.message ?? `HTTP ${subRes.status}`;
      }
    } catch (e) {
      webhookError = e instanceof Error ? e.message : "Unknown";
    }

    // ── 7) Persiste integration ──
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const newConfig = {
      ig_account_id: igUserId,
      ig_username: igUsername,
      ig_name: igName,
      ig_profile_picture_url: igProfilePic,
      page_id: chosen.id,
      page_name: chosen.name,
      access_token: pageAccessToken,
      webhook_verify_token: crypto.randomUUID(),
      embedded_signup: true,
      webhook_auto_registered: webhookRegistered,
    };

    const { data: existing } = await adminClient
      .from("integrations")
      .select("id")
      .eq("client_id", clientId)
      .eq("provider", "instagram")
      .eq("config->>ig_account_id", igUserId)
      .maybeSingle();

    let integrationId: string;
    if (existing) {
      const { data: updated, error } = await adminClient
        .from("integrations")
        .update({ status: "connected", config: newConfig })
        .eq("id", existing.id)
        .select("id").single();
      if (error) return jsonResponse({ error: error.message }, 500);
      integrationId = updated.id;
    } else {
      const { data: inserted, error } = await adminClient
        .from("integrations")
        .insert({
          client_id: clientId,
          tenant_id: tenantId,
          provider: "instagram",
          status: "connected",
          config: newConfig,
        })
        .select("id").single();
      if (error) return jsonResponse({ error: error.message }, 500);
      integrationId = inserted.id;
    }

    return jsonResponse({
      success: true,
      integration_id: integrationId,
      ig_username: igUsername,
      ig_name: igName,
      ig_profile_picture_url: igProfilePic,
      page_name: chosen.name,
      webhook_auto_registered: webhookRegistered,
      webhook_error: webhookError,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("instagram-exchange-token error:", message);
    return jsonResponse({ error: message }, 500);
  }
});
