import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

import { corsHeaders } from "../_shared/cors.ts";

// Token pré-compartilhado configurado em Asaas → Configurações → Webhooks.
// Asaas envia esse valor no header `asaas-access-token` em todos os POST.
// Sem isso, qualquer um pode forjar evento PAYMENT_RECEIVED e creditar conta.
const ASAAS_WEBHOOK_TOKEN = Deno.env.get("ASAAS_WEBHOOK_TOKEN") ?? "";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ── Validação do token Asaas ──────────────────────────────────────────────
  // Se o secret não está configurado, recusa TODOS os requests pra evitar
  // aceitar webhooks sem proteção.
  if (!ASAAS_WEBHOOK_TOKEN) {
    console.error("[asaas-webhook] ASAAS_WEBHOOK_TOKEN not set — refusing");
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }
  const receivedToken = req.headers.get("asaas-access-token") ?? "";
  if (!timingSafeEqual(receivedToken, ASAAS_WEBHOOK_TOKEN)) {
    console.warn("[asaas-webhook] Invalid asaas-access-token");
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Asaas Webhook received:", body);

    const { event, payment } = body;

    // Asaas payment-confirmed event: PAYMENT_RECEIVED
    if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
      const externalId = payment.id;

      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // 1. Find the intent
      const { data: intent, error: intentError } = await adminClient
        .from("recharge_intents")
        .select("*")
        .eq("external_id", externalId)
        .single();

      if (intentError || !intent) {
        console.error("Intent not found for external_id:", externalId);
        return new Response(JSON.stringify({ error: "Intent not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (intent.status === "completed") {
        return new Response(JSON.stringify({ message: "Already processed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. Add credits atomically and mark intent as completed
      // Using an RPC or direct update. Since I created increment_client_credits function:
      const { error: rpcError } = await adminClient.rpc("increment_client_credits", {
        client_id_param: intent.client_id,
        amount_param: intent.credits_to_add,
      });

      if (rpcError) throw rpcError;

      const { error: updateError } = await adminClient
        .from("recharge_intents")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", intent.id);

      if (updateError) throw updateError;

      console.log(`Credits added successfully to client ${intent.client_id}: ${intent.credits_to_add}`);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ message: "Event ignored" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Webhook Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
