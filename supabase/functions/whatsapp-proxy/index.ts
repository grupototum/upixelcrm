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
    const type = url.searchParams.get("type") || "normal";
    const provider = type === "official" ? "whatsapp_official" : "whatsapp";

    if (action === "save-config") {
      const body = await req.json();
      const { api_url, instance_name, api_key, phone_number_id, business_id, access_token } = body;

      if (!api_url || !instance_name) {
        return new Response(JSON.stringify({ error: "Missing fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // If no new api_key provided, keep existing one
      let finalApiKey = api_key;
      if (!finalApiKey) {
        const { data: existing } = await adminClient
          .from("integrations")
          .select("config")
          .eq("client_id", clientId)
          .eq("provider", provider)
          .single();
        finalApiKey = (existing?.config as any)?.api_key;
        if (!finalApiKey) {
          return new Response(JSON.stringify({ error: "API Key is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      await adminClient.from("integrations").upsert(
        {
          client_id: clientId,
          provider: provider,
          status: "configured",
          config: { 
            api_url, 
            instance_name, 
            api_key: finalApiKey,
            phone_number_id,
            business_id,
            access_token
          },
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
        .eq("provider", provider)
        .single();

      return new Response(
        JSON.stringify({
          configured: !!integration,
          status: integration?.status || "disconnected",
          api_url: (integration?.config as any)?.api_url || "",
          instance_name: (integration?.config as any)?.instance_name || "",
          has_api_key: !!(integration?.config as any)?.api_key,
          phone_number_id: (integration?.config as any)?.phone_number_id || "",
          business_id: (integration?.config as any)?.business_id || "",
          access_token: (integration?.config as any)?.access_token || "",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Proxy actions to Evolution API
    const { data: integration } = await adminClient
      .from("integrations")
      .select("*")
      .eq("client_id", clientId)
      .eq("provider", provider)
      .single();

    if (!integration?.config) {
      return new Response(JSON.stringify({ error: "WhatsApp not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config = integration.config as { 
      api_url: string; 
      instance_name: string; 
      api_key: string;
      phone_number_id?: string;
      business_id?: string;
      access_token?: string;
    };

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
            integration: type === "official" ? "WHATSAPP-BUSINESS" : "WHATSAPP-BAILEYS",
            qrcode: type !== "official",
            ...(type === "official" ? {
              phoneNumberId: config.phone_number_id,
              businessId: config.business_id,
              accessToken: config.access_token
            } : {})
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

      if (data.base64 || type === "official") {
        await adminClient.from("integrations").update({ status: "connecting" })
          .eq("client_id", clientId).eq("provider", provider);
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
      }).eq("client_id", clientId).eq("provider", provider);

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
        .eq("client_id", clientId).eq("provider", provider);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "send-message") {
      const body = await req.json();
      const { phone, message } = body;
      if (!phone || !message) {
        return new Response(JSON.stringify({ error: "Missing phone or message" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Format phone: remove non-digits, ensure country code
      const cleanPhone = phone.replace(/\D/g, "");
      const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

      const res = await fetch(`${config.api_url}/message/sendText/${config.instance_name}`, {
        method: "POST",
        headers: { apikey: config.api_key, "Content-Type": "application/json" },
        body: JSON.stringify({
          number: formattedPhone,
          text: message,
        }),
      });
      const data = await res.json();

      // Save message to DB
      // Find or create conversation
      let convId: string | null = null;
        const { data: existingConv } = await adminClient.from("conversations")
        .select("id")
        .eq("client_id", clientId)
        .eq("channel", type === "official" ? "whatsapp_official" : "whatsapp")
        .eq("metadata->>phone", formattedPhone)
        .single();

      if (existingConv) {
        convId = existingConv.id;
      } else {
        // Try to find lead by phone
        const { data: lead } = await adminClient.from("leads")
          .select("id")
          .eq("client_id", clientId)
          .or(`phone.ilike.%${cleanPhone.slice(-8)}%`)
          .limit(1)
          .single();

        const { data: newConv } = await adminClient.from("conversations").insert({
          client_id: clientId,
          lead_id: lead?.id || null,
          channel: type === "official" ? "whatsapp_official" : "whatsapp",
          status: "open",
          last_message: message,
          last_message_at: new Date().toISOString(),
          metadata: { phone: formattedPhone },
        }).select("id").single();
        convId = newConv?.id || null;
      }

      if (convId) {
        await adminClient.from("messages").insert({
          client_id: clientId,
          conversation_id: convId,
          content: message,
          type: "text",
          direction: "outbound",
          sender_name: "Você",
          metadata: { channel: type === "official" ? "whatsapp_official" : "whatsapp" }
        });
        await adminClient.from("conversations").update({
          last_message: message,
          last_message_at: new Date().toISOString(),
        }).eq("id", convId);
      }

      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "send-media") {
      const body = await req.json();
      const { phone, mediaUrl, mediaType, fileName, caption, mimetype } = body;
      if (!phone || !mediaUrl) {
        return new Response(JSON.stringify({ error: "Missing phone or mediaUrl" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const cleanPhone = phone.replace(/\D/g, "");
      const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

      // Determine Evolution API endpoint based on media type
      const endpoint = "sendMedia";
      const payload: Record<string, any> = {
        number: formattedPhone,
        mediatype: mediaType || "image",
        media: mediaUrl,
        fileName: fileName || "arquivo",
        caption: caption || ""
      };

      if (mimetype) payload.mimetype = mimetype;

      const res = await fetch(`${config.api_url}/message/${endpoint}/${config.instance_name}`, {
        method: "POST",
        headers: { apikey: config.api_key, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      // Save message to DB
      let convId: string | null = null;
      const { data: existingConv } = await adminClient.from("conversations")
        .select("id")
        .eq("client_id", clientId)
        .eq("channel", type === "official" ? "whatsapp_official" : "whatsapp")
        .eq("metadata->>phone", formattedPhone)
        .single();

      if (existingConv) {
        convId = existingConv.id;
      }

      if (convId) {
        const displayText = mediaType === "audio" ? "🎵 Áudio" 
          : mediaType === "video" ? "🎥 Vídeo"
          : mediaType === "image" ? "📷 Imagem"
          : `📎 ${fileName || "Arquivo"}`;

        await adminClient.from("messages").insert({
          client_id: clientId,
          conversation_id: convId,
          content: mediaUrl,
          type: mediaType || "image",
          direction: "outbound",
          sender_name: "Você",
          metadata: { 
            media_url: mediaUrl, 
            filename: fileName, 
            channel: type === "official" ? "whatsapp_official" : "whatsapp" 
          },
        });
        await adminClient.from("conversations").update({
          last_message: displayText,
          last_message_at: new Date().toISOString(),
        }).eq("id", convId);
      }

      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
