// WhatsApp Health Check
// Triggered by Supabase Cron — verifica saúde de todas as integrações WhatsApp.
// verify_jwt: false — função interna de cron, autentica internamente via SUPABASE_SERVICE_ROLE_KEY.
// Suporta providers: whatsapp (Evolution), whatsapp_official, whatsapp_cloud.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function checkIntegrationHealth(
  integration: any
): Promise<{ status: string; details: string }> {
  const config = integration.config || {};
  const provider = integration.provider;

  try {
    if (provider === "whatsapp") {
      const { api_url, api_key, instance_name } = config;
      if (!api_url || !api_key || !instance_name) {
        return { status: "unconfigured", details: "Missing configuration" };
      }
      const response = await fetchWithTimeout(`${api_url}/instance/fetchInstances`, {
        method: "POST",
        headers: { apikey: api_key },
      });
      if (!response.ok) return { status: "unhealthy", details: `API error: ${response.status}` };
      const data = await response.json();
      const instance = (data.data || []).find((i: any) => i.instanceName === instance_name);
      if (!instance) return { status: "disconnected", details: "Instance not found" };
      if (instance.state === "open") return { status: "healthy", details: "Connected" };
      if (instance.state === "connecting") return { status: "connecting", details: "Trying to connect" };
      return { status: "disconnected", details: instance.state || "Unknown state" };
    }

    if (provider === "whatsapp_official" || provider === "whatsapp_cloud") {
      const accessToken = config.access_token;
      const phoneNumberId = config.phone_number_id;
      if (!accessToken || !phoneNumberId) {
        return { status: "unconfigured", details: "Missing access_token or phone_number_id" };
      }
      const response = await fetchWithTimeout(
        `https://graph.facebook.com/v22.0/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,status`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!response.ok) {
        if (response.status === 401) return { status: "unhealthy", details: "Token expirado ou inválido (401)" };
        return { status: "unhealthy", details: `Meta API error: ${response.status}` };
      }
      const data = await response.json();
      if (data.error) return { status: "unhealthy", details: data.error.message ?? "Meta API error" };
      const quality = data.quality_rating ?? "UNKNOWN";
      const numStatus = data.status ?? "CONNECTED";
      if (numStatus === "CONNECTED" || numStatus === "FLAGGED") {
        return { status: "healthy", details: `Connected — quality: ${quality}` };
      }
      return { status: "disconnected", details: `Status: ${numStatus}` };
    }

    return { status: "unknown", details: `Provider '${provider}' não suportado` };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("AbortError") || message.includes("abort")) {
      return { status: "unhealthy", details: "Timeout ao conectar" };
    }
    return { status: "error", details: message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Gatilho interno de cron: rejeita anon key (pública) e chamadas sem credencial.
  const cronBearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!cronBearer || cronBearer === (Deno.env.get("SUPABASE_ANON_KEY") ?? "")) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 403,
    });
  }

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("Starting WhatsApp health check...");

    const { data: integrations, error: fetchError } = await adminClient
      .from("integrations")
      .select("*")
      .or("provider.eq.whatsapp,provider.eq.whatsapp_official,provider.eq.whatsapp_cloud")
      .limit(100);

    if (fetchError) throw new Error(`Failed to fetch integrations: ${fetchError.message}`);

    if (!integrations || integrations.length === 0) {
      return new Response(
        JSON.stringify({ checked: 0, message: "No integrations" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Checking health of ${integrations.length} integrations`);

    const results: any[] = [];
    for (const integration of integrations) {
      try {
        const healthCheck = await checkIntegrationHealth(integration);
        const isHealthy = healthCheck.status === "healthy";
        const newConsecutiveFailures = isHealthy ? 0 : (integration.consecutive_failures || 0) + 1;

        await adminClient
          .from("integrations")
          .update({
            health_status: healthCheck.status,
            last_heartbeat: new Date().toISOString(),
            consecutive_failures: newConsecutiveFailures,
          })
          .eq("id", integration.id);

        results.push({ id: integration.id, provider: integration.provider, status: healthCheck.status, details: healthCheck.details });
        console.log(`✓ ${integration.provider} (${integration.id.slice(0,8)}): ${healthCheck.status} — ${healthCheck.details}`);
      } catch (err) {
        console.error(`Health check failed for ${integration.id}:`, err);
        results.push({ id: integration.id, provider: integration.provider, status: "error", details: err instanceof Error ? err.message : String(err) });
      }
    }

    const healthy = results.filter((r) => r.status === "healthy").length;
    const unhealthy = results.filter((r) => ["unhealthy", "disconnected", "error"].includes(r.status)).length;
    console.log(`Health check complete: ${healthy} healthy, ${unhealthy} unhealthy`);

    return new Response(
      JSON.stringify({ checked: results.length, healthy, unhealthy, results, success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Health check error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message, success: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
