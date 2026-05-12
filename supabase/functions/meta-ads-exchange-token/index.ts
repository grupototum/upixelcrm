// Meta Ads Embedded Signup token exchange.
//
// Fluxo:
//   1. Frontend chama FB.login(...) com config_id de Meta Ads
//   2. Popup retorna { code } (scopes: ads_management, ads_read, business_management)
//   3. Frontend POSTa pra essa Edge Function com { code } ou { code, ad_account_id }
//   4. Aqui:
//      - troca code → short-lived → long-lived (~60 dias)
//      - lista /me/adaccounts
//      - se um único ad account: salva direto
//      - se múltiplos sem seleção: devolve a lista pro frontend escolher
//      - se ad_account_id fornecido: salva apenas aquele
//
// Secrets:
//   META_APP_ID, META_APP_SECRET

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

interface AdAccountEntry {
  id: string;             // ex: "act_1234567890"
  account_id: string;     // ex: "1234567890"
  name: string;
  currency: string;
  account_status: number; // 1=active
  business?: { id: string; name: string };
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

    const { data: profile } = await userClient.from("profiles").select("client_id").eq("id", user.id).single();
    if (!profile) return jsonResponse({ error: "Profile not found" }, 404);
    const clientId = profile.client_id;

    const appId = Deno.env.get("META_APP_ID");
    const appSecret = Deno.env.get("META_APP_SECRET");
    if (!appId || !appSecret) {
      return jsonResponse({
        error: "Embedded Signup ainda não configurado. Faltam META_APP_ID e META_APP_SECRET no Supabase.",
        code: "EMBEDDED_NOT_CONFIGURED",
      }, 503);
    }

    const body = await req.json();
    const {
      code,
      ad_account_id,        // pode vir do popup ou da segunda chamada após escolher
      long_lived_token,     // segunda chamada já passa o token long-lived (não troca de novo)
    } = body as {
      code?: string;
      ad_account_id?: string;
      long_lived_token?: string;
    };

    let accessToken = long_lived_token;

    // ── 1) Troca code → token (só primeira chamada) ──
    if (!accessToken) {
      if (!code) return jsonResponse({ error: "Missing code" }, 400);
      const tokenUrl = new URL(`${GRAPH_BASE}/oauth/access_token`);
      tokenUrl.searchParams.set("client_id", appId);
      tokenUrl.searchParams.set("client_secret", appSecret);
      tokenUrl.searchParams.set("code", code);
      const tokenRes = await fetch(tokenUrl.toString());
      const tokenData = await readBody(tokenRes);
      if (!tokenRes.ok) {
        return jsonResponse({
          error: `Falha ao trocar código: ${(tokenData as any)?.error?.message ?? `HTTP ${tokenRes.status}`}`,
          code: "TOKEN_EXCHANGE_FAILED",
          details: tokenData,
        }, 502);
      }
      const shortLived = (tokenData as any)?.access_token;
      if (!shortLived) return jsonResponse({ error: "Meta não devolveu access_token", details: tokenData }, 502);

      // Long-lived (60 dias)
      const llUrl = new URL(`${GRAPH_BASE}/oauth/access_token`);
      llUrl.searchParams.set("grant_type", "fb_exchange_token");
      llUrl.searchParams.set("client_id", appId);
      llUrl.searchParams.set("client_secret", appSecret);
      llUrl.searchParams.set("fb_exchange_token", shortLived);
      const llRes = await fetch(llUrl.toString());
      const llData = await readBody(llRes);
      accessToken = (llData as any)?.access_token ?? shortLived;
    }

    if (!accessToken) {
      return jsonResponse({ error: "Sem access token disponível" }, 502);
    }

    // ── 2) Lista ad accounts do usuário ──
    const accountsRes = await fetch(
      `${GRAPH_BASE}/me/adaccounts?fields=id,account_id,name,currency,account_status,business&access_token=${accessToken}`,
    );
    const accountsData = await readBody(accountsRes);
    if (!accountsRes.ok) {
      return jsonResponse({
        error: "Falha ao listar contas de anúncio",
        details: accountsData,
      }, 502);
    }
    const allAccounts = ((accountsData as any)?.data ?? []) as AdAccountEntry[];
    // Filtra só os accounts ativos (account_status === 1)
    const activeAccounts = allAccounts.filter((a) => a.account_status === 1);

    if (activeAccounts.length === 0) {
      return jsonResponse({
        error: "Nenhuma conta de anúncio ativa encontrada. " +
          "Crie ou ative uma conta no Meta Business Suite (business.facebook.com).",
        code: "NO_AD_ACCOUNTS",
      }, 400);
    }

    // ── 3) Decide qual conta usar ──
    let chosen: AdAccountEntry | undefined;
    if (ad_account_id) {
      // O frontend escolheu — aceita formato com ou sem 'act_'
      const normalized = ad_account_id.startsWith("act_") ? ad_account_id : `act_${ad_account_id}`;
      chosen = activeAccounts.find((a) => a.id === normalized);
      if (!chosen) {
        return jsonResponse({
          error: `Conta ${ad_account_id} não encontrada ou inativa entre as suas.`,
        }, 400);
      }
    } else if (activeAccounts.length === 1) {
      chosen = activeAccounts[0];
    } else {
      // Múltiplas: pede pro frontend escolher
      return jsonResponse({
        needs_selection: true,
        accounts: activeAccounts.map((a) => ({
          id: a.id,
          account_id: a.account_id,
          name: a.name,
          currency: a.currency,
          business: a.business?.name ?? null,
        })),
        long_lived_token: accessToken,
      });
    }

    // ── 4) Persiste integration ──
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const expiresAt = new Date(Date.now() + 55 * 24 * 3600 * 1000).toISOString(); // ~55d (margem do long-lived 60d)

    const newConfig = {
      ad_account_id: chosen.id,
      ad_account_name: chosen.name,
      currency: chosen.currency,
      business_id: chosen.business?.id ?? null,
      business_name: chosen.business?.name ?? null,
      embedded_signup: true,
    };

    const { data: existing } = await adminClient
      .from("integrations")
      .select("id")
      .eq("client_id", clientId)
      .eq("provider", "meta_ads")
      .maybeSingle();

    let integrationId: string;
    if (existing) {
      const { data: updated, error } = await adminClient
        .from("integrations")
        .update({
          status: "connected",
          access_token: accessToken,
          token_expires_at: expiresAt,
          config: newConfig,
        })
        .eq("id", existing.id)
        .select("id").single();
      if (error) return jsonResponse({ error: error.message }, 500);
      integrationId = updated.id;
    } else {
      const { data: inserted, error } = await adminClient
        .from("integrations")
        .insert({
          client_id: clientId,
          provider: "meta_ads",
          status: "connected",
          access_token: accessToken,
          token_expires_at: expiresAt,
          config: newConfig,
        })
        .select("id").single();
      if (error) return jsonResponse({ error: error.message }, 500);
      integrationId = inserted.id;
    }

    return jsonResponse({
      success: true,
      integration_id: integrationId,
      ad_account_id: chosen.id,
      ad_account_name: chosen.name,
      currency: chosen.currency,
      business_name: chosen.business?.name ?? null,
      token_expires_at: expiresAt,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("meta-ads-exchange-token error:", message);
    return jsonResponse({ error: message }, 500);
  }
});
