import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASAAS_API_URL = Deno.env.get("ASAAS_API_URL") || "https://sandbox.asaas.com/api/v3";
const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase.from("profiles").select("client_id, name, email").eq("id", user.id).single();
    if (!profile) throw new Error("Profile not found");

    const body = await req.json();
    const { amount, creditsToIndicate } = body;

    if (!amount || amount < 5) {
      return new Response(JSON.stringify({ error: "Valor mínimo R$ 5,00" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!ASAAS_API_KEY) {
      return new Response(JSON.stringify({ error: "Serviço de pagamento não configurado (ASAAS_API_KEY)" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Create a customer in Asaas (or find existing)
    // For simplicity, we create a one-off payment without linking to a specific asaas customer ID first, 
    // or we can just send the customer data in the payment request.
    
    // 2. Create Payment in Asaas (Pix)
    const asaasResponse = await fetch(`${ASAAS_API_URL}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": ASAAS_API_KEY,
      },
      body: JSON.stringify({
        billingType: "PIX",
        name: profile.name,
        email: profile.email,
        value: amount,
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().split('T')[0], // 24h from now
        description: `Recarga de ${creditsToIndicate} créditos - Upixel CRM`,
        externalReference: profile.client_id,
      }),
    });

    const asaasData = await asaasResponse.json();

    if (!asaasResponse.ok) {
      console.error("Asaas Error:", asaasData);
      return new Response(JSON.stringify({ error: "Erro ao gerar pagamento no Asaas", details: asaasData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Get Pix QR Code / Copy and Paste
    const pixResponse = await fetch(`${ASAAS_API_URL}/payments/${asaasData.id}/pixQrCode`, {
      headers: { "access_token": ASAAS_API_KEY },
    });
    const pixData = await pixResponse.json();

    // 4. Save Intent in DB
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: intent, error: intentError } = await adminClient.from("recharge_intents").insert({
      client_id: profile.client_id,
      amount: amount,
      credits_to_add: creditsToIndicate,
      status: "pending",
      external_id: asaasData.id,
      payment_link: asaasData.invoiceUrl,
    }).select().single();

    if (intentError) throw intentError;

    return new Response(JSON.stringify({
      id: asaasData.id,
      pix: pixData,
      invoiceUrl: asaasData.invoiceUrl,
      intentId: intent.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
