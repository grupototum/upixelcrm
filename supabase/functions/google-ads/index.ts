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
      return {
        developerToken: cfg?.developer_token ?? null,
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

    // ── save-credentials ──────────────────────────────────────────
    if (action === "save-credentials") {
      const body = await req.json();
      const { developer_token, customer_id } = body;
      if (!developer_token || !customer_id) return json({ error: "developer_token e customer_id são obrigatórios" }, 400);

      const normalId = customer_id.replace(/-/g, "");

      // Validate: try to list accessible customers
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
            developer_token,
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
