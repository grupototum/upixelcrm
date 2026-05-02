import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

const META_API = "https://graph.facebook.com/v20.0";

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

    // ── Helper: load stored Meta Ads credentials ──────────────────
    const getCreds = async () => {
      const { data } = await admin.from("integrations")
        .select("config, status, access_token, token_expires_at")
        .eq("client_id", clientId)
        .eq("provider", "meta_ads")
        .maybeSingle();
      const cfg = data?.config as { ad_account_id?: string } | null;
      return {
        accessToken: data?.access_token ?? null,
        adAccountId: cfg?.ad_account_id ?? null,
        status: data?.status ?? "disconnected",
        tokenExpiresAt: data?.token_expires_at ?? null,
      };
    };

    // ── save-credentials ─────────────────────────────────────────
    if (action === "save-credentials") {
      const body = await req.json();
      const { access_token, ad_account_id } = body;
      if (!access_token || !ad_account_id) return json({ error: "access_token e ad_account_id são obrigatórios" }, 400);

      // Validate the token by calling the Meta API
      const normalize = (id: string) => id.startsWith("act_") ? id : `act_${id}`;
      const normalId = normalize(ad_account_id);

      const testRes = await fetch(
        `${META_API}/${normalId}?fields=id,name,currency,account_status&access_token=${access_token}`
      );
      const testData = await testRes.json();
      if (testData.error) return json({ error: `Meta API: ${testData.error.message}` }, 400);

      const tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
      await admin.from("integrations").upsert(
        {
          client_id: clientId,
          provider: "meta_ads",
          status: "connected",
          access_token,
          token_expires_at: tokenExpiresAt,
          config: {
            ad_account_id: normalId,
            account_name: testData.name,
            currency: testData.currency,
          },
        },
        { onConflict: "client_id,provider" }
      );
      return json({ success: true, account_name: testData.name, currency: testData.currency });
    }

    // ── status ────────────────────────────────────────────────────
    if (action === "status") {
      const creds = await getCreds();
      return json(creds);
    }

    // ── disconnect ────────────────────────────────────────────────
    if (action === "disconnect") {
      await admin.from("integrations")
        .update({ status: "disconnected", access_token: null })
        .eq("client_id", clientId).eq("provider", "meta_ads");
      return json({ success: true });
    }

    // ── All remaining actions need valid credentials ───────────────
    const creds = await getCreds();
    if (!creds.accessToken || !creds.adAccountId) {
      return json({ error: "Credenciais Meta Ads não configuradas" }, 400);
    }
    const { accessToken, adAccountId } = creds;

    // ── campaigns: list campaigns with basic info ─────────────────
    if (action === "campaigns") {
      const fields = "id,name,status,objective,effective_status,daily_budget,lifetime_budget,start_time,stop_time";
      const res = await fetch(
        `${META_API}/${adAccountId}/campaigns?fields=${fields}&limit=100&access_token=${accessToken}`
      );
      const data = await res.json();
      if (data.error) return json({ error: data.error.message }, 400);
      return json({ campaigns: data.data ?? [] });
    }

    // ── insights: campaign metrics for a date range ───────────────
    if (action === "insights") {
      const body = req.method === "POST" ? await req.json() : {};
      const since = body.since ?? url.searchParams.get("since") ?? thirtyDaysAgo();
      const until = body.until ?? url.searchParams.get("until") ?? today();

      const fields = [
        "campaign_id", "campaign_name", "adset_id", "adset_name",
        "spend", "impressions", "clicks", "reach",
        "cpc", "ctr", "cpm", "cpp",
        "actions", "action_values", "conversions",
        "cost_per_unique_click",
      ].join(",");

      const timeRange = JSON.stringify({ since, until });
      const res = await fetch(
        `${META_API}/${adAccountId}/insights?fields=${fields}&time_range=${encodeURIComponent(timeRange)}&level=campaign&limit=200&access_token=${accessToken}`
      );
      const data = await res.json();
      if (data.error) return json({ error: data.error.message }, 400);
      return json({ insights: data.data ?? [], since, until });
    }

    // ── sync: fetch + store to ad_campaigns table ─────────────────
    if (action === "sync") {
      const body = req.method === "POST" ? await req.json() : {};
      const since = body.since ?? thirtyDaysAgo();
      const until = body.until ?? today();

      // Fetch campaigns list
      const campRes = await fetch(
        `${META_API}/${adAccountId}/campaigns?fields=id,name,status,objective,effective_status,daily_budget,lifetime_budget,start_time,stop_time&limit=200&access_token=${accessToken}`
      );
      const campData = await campRes.json();
      if (campData.error) {
        const isOAuth = campData.error.type === "OAuthException" || campData.error.code === 190;
        return json({ error: campData.error.message, token_expired: isOAuth }, 400);
      }
      const campaigns: any[] = campData.data ?? [];

      // Fetch insights
      const fields = "campaign_id,spend,impressions,clicks,reach,cpc,ctr,cpm,actions,action_values,conversions,cost_per_unique_click";
      const insRes = await fetch(
        `${META_API}/${adAccountId}/insights?fields=${fields}&time_range=${encodeURIComponent(JSON.stringify({ since, until }))}&level=campaign&limit=200&access_token=${accessToken}`
      );
      const insData = await insRes.json();
      const insights: any[] = insData.data ?? [];

      // Map insights by campaign_id
      const insightMap = new Map<string, any>();
      for (const ins of insights) insightMap.set(ins.campaign_id, ins);

      // Upsert each campaign
      const upserts = campaigns.map((c) => {
        const ins = insightMap.get(c.id) ?? {};
        const leads = extractAction(ins.actions, "lead") + extractAction(ins.actions, "onsite_conversion.messaging_first_reply");
        const revenue = extractActionValue(ins.action_values, "offsite_conversion.fb_pixel_purchase");
        const spend = parseFloat(ins.spend ?? "0");
        const leadCount = leads;
        return {
          client_id: clientId,
          platform: "meta",
          external_id: c.id,
          name: c.name,
          status: (c.effective_status ?? c.status ?? "").toLowerCase(),
          objective: c.objective ?? null,
          budget_daily: c.daily_budget ? parseFloat(c.daily_budget) / 100 : null,
          budget_lifetime: c.lifetime_budget ? parseFloat(c.lifetime_budget) / 100 : null,
          start_date: c.start_time ? c.start_time.split("T")[0] : null,
          end_date: c.stop_time ? c.stop_time.split("T")[0] : null,
          spend,
          impressions: parseInt(ins.impressions ?? "0"),
          clicks: parseInt(ins.clicks ?? "0"),
          reach: parseInt(ins.reach ?? "0"),
          cpc: parseFloat(ins.cpc ?? "0"),
          ctr: parseFloat(ins.ctr ?? "0"),
          cpm: parseFloat(ins.cpm ?? "0"),
          conversions: parseFloat(ins.conversions ?? "0"),
          leads_count: leadCount,
          cost_per_lead: leadCount > 0 ? spend / leadCount : 0,
          revenue,
          raw_data: c,
          date_range: { since, until },
          synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      });

      if (upserts.length > 0) {
        await admin.from("ad_campaigns").upsert(upserts, { onConflict: "client_id,platform,external_id" });
      }

      return json({ synced: upserts.length, since, until });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("meta-ads error:", msg);
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

function extractAction(actions: any[], type: string): number {
  if (!Array.isArray(actions)) return 0;
  const match = actions.find((a) => a.action_type === type);
  return match ? parseFloat(match.value ?? "0") : 0;
}

function extractActionValue(actionValues: any[], type: string): number {
  if (!Array.isArray(actionValues)) return 0;
  const match = actionValues.find((a) => a.action_type === type);
  return match ? parseFloat(match.value ?? "0") : 0;
}
