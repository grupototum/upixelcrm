import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const userId = user.id;
    const { data: profile } = await supabase.from("profiles").select("client_id").eq("id", userId).single();
    if (!profile) return jsonResponse({ error: "Profile not found" }, 404);

    const clientId = profile.client_id;
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "save-config") {
      const body = await req.json();
      const { ig_account_id, access_token, webhook_verify_token } = body;

      if (!ig_account_id) {
        return jsonResponse({ error: "Missing fields" }, 400);
      }

      // If no new access_token provided, keep existing one
      let finalToken = access_token;
      if (!finalToken) {
        const { data: existing } = await adminClient
          .from("integrations")
          .select("config")
          .eq("client_id", clientId)
          .eq("provider", "instagram")
          .single();
        finalToken = (existing?.config as any)?.access_token;
        if (!finalToken) {
          return jsonResponse({ error: "Access token is required" }, 400);
        }
      }

      await adminClient.from("integrations").upsert(
        {
          client_id: clientId,
          provider: "instagram",
          status: "connected",
          config: { 
            ig_account_id, 
            access_token: finalToken,
            webhook_verify_token
          },
        },
        { onConflict: "client_id,provider" }
      );

      return jsonResponse({ success: true });
    }

    if (action === "disconnect") {
      await adminClient.from("integrations").update({ 
        status: "disconnected",
        config: { ig_account_id: "", access_token: "", webhook_verify_token: "" }
      }).eq("client_id", clientId).eq("provider", "instagram");

      return jsonResponse({ success: true });
    }

    // Proxy actions to Meta Graph API
    const { data: integration } = await adminClient
      .from("integrations")
      .select("*")
      .eq("client_id", clientId)
      .eq("provider", "instagram")
      .single();

    if (!integration?.config || !((integration.config as any)?.access_token)) {
      return jsonResponse({ error: "Instagram not configured" }, 400);
    }

    const config = integration.config as { 
      ig_account_id: string; 
      access_token: string;
    };

    if (action === "send-message") {
      const body = await req.json();
      const { phone, message } = body; // 'phone' is actually the Instagram Scoped ID (IGSID)
      if (!phone || !message) {
        return jsonResponse({ error: "Missing IGSID (phone) or message" }, 400);
      }

      const metaRes = await fetch(`https://graph.facebook.com/v21.0/${config.ig_account_id}/messages`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${config.access_token}`, 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({
          recipient: { id: phone },
          message: { text: message },
        }),
      });

      const data = await metaRes.json();
      if (!metaRes.ok) {
        console.error("Meta Graph API error:", data);
        return jsonResponse({ error: "Failed to send Instagram message", details: data }, metaRes.status);
      }

      // Save message to DB
      let convId: string | null = null;
      const { data: existingConv } = await adminClient.from("conversations")
        .select("id")
        .eq("client_id", clientId)
        .eq("channel", "instagram")
        .eq("metadata->>phone", phone)
        .single();

      if (existingConv) {
        convId = existingConv.id;
      }

      if (convId) {
        await adminClient.from("messages").insert({
          client_id: clientId,
          conversation_id: convId,
          content: message,
          type: "text",
          direction: "outbound",
          sender_name: "Você",
          metadata: { channel: "instagram", meta_message_id: data.message_id }
        });
        await adminClient.from("conversations").update({
          last_message: message,
          last_message_at: new Date().toISOString(),
        }).eq("id", convId);
      }

      return jsonResponse(data, metaRes.status);
    }

    if (action === "send-media") {
      const body = await req.json();
      const { phone, mediaUrl, mediaType, fileName } = body;
      if (!phone || !mediaUrl) {
        return jsonResponse({ error: "Missing phone (IGSID) or mediaUrl" }, 400);
      }

      const metaType = mediaType === "image" ? "image" 
                     : mediaType === "audio" ? "audio"
                     : mediaType === "video" ? "video"
                     : "file";

      const metaRes = await fetch(`https://graph.facebook.com/v21.0/${config.ig_account_id}/messages`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${config.access_token}`, 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({
          recipient: { id: phone },
          message: {
            attachment: {
              type: metaType,
              payload: { url: mediaUrl }
            }
          },
        }),
      });

      const data = await metaRes.json();
      if (!metaRes.ok) {
        return jsonResponse({ error: "Failed to send Instagram media", details: data }, metaRes.status);
      }

      // Save message to DB
      let convId: string | null = null;
      const { data: existingConv } = await adminClient.from("conversations")
        .select("id")
        .eq("client_id", clientId)
        .eq("channel", "instagram")
        .eq("metadata->>phone", phone)
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
            channel: "instagram",
            meta_message_id: data.message_id
          },
        });
        await adminClient.from("conversations").update({
          last_message: displayText,
          last_message_at: new Date().toISOString(),
        }).eq("id", convId);
      }

      return jsonResponse(data, metaRes.status);
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});
