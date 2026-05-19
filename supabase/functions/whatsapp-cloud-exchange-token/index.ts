// Embedded Signup token exchange + integration provisioning.
//
// Fluxo:
//   1. Frontend chama FB.login(...) com Embedded Signup config
//   2. Popup retorna { code, phone_number_id, waba_id }
//   3. Frontend POSTa pra essa Edge Function com esses 3 valores
//   4. Aqui trocamos o code por um access_token via /oauth/access_token
//      usando META_APP_SECRET (nunca exposto ao client)
//   5. Salvamos integration com provider='whatsapp_cloud'
//   6. Registramos o webhook automaticamente via Graph API
//      POST /{waba_id}/subscribed_apps
//   7. Devolvemos { integration_id, display_phone_number, verified_name } pra UI
//
// Secrets necessários (Supabase Edge → Settings → Secrets):
//   META_APP_ID
//   META_APP_SECRET
//   (opcional) META_WHATSAPP_CONFIG_ID — usado pelo frontend, não aqui

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
        error: "Embedded Signup ainda não configurado pelo administrador do uPixel. " +
          "Faltam os secrets META_APP_ID e META_APP_SECRET no Supabase. " +
          "Use o cadastro manual enquanto isso.",
        code: "EMBEDDED_NOT_CONFIGURED",
      }, 503);
    }

    const body = await req.json();
    const { code, phone_number_id, waba_id, display_name, coexistence_mode } = body as {
      code?: string;
      phone_number_id?: string;
      waba_id?: string;
      display_name?: string;
      coexistence_mode?: boolean;
    };

    if (!code || !phone_number_id || !waba_id) {
      return jsonResponse({
        error: "Missing code, phone_number_id or waba_id from Embedded Signup popup.",
      }, 400);
    }

    // ── 1) Troca code → access_token ──
    // O Embedded Signup retorna um BUSINESS access token tied to a System User
    // (long-lived). Pra trocar usamos o client_id (App ID) + client_secret (App Secret).
    const tokenUrl = new URL(`${GRAPH_BASE}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl.toString(), { method: "GET" });
    const tokenData = await readBody(tokenRes);

    if (!tokenRes.ok) {
      console.error("Token exchange failed:", tokenRes.status, tokenData);
      const metaErr = (tokenData as any)?.error?.message ?? `HTTP ${tokenRes.status}`;
      return jsonResponse({
        error: `Falha ao trocar código por token na Meta: ${metaErr}`,
        code: "TOKEN_EXCHANGE_FAILED",
        details: tokenData,
      }, 502);
    }

    const accessToken = (tokenData as any)?.access_token;
    if (!accessToken) {
      return jsonResponse({ error: "Meta não devolveu access_token", details: tokenData }, 502);
    }

    // ── 2) Busca info do número pra mostrar nome + telefone verificado ──
    let displayPhoneNumber = "";
    let verifiedName = "";
    let qualityRating = "";
    try {
      const infoRes = await fetch(
        `${GRAPH_BASE}/${phone_number_id}?fields=display_phone_number,verified_name,quality_rating`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (infoRes.ok) {
        const info = await infoRes.json();
        displayPhoneNumber = info.display_phone_number ?? "";
        verifiedName = info.verified_name ?? "";
        qualityRating = info.quality_rating ?? "";
      }
    } catch (e) {
      console.warn("Failed to fetch phone info:", e);
    }

    // ── 3) Registra webhook automaticamente na WABA ──
    // POST /{waba_id}/subscribed_apps → Meta vai começar a mandar webhooks pro nosso endpoint
    // (que foi configurado no app via Embedded Signup setup → Webhooks → Callback URL)
    let webhookRegistered = false;
    let webhookError: string | null = null;
    try {
      const subRes = await fetch(`${GRAPH_BASE}/${waba_id}/subscribed_apps`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (subRes.ok) {
        webhookRegistered = true;
      } else {
        const subErr = await readBody(subRes);
        webhookError = (subErr as any)?.error?.message ?? `HTTP ${subRes.status}`;
        console.warn("Webhook subscribe failed:", webhookError);
      }
    } catch (e) {
      webhookError = e instanceof Error ? e.message : "Unknown";
      console.error("Webhook subscribe exception:", e);
    }

    // ── 4) Persiste integration no banco ──
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const newConfig = {
      phone_number_id,
      business_account_id: waba_id,
      access_token: accessToken,
      display_phone_number: displayPhoneNumber,
      display_name: display_name?.trim() || verifiedName || "WhatsApp Cloud",
      webhook_verify_token: crypto.randomUUID(),
      embedded_signup: true,
      webhook_auto_registered: webhookRegistered,
      // Coexistence Mode: mesmo número usado simultaneamente no app WhatsApp
      // Business + Cloud API. Mensagens enviadas pelo app voltam como
      // smb_message_echoes no webhook. Limitações: sem OBA badge, devices
      // vinculados restritos (Windows/WearOS), WhatsApp Web do cliente para.
      coexistence_mode: !!coexistence_mode,
      signup_method: coexistence_mode ? "coexistence" : "embedded_signup",
    };

    // Se já existe integration pro mesmo phone_number_id no tenant, atualiza.
    const { data: existing } = await adminClient
      .from("integrations")
      .select("id")
      .eq("client_id", clientId)
      .eq("provider", "whatsapp_cloud")
      .eq("config->>phone_number_id", phone_number_id)
      .maybeSingle();

    let integrationId: string;
    if (existing) {
      const { data: updated, error } = await adminClient
        .from("integrations")
        .update({ status: "connected", config: newConfig })
        .eq("id", existing.id)
        .select("id")
        .single();
      if (error) return jsonResponse({ error: error.message }, 500);
      integrationId = updated.id;
    } else {
      const { data: inserted, error } = await adminClient
        .from("integrations")
        .insert({
          client_id: clientId,
          provider: "whatsapp_cloud",
          status: "connected",
          config: newConfig,
        })
        .select("id")
        .single();
      if (error) return jsonResponse({ error: error.message }, 500);
      integrationId = inserted.id;
    }

    return jsonResponse({
      success: true,
      integration_id: integrationId,
      display_phone_number: displayPhoneNumber,
      verified_name: verifiedName,
      quality_rating: qualityRating,
      webhook_auto_registered: webhookRegistered,
      webhook_error: webhookError,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("whatsapp-cloud-exchange-token error:", message);
    return jsonResponse({ error: message }, 500);
  }
});
