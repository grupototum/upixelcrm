// WhatsApp Status Probe — endpoint público para monitoramento externo
// (uptime monitors, load balancers) de uma integração WhatsApp específica.
//
// v2: integration_id agora vem por query param em vez de hardcoded no source.
// Mantém retrocompatibilidade com o consumidor antigo (default = master probe).
//
// Retorna 200 + status=healthy quando a integration estiver "connected" e
// health_status != "unhealthy". Caso contrário 503.
//
// Uso:
//   GET /functions/v1/whatsapp-status-probe?integration_id=<uuid>
//
// Rate limit: implícito do Supabase Edge (~ 100 req/min por IP).

import { createClient } from "jsr:@supabase/supabase-js@2";

const FAILURE_THRESHOLD = 3;

Deno.serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    // v3: integration_id é obrigatório — o default hardcoded expunha o status
    // de um tenant real num endpoint público sem auth.
    const integrationId = url.searchParams.get("integration_id");
    if (!integrationId) {
      return new Response(
        JSON.stringify({ status: "error", message: "integration_id query param is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Valida formato UUID v4 antes de tocar no banco — evita SQL injection
    // via param mesmo com client supabase (defense-in-depth).
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(integrationId)) {
      return new Response(
        JSON.stringify({ status: "error", message: "Invalid integration_id format" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("integrations")
      .select("id, provider, status, health_status, consecutive_failures, updated_at")
      .eq("id", integrationId)
      .single();

    if (error || !data) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Integration not found",
          // Não retorna o integration_id pesquisado — evita exposure
          // de IDs internos via response a probes não autorizados.
          timestamp: new Date().toISOString(),
        }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      );
    }

    const isUnhealthy =
      data.health_status === "unhealthy" ||
      data.status !== "connected" ||
      data.consecutive_failures >= FAILURE_THRESHOLD;

    const httpStatus = isUnhealthy ? 503 : 200;
    const probeStatus = isUnhealthy ? "unhealthy" : "healthy";

    return new Response(
      JSON.stringify({
        status: probeStatus,
        provider: data.provider,
        integration_status: data.status,
        health_status: data.health_status,
        consecutive_failures: data.consecutive_failures,
        last_updated: data.updated_at,
        timestamp: new Date().toISOString(),
      }),
      { status: httpStatus, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        status: "error",
        message: String(err),
        timestamp: new Date().toISOString(),
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }
});
