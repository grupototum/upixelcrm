import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

import { corsHeaders } from "../_shared/cors.ts";

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
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!ASAAS_API_KEY) {
      return new Response(JSON.stringify({ error: "Serviço de pagamento não configurado (ASAAS_API_KEY)" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Create or Find Customer in Asaas
    let asaasCustomerId = null;
    const searchRes = await fetch(`${ASAAS_API_URL}/customers?email=${encodeURIComponent(profile.email)}`, {
      headers: { "access_token": ASAAS_API_KEY }
    });
    const searchData = await searchRes.json();
    
    if (searchData?.data?.length > 0) {
      asaasCustomerId = searchData.data[0].id;
    } else {
      const createCustRes = await fetch(`${ASAAS_API_URL}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "access_token": ASAAS_API_KEY },
        body: JSON.stringify({
          name: profile.name || "Cliente Upixel",
          email: profile.email,
          externalReference: profile.client_id,
        })
      });
      const createCustData = await createCustRes.json();
      if (!createCustRes.ok) {
        return new Response(JSON.stringify({ error: "Erro ao criar cliente no Asaas", details: createCustData }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      asaasCustomerId = createCustData.id;
    }
    
    // 2. Create Payment in Asaas (Pix)
    const asaasResponse = await fetch(`${ASAAS_API_URL}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": ASAAS_API_KEY,
      },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: "PIX",
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
        status: 200,
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
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
