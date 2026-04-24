/**
 * Meta Lead Ads Webhook
 *
 * Receives real-time lead gen form submissions from Meta (Facebook/Instagram).
 * Creates/updates leads in the CRM with full campaign attribution.
 *
 * Setup in Meta Business Manager:
 *   - Event: leadgen
 *   - Webhook URL: {SUPABASE_URL}/functions/v1/meta-leads-webhook
 *   - Verify Token: stored in integrations.config.webhook_verify_token (provider=meta_ads)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

const META_API = "https://graph.facebook.com/v20.0";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  // Meta verification handshake (GET)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe") {
      // Look up any tenant whose verify token matches
      const { data: ints } = await admin.from("integrations")
        .select("client_id, config")
        .eq("provider", "meta_ads");

      const match = (ints ?? []).find((i) => {
        const cfg = i.config as { webhook_verify_token?: string } | null;
        return cfg?.webhook_verify_token === token;
      });

      if (match) {
        return new Response(challenge, { status: 200 });
      }
      return new Response("Forbidden", { status: 403 });
    }
    return new Response("OK", { status: 200 });
  }

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  try {
    const body = await req.json();

    // Meta sends an array of entry objects
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "leadgen") continue;
        const value = change.value;

        // Find tenant by page_id
        const pageId = value.page_id ?? entry.id;
        const adId = value.ad_id;
        const adsetId = value.adset_id;
        const campaignId = value.campaign_id;
        const formId = value.form_id;
        const leadId = value.leadgen_id;

        // Find matching tenant by Meta Ads integration with this page
        const { data: integrations } = await admin.from("integrations")
          .select("client_id, config, access_token")
          .eq("provider", "meta_ads");

        let clientId: string | null = null;
        let accessToken: string | null = null;

        for (const int of integrations ?? []) {
          const cfg = int.config as { page_id?: string; ad_account_id?: string } | null;
          // Match by page_id if configured, else use first tenant with token
          if (cfg?.page_id === pageId || !cfg?.page_id) {
            clientId = int.client_id;
            accessToken = int.access_token;
            break;
          }
        }

        if (!clientId || !accessToken) continue;

        // Fetch lead details from Meta
        const leadRes = await fetch(
          `${META_API}/${leadId}?access_token=${accessToken}`
        );
        const leadData = await leadRes.json();
        if (leadData.error) continue;

        // Parse field_data array into an object
        const fields: Record<string, string> = {};
        for (const f of leadData.field_data ?? []) {
          fields[f.name] = Array.isArray(f.values) ? f.values[0] : f.values;
        }

        // Fetch campaign name for attribution
        let campaignName = campaignId;
        if (campaignId && accessToken) {
          try {
            const campRes = await fetch(`${META_API}/${campaignId}?fields=name&access_token=${accessToken}`);
            const campData = await campRes.json();
            if (campData.name) campaignName = campData.name;
          } catch (_) { /* ignore */ }
        }

        // Find or create lead
        const phone = fields.phone_number ?? fields.phone ?? null;
        const email = fields.email ?? null;
        const name = [fields.full_name, fields.first_name, fields.last_name].filter(Boolean).join(" ") || phone || email || "Lead Meta Ads";

        let existingLeadId: string | null = null;

        if (phone) {
          const normalized = phone.replace(/\D/g, "");
          const suffix = normalized.slice(-8);
          const { data: existing } = await admin.from("leads")
            .select("id").eq("client_id", clientId)
            .ilike("phone", `%${suffix}%`)
            .order("created_at", { ascending: true }).limit(1);
          if (existing?.[0]) existingLeadId = existing[0].id;
        }

        if (!existingLeadId && email) {
          const { data: existing } = await admin.from("leads")
            .select("id").eq("client_id", clientId).ilike("email", email).limit(1);
          if (existing?.[0]) existingLeadId = existing[0].id;
        }

        // Get first pipeline column
        const { data: firstCol } = await admin.from("pipeline_columns")
          .select("id").eq("client_id", clientId)
          .order("order", { ascending: true }).limit(1).maybeSingle();

        if (!firstCol) continue;

        const attribution = {
          utm_source: "facebook",
          utm_medium: "paid_social",
          utm_campaign: campaignName ?? null,
          ad_campaign_id: campaignId ?? null,
          ad_adset_id: adsetId ?? null,
          ad_id: adId ?? null,
        };

        if (existingLeadId) {
          // Update attribution on existing lead
          await admin.from("leads").update(attribution).eq("id", existingLeadId);
        } else {
          // Create new lead
          const { data: newLead } = await admin.from("leads").insert({
            client_id: clientId,
            name,
            phone: phone ?? null,
            email: email ?? null,
            column_id: firstCol.id,
            origin: "meta_ads",
            tags: ["meta-lead-ads", campaignName ? `campanha:${campaignName}` : "facebook"].filter(Boolean),
            ...attribution,
            custom_fields: {
              ...Object.fromEntries(
                Object.entries(fields).filter(([k]) => !["phone_number", "phone", "email", "full_name", "first_name", "last_name"].includes(k))
              ),
              meta_form_id: formId,
              meta_lead_id: leadId,
            },
          }).select("id").single();

          if (newLead) {
            // Record timeline event
            await admin.from("timeline_events").insert({
              lead_id: newLead.id,
              type: "automation",
              content: `Lead capturado via Meta Lead Ads — Campanha: ${campaignName ?? campaignId ?? "Desconhecida"}`,
            });
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("meta-leads-webhook error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
