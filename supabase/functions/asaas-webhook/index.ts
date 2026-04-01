import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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
