import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-id, content-type",
};

async function checkIntegrationHealth(
  adminClient: any,
  integration: any
): Promise<{ status: string; details: string }> {
  const config = integration.config || {};
  const provider = integration.provider;

  try {
    if (provider === "whatsapp") {
      // Evolution API health check
      const apiUrl = config.api_url;
      const apiKey = config.api_key;
      const instanceName = config.instance_name;

      if (!apiUrl || !apiKey || !instanceName) {
        return { status: "unconfigured", details: "Missing configuration" };
      }

      const response = await fetch(`${apiUrl}/instance/fetchInstances`, {
        method: "POST",
        headers: { apikey: apiKey },
        timeout: 5000,
      });

      if (!response.ok) {
        return { status: "unhealthy", details: `API error: ${response.status}` };
      }

      const data = await response.json();
      const instance = (data.data || []).find((i: any) => i.instanceName === instanceName);

      if (!instance) {
        return { status: "disconnected", details: "Instance not found" };
      }

      if (instance.state === "open") {
        return { status: "healthy", details: "Connected" };
      } else if (instance.state === "connecting") {
        return { status: "connecting", details: "Trying to connect" };
      } else {
        return { status: "disconnected", details: instance.state || "Unknown state" };
      }
    } else if (provider === "whatsapp_official") {
      // Meta Official API health check
      const accessToken = config.access_token;
      const phoneNumberId = config.phone_number_id;

      if (!accessToken || !phoneNumberId) {
        return { status: "unconfigured", details: "Missing configuration" };
      }

      const response = await fetch(
        `https://graph.facebook.com/v21.0/${phoneNumberId}?fields=display_phone_number,account_mode&access_token=${accessToken}`,
        { timeout: 5000 }
      );

      if (!response.ok) {
        if (response.status === 401) {
          return { status: "unhealthy", details: "Token expired or invalid" };
        }
        return { status: "unhealthy", details: `API error: ${response.status}` };
      }

      return { status: "healthy", details: "Connected" };
    }

    return { status: "unknown", details: "Unknown provider" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: "error", details: message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("Starting WhatsApp health check...");

    // Buscar integrações do WhatsApp
    const { data: integrations, error: fetchError } = await adminClient
      .from("integrations")
      .select("*")
      .or("provider.eq.whatsapp,provider.eq.whatsapp_official")
      .limit(100);

    if (fetchError) {
      throw new Error(`Failed to fetch integrations: ${fetchError.message}`);
    }

    if (!integrations || integrations.length === 0) {
      console.log("No WhatsApp integrations found");
      return new Response(
        JSON.stringify({ checked: 0, message: "No integrations" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Checking health of ${integrations.length} integrations`);

    // Check each integration
    const results: any[] = [];
    for (const integration of integrations) {
      try {
        const healthCheck = await checkIntegrationHealth(adminClient, integration);

        // Update integration with health status
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

        results.push({
          id: integration.id,
          provider: integration.provider,
          status: healthCheck.status,
          details: healthCheck.details,
        });

        console.log(
          `✓ ${integration.provider} (${integration.id}): ${healthCheck.status} - ${healthCheck.details}`
        );
      } catch (err) {
        console.error(`Health check failed for ${integration.id}:`, err);
        results.push({
          id: integration.id,
          provider: integration.provider,
          status: "error",
          details: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Log summary
    const healthy = results.filter((r) => r.status === "healthy").length;
    const unhealthy = results.filter((r) => ["unhealthy", "disconnected", "error"].includes(r.status)).length;

    console.log(`Health check complete: ${healthy} healthy, ${unhealthy} unhealthy`);

    return new Response(
      JSON.stringify({
        checked: results.length,
        healthy,
        unhealthy,
        results,
        success: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Health check error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message, success: false }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
