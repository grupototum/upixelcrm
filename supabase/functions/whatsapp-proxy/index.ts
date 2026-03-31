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

    const userId = user.id;
    const { data: profile } = await supabase.from("profiles").select("client_id").eq("id", userId).single();
    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientId = profile.client_id;
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "save-config") {
      const body = await req.json();
      const { api_url, instance_name, api_key } = body;

      if (!api_url || !instance_name || !api_key) {
        return new Response(JSON.stringify({ error: "Missing fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await adminClient.from("integrations").upsert(
        {
          client_id: clientId,
          provider: "whatsapp",
          status: "configured",
          config: { api_url, instance_name, api_key },
        },
        { onConflict: "client_id,provider" }
      );

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get-config") {
      const { data: integration } = await supabase
        .from("integrations")
        .select("status, config")
        .eq("provider", "whatsapp")
        .single();

      return new Response(
        JSON.stringify({
          configured: !!integration,
          status: integration?.status || "disconnected",
          api_url: (integration?.config as any)?.api_url || "",
          instance_name: (integration?.config as any)?.instance_name || "",
          has_api_key: !!(integration?.config as any)?.api_key,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Proxy actions to Evolution API
    const { data: integration } = await adminClient
      .from("integrations")
      .select("*")
      .eq("client_id", clientId)
      .eq("provider", "whatsapp")
      .single();

    if (!integration?.config) {
      return new Response(JSON.stringify({ error: "WhatsApp not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config = integration.config as { api_url: string; instance_name: string; api_key: string };

    if (action === "connect") {
      // First, try to fetch the instance. If it doesn't exist, create it.
      const checkRes = await fetch(`${config.api_url}/instance/connectionState/${config.instance_name}`, {
        headers: { apikey: config.api_key },
      });

      if (checkRes.status === 404) {
        // Instance doesn't exist — create it first
        const createRes = await fetch(`${config.api_url}/instance/create`, {
          method: "POST",
          headers: { apikey: config.api_key, "Content-Type": "application/json" },
          body: JSON.stringify({
            instanceName: config.instance_name,
            integration: "WHATSAPP-BAILEYS",
            qrcode: true,
          }),
        });
        const createData = await createRes.json();
        if (!createRes.ok) {
          return new Response(JSON.stringify({ error: "Failed to create instance", details: createData }), {
            status: createRes.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        await checkRes.text(); // consume body
      }

      // Now connect (get QR code)
      const res = await fetch(`${config.api_url}/instance/connect/${config.instance_name}`, {
        headers: { apikey: config.api_key },
      });
      const data = await res.json();

      if (data.base64) {
        await adminClient.from("integrations").update({ status: "connecting" })
          .eq("client_id", clientId).eq("provider", "whatsapp");
      }

      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "status") {
      const res = await fetch(`${config.api_url}/instance/connectionState/${config.instance_name}`, {
        headers: { apikey: config.api_key },
      });
      const data = await res.json();

      const state = data.instance?.state;
      let newStatus = "disconnected";
      if (state === "open") newStatus = "connected";
      else if (state === "connecting") newStatus = "connecting";

      await adminClient.from("integrations").update({
        status: newStatus,
        config: {
          ...config,
          ...(data.instance?.owner ? { connected_number: data.instance.owner } : {}),
        },
      }).eq("client_id", clientId).eq("provider", "whatsapp");

      return new Response(JSON.stringify({ ...data, status: newStatus }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "disconnect") {
      try {
        await fetch(`${config.api_url}/instance/logout/${config.instance_name}`, {
          method: "DELETE",
          headers: { apikey: config.api_key },
        });
      } catch (_e) { /* ignore */ }

      await adminClient.from("integrations").update({ status: "disconnected" })
        .eq("client_id", clientId).eq("provider", "whatsapp");

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
