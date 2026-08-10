import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

const GOOGLE_ADS_API = "https://googleads.googleapis.com/v17";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: { user }, error: uErr } = await supabase.auth.getUser();
    if (uErr || !user) return json({ error: "Unauthorized" }, 401);

    const { data: profile } = await supabase.from("profiles").select("client_id").eq("id", user.id).single();
    if (!profile) return json({ error: "Profile not found" }, 404);
    const clientId = profile.client_id;

    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "";

    // ── Helper: get stored Google Ads credentials ──────────────────
    const getCreds = async () => {
      const { data } = await admin.from("integrations")
        .select("config, status")
        .eq("client_id", clientId)
        .eq("provider", "google_ads")
        .maybeSingle();
      const cfg = data?.config as { developer_token?: string; customer_id?: string } | null;
      // Developer token: prefere shared via env (recomendado pro modo gerenciado),
      // fallback pro per-tenant (caso o cliente tenha seu próprio MCC).
      const developerToken = cfg?.developer_token ?? Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN") ?? null;
      return {
        developerToken,
        customerId: cfg?.customer_id ?? null,
        status: data?.status ?? "disconnected",
      };
    };

    // ── Helper: get valid Google OAuth access token ────────────────
    const getGoogleToken = async (): Promise<string | null> => {
      const { data: gIntegration } = await admin.from("integrations")
        .select("access_token, refresh_token, token_expires_at, config")
        .eq("client_id", clientId).eq("provider", "google").maybeSingle();

      if (!gIntegration?.access_token) return null;

      // Refresh if expired
      if (gIntegration.token_expires_at && new Date(gIntegration.token_expires_at) <= new Date()) {
        if (!gIntegration.refresh_token) return null;

        const { data: credsRow } = await admin.from("integrations")
          .select("config").eq("client_id", clientId).eq("provider", "google_credentials").maybeSingle();
        const cfg = credsRow?.config as { google_client_id?: string; google_client_secret?: string } | null;
        const googleClientId = cfg?.google_client_id ?? Deno.env.get("GOOGLE_CLIENT_ID");
        const googleClientSecret = cfg?.google_client_secret ?? Deno.env.get("GOOGLE_CLIENT_SECRET");
        if (!googleClientId || !googleClientSecret) return null;

        const rr = await fetch(GOOGLE_TOKEN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: googleClientId,
            client_secret: googleClientSecret,
            refresh_token: gIntegration.refresh_token,
            grant_type: "refresh_token",
          }),
        });
        const rd = await rr.json();
        if (rd.error) return null;
        await admin.from("integrations").update({
          access_token: rd.access_token,
          token_expires_at: new Date(Date.now() + rd.expires_in * 1000).toISOString(),
        }).eq("client_id", clientId).eq("provider", "google");
        return rd.access_token;
      }

      return gIntegration.access_token;
    };

    // ── list-customers ────────────────────────────────────────────
    // Lista as Google Ads customer IDs que o usuário OAuth tem acesso.
    // Usado pra povoar dropdown de "qual conta conectar?" antes do save-credentials.
    if (action === "list-customers") {
      const accessToken = await getGoogleToken();
      if (!accessToken) {
        return json({
          error: "Conecte o Google OAuth com scope adwords primeiro (Integrações > Google).",
          code: "NO_GOOGLE_OAUTH",
        }, 400);
      }

      // developer_token: shared via env var (preferred) OU enviado pelo client (fallback).
      const body = await req.json().catch(() => ({}));
      const developerToken = (body.developer_token as string | undefined)
        ?? Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN");
      if (!developerToken) {
        return json({
          error: "Developer Token do Google Ads não configurado. Adicione GOOGLE_ADS_DEVELOPER_TOKEN no Supabase ou informe manualmente.",
          code: "NO_DEVELOPER_TOKEN",
        }, 400);
      }

      // 1) Lista resources name dos customers acessíveis (formato: "customers/1234567890")
      const listRes = await fetch(`${GOOGLE_ADS_API}/customers:listAccessibleCustomers`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "developer-token": developerToken,
        },
      });
      const listData = await listRes.json();
      if (!listRes.ok || listData.error) {
        return json({
          error: `Google Ads API: ${listData.error?.message ?? `HTTP ${listRes.status}`}`,
          details: listData,
        }, 502);
      }
      const resourceNames: string[] = listData.resourceNames ?? [];
      const customerIds = resourceNames.map((r: string) => r.replace("customers/", ""));

      if (customerIds.length === 0) {
        return json({
          customers: [],
          warning: "Nenhuma conta Google Ads vinculada a este usuário. Crie/vincule uma em ads.google.com.",
        });
      }

      // 2) Pra cada customer ID, busca descriptiveName + currencyCode (best effort)
      const customers = await Promise.all(customerIds.map(async (id: string) => {
        try {
          const cRes = await fetch(`${GOOGLE_ADS_API}/customers/${id}`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "developer-token": developerToken,
            },
          });
          if (!cRes.ok) return { id, name: "", currency: "", manager: false };
          const cData = await cRes.json();
          return {
            id,
            name: cData.customer?.descriptiveName ?? "",
            currency: cData.customer?.currencyCode ?? "",
            manager: cData.customer?.manager === true,
            test_account: cData.customer?.testAccount === true,
          };
        } catch {
          return { id, name: "", currency: "", manager: false };
        }
      }));

      return json({ customers, developer_token_source: body.developer_token ? "client" : "env" });
    }

    // ── save-credentials ──────────────────────────────────────────
    if (action === "save-credentials") {
      const body = await req.json();
      const { customer_id } = body;
      // developer_token vem do body (modo manual avançado) OU do env (shared, modo automático)
      const developer_token = (body.developer_token as string | undefined)
        ?? Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN");

      if (!customer_id) return json({ error: "customer_id é obrigatório" }, 400);
      if (!developer_token) {
        return json({
          error: "Developer Token não configurado. Adicione GOOGLE_ADS_DEVELOPER_TOKEN no Supabase ou informe manualmente.",
          code: "NO_DEVELOPER_TOKEN",
        }, 400);
      }

      const normalId = (customer_id as string).replace(/-/g, "");

      // Validate: try to fetch this specific customer
      const accessToken = await getGoogleToken();
      if (!accessToken) return json({ error: "Conecte o Google OAuth primeiro (Integrações > Google)" }, 400);

      const testRes = await fetch(`${GOOGLE_ADS_API}/customers/${normalId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "developer-token": developer_token,
        },
      });
      const testData = await testRes.json();
      if (testData.error) return json({ error: `Google Ads API: ${JSON.stringify(testData.error)}` }, 400);

      await admin.from("integrations").upsert(
        {
          client_id: clientId,
          provider: "google_ads",
          status: "connected",
          config: {
            // developer_token só vai pro DB se for per-tenant (informado manualmente).
            // Quando vem do env, não persiste — fica sempre atualizado pelo Supabase secret.
            ...(body.developer_token ? { developer_token: body.developer_token } : {}),
            customer_id: normalId,
            descriptive_name: testData.customer?.descriptiveName ?? null,
            currency_code: testData.customer?.currencyCode ?? null,
          },
        },
        { onConflict: "client_id,provider" }
      );
      return json({
        success: true,
        descriptive_name: testData.customer?.descriptiveName,
        currency_code: testData.customer?.currencyCode,
      });
    }

    // ── status ────────────────────────────────────────────────────
    if (action === "status") {
      const creds = await getCreds();
      const googleToken = await getGoogleToken();
      return json({ ...creds, google_oauth_connected: !!googleToken });
    }

    // ── disconnect ────────────────────────────────────────────────
    if (action === "disconnect") {
      await admin.from("integrations")
        .update({ status: "disconnected" })
        .eq("client_id", clientId).eq("provider", "google_ads");
      return json({ success: true });
    }

    // ── All remaining actions need credentials ────────────────────
    const creds = await getCreds();
    if (!creds.developerToken || !creds.customerId) {
      return json({ error: "Credenciais Google Ads não configuradas" }, 400);
    }

    const accessToken = await getGoogleToken();
    if (!accessToken) return json({ error: "Token Google OAuth expirado — reconecte em Integrações > Google" }, 401);

    const adsHeaders = {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": creds.developerToken,
      "Content-Type": "application/json",
    };

    // ── insights / campaigns / sync ───────────────────────────────
    if (action === "campaigns" || action === "insights" || action === "sync") {
      const query = `
        SELECT
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type,
          campaign.start_date,
          campaign.end_date,
          campaign_budget.amount_micros,
          metrics.cost_micros,
          metrics.impressions,
          metrics.clicks,
          metrics.ctr,
          metrics.average_cpc,
          metrics.conversions,
          metrics.cost_per_conversion,
          metrics.search_impression_share
        FROM campaign
        WHERE segments.date DURING LAST_30_DAYS
          AND campaign.status != 'REMOVED'
        ORDER BY metrics.cost_micros DESC
        LIMIT 100
      `;

      const res = await fetch(
        `${GOOGLE_ADS_API}/customers/${creds.customerId}/googleAds:search`,
        { method: "POST", headers: adsHeaders, body: JSON.stringify({ query }) }
      );
      const data = await res.json();
      if (data.error) return json({ error: JSON.stringify(data.error) }, 400);

      const rows: any[] = data.results ?? [];

      // Normalize rows
      const campaigns = rows.map((r) => {
        const camp = r.campaign ?? {};
        const budget = r.campaignBudget ?? {};
        const metrics = r.metrics ?? {};
        const spend = parseInt(metrics.costMicros ?? "0") / 1_000_000;
        const impressions = parseInt(metrics.impressions ?? "0");
        const clicks = parseInt(metrics.clicks ?? "0");
        const ctr = parseFloat(metrics.ctr ?? "0") * 100;
        const avgCpc = parseInt(metrics.averageCpc ?? "0") / 1_000_000;
        const conversions = parseFloat(metrics.conversions ?? "0");
        const budgetAmount = parseInt(budget.amountMicros ?? "0") / 1_000_000;

        return {
          id: camp.id,
          name: camp.name,
          status: camp.status,
          channelType: camp.advertisingChannelType,
          startDate: camp.startDate,
          endDate: camp.endDate,
          budgetDaily: budgetAmount,
          spend,
          impressions,
          clicks,
          ctr,
          cpc: avgCpc,
          conversions,
          costPerConversion: conversions > 0 ? spend / conversions : 0,
          cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
        };
      });

      if (action === "sync") {
        const upserts = campaigns.map((c) => ({
          client_id: clientId,
          platform: "google",
          external_id: String(c.id),
          name: c.name,
          status: mapGoogleStatus(c.status),
          channel_type: c.channelType,
          budget_daily: c.budgetDaily,
          start_date: c.startDate || null,
          end_date: c.endDate || null,
          spend: c.spend,
          impressions: c.impressions,
          clicks: c.clicks,
          ctr: c.ctr,
          cpc: c.cpc,
          cpm: c.cpm,
          conversions: c.conversions,
          cost_per_lead: c.costPerConversion,
          raw_data: {},
          date_range: { since: thirtyDaysAgo(), until: today() },
          synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        if (upserts.length > 0) {
          await admin.from("ad_campaigns").upsert(upserts, { onConflict: "client_id,platform,external_id" });
        }
        return json({ synced: upserts.length });
      }

      return json({ campaigns, total: campaigns.length });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("google-ads error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function today() {
  return new Date().toISOString().split("T")[0];
}
function thirtyDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split("T")[0];
}
function mapGoogleStatus(s: string): string {
  if (s === "ENABLED") return "active";
  if (s === "PAUSED") return "paused";
  return "ended";
}
