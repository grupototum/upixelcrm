// WhatsApp Status Probe — endpoint público de monitoramento para uma integração específica.
// Retorna 200/healthy se a integração estiver conectada e saudável; 503/unhealthy caso contrário.
// Usado por health-checks externos (uptime monitors, load balancers, etc.).
// verify_jwt: false — endpoint público de probe.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const INTEGRATION_ID = 'e0f8ee49-b538-46eb-9aaf-062515657572';
const FAILURE_THRESHOLD = 3; // considera unhealthy após 3 falhas consecutivas

Deno.serve(async (_req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data, error } = await supabase
      .from('integrations')
      .select('id, provider, status, health_status, consecutive_failures, updated_at')
      .eq('id', INTEGRATION_ID)
      .single();

    if (error || !data) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Integration not found',
          integration_id: INTEGRATION_ID,
          timestamp: new Date().toISOString(),
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const isUnhealthy =
      data.health_status === 'unhealthy' ||
      data.status !== 'connected' ||
      data.consecutive_failures >= FAILURE_THRESHOLD;

    const httpStatus = isUnhealthy ? 503 : 200;
    const probeStatus = isUnhealthy ? 'unhealthy' : 'healthy';

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
      { status: httpStatus, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        status: 'error',
        message: String(err),
        timestamp: new Date().toISOString(),
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
