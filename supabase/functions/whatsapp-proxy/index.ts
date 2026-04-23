import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

import { corsHeaders } from "../_shared/cors.ts";

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown error";

const isConnectionTimeout = (error: unknown) => {
  const message = getErrorMessage(error).toLowerCase();
  return ["timed out", "tcp connect error", "connection refused", "dns", "network", "unreachable", "certificate", "unknownissuer", "peer certificate", "tls handshake", "connection reset", "reset by peer", "eof"].some((term) =>
    message.includes(term)
  );
};

const getFallbackStatus = (
  persistedStatus: string | null | undefined,
  type: string | null,
  config: { api_key?: string; instance_name?: string; access_token?: string }
) => {
  if (persistedStatus && persistedStatus !== "disconnected") return persistedStatus;
  if (type === "official" && config.access_token) return "configured";
  if (config.api_key && config.instance_name) return "configured";
  return persistedStatus || "disconnected";
};

async function readResponseBody(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

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
          connected_number: (integration?.config as any)?.connected_number || "",
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

    const rawConfig = integration.config as { 
      api_url: string; 
      instance_name: string; 
      api_key: string;
      phone_number_id?: string;
      business_id?: string;
      access_token?: string;
    };
    // Normalize api_url: ensure scheme + remove trailing slash
    const normalizedUrl = (() => {
      let u = (rawConfig.api_url || "").trim().replace(/\/+$/, "");
      if (u && !/^https?:\/\//i.test(u)) u = `https://${u}`;
      return u;
    })();
    const config = { ...rawConfig, api_url: normalizedUrl };
    // URL-safe instance name (for paths only; JSON bodies must use raw config.instance_name)
    const instancePath = encodeURIComponent(config.instance_name || "");
    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-webhook`;

    if (action === "connect") {
      const fallbackStatus = getFallbackStatus(integration?.status, type, config);

      try {
        // ── Official (Cloud API) flow ──
        if (type === "official") {
          // Check if instance already exists
          const checkRes = await fetch(`${config.api_url}/instance/connectionState/${instancePath}`, {
            headers: { apikey: config.api_key },
          });

          if (checkRes.status === 404) {
            // Create instance with correct Evolution API v2 payload for WHATSAPP-BUSINESS
            const createRes = await fetch(`${config.api_url}/instance/create`, {
              method: "POST",
              headers: { apikey: config.api_key, "Content-Type": "application/json" },
              body: JSON.stringify({
                instanceName: config.instance_name,
                integration: "WHATSAPP-BUSINESS",
                token: config.access_token,
                number: config.phone_number_id,
                businessId: config.business_id,
                qrcode: false,
              }),
            });
            const createData = await readResponseBody(createRes);
            if (!createRes.ok) {
              await adminClient.from("integrations").update({ status: fallbackStatus })
                .eq("client_id", clientId).eq("provider", provider);
              return jsonResponse({
                connected: false,
                instance: { state: fallbackStatus },
                status: fallbackStatus,
                reachable: false,
                error: createRes.status === 401
                  ? "Credenciais da Evolution API inválidas (401 Unauthorized). Verifique a API Key."
                  : "Falha ao criar instância na Evolution API.",
                details: createData,
              });
            }
          } else {
            await checkRes.text(); // consume body
          }

          // Cloud API connects automatically after creation — no QR needed
          // Mark as connected directly
          await adminClient.from("integrations").update({
            status: "connected",
            config: { ...config, connected_number: config.phone_number_id || "" },
          }).eq("client_id", clientId).eq("provider", provider);

          // Set Webhook for Official
          await fetch(`${config.api_url}/webhook/set/${instancePath}`, {
            method: "POST",
            headers: { apikey: config.api_key, "Content-Type": "application/json" },
            body: JSON.stringify({
              webhook: {
                enabled: true,
                url: webhookUrl,
                webhook_by_events: false,
                events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "MESSAGES_DELETE", "CONNECTION_UPDATE"]
              }
            })
          }).catch(err => console.error("Failed to set official webhook:", err));

          return jsonResponse({ connected: true, instance: { state: "open" }, status: "connected", reachable: true });
        }

        // ── Lite (Baileys) flow — unchanged ──
        const checkRes = await fetch(`${config.api_url}/instance/connectionState/${instancePath}`, {
          headers: { apikey: config.api_key },
        });

        if (checkRes.status === 404) {
          const createRes = await fetch(`${config.api_url}/instance/create`, {
            method: "POST",
            headers: { apikey: config.api_key, "Content-Type": "application/json" },
            body: JSON.stringify({
              instanceName: config.instance_name,
              integration: "WHATSAPP-BAILEYS",
              qrcode: true,
            }),
          });
          const createData = await readResponseBody(createRes);
          if (!createRes.ok) {
            await adminClient.from("integrations").update({ status: fallbackStatus })
              .eq("client_id", clientId).eq("provider", provider);
            return jsonResponse({
              connected: false,
              instance: { state: fallbackStatus },
              status: fallbackStatus,
              reachable: false,
              error: createRes.status === 401
                ? "Credenciais da Evolution API inválidas (401 Unauthorized). Verifique a API Key."
                : "Falha ao criar instância na Evolution API.",
              details: createData,
            });
          }
        } else {
          await checkRes.text();
        }

        const res = await fetch(`${config.api_url}/instance/connect/${instancePath}`, {
          headers: { apikey: config.api_key },
        });
        const data = await readResponseBody(res);
        const payload = typeof data === "object" && data !== null ? data as Record<string, any> : {};

        if (payload.base64 || payload.instance?.state === "open" || payload.instance?.state === "connecting") {
          const newStatus = (payload.instance?.state === "open") ? "connected" : "connecting";
          await adminClient.from("integrations").update({
            status: newStatus,
            config: {
              ...config,
              ...(payload.instance?.owner ? { connected_number: payload.instance.owner } : {}),
            }
          }).eq("client_id", clientId).eq("provider", provider);
        }

        // Set Webhook for Lite
        await fetch(`${config.api_url}/webhook/set/${instancePath}`, {
          method: "POST",
          headers: { apikey: config.api_key, "Content-Type": "application/json" },
          body: JSON.stringify({
            webhook: {
              enabled: true,
              url: webhookUrl,
              webhook_by_events: false,
              events: ["QRCODE_UPDATED", "MESSAGES_UPSERT", "MESSAGES_UPDATE", "MESSAGES_DELETE", "SEND_MESSAGE", "CONNECTION_UPDATE"]
            }
          })
        }).catch(err => console.error("Failed to set lite webhook:", err));

        return jsonResponse(data, res.status);
      } catch (err) {
        if (isConnectionTimeout(err)) {
          await adminClient.from("integrations").update({ status: fallbackStatus })
            .eq("client_id", clientId).eq("provider", provider);

          return jsonResponse({
            connected: false,
            instance: { state: fallbackStatus },
            status: fallbackStatus,
            reachable: false,
            error: "Evolution API is unavailable or timed out while starting the instance connection.",
          });
        }

        throw err;
      }
    }

    if (action === "status") {
      const fallbackStatus = getFallbackStatus(integration?.status, type, config);

      try {
        const res = await fetch(`${config.api_url}/instance/connectionState/${instancePath}`, {
          headers: { apikey: config.api_key },
        });
        const data = await readResponseBody(res);

        if (!res.ok) {
          const upstreamError = typeof data === "string"
            ? data
            : (data as { response?: { message?: string } } | null)?.response?.message || "Could not fetch connection status from Evolution API";

          if (type === "official") {
            const configuredStatus = config.access_token ? "configured" : fallbackStatus;
            await adminClient.from("integrations").update({ status: configuredStatus })
              .eq("client_id", clientId).eq("provider", provider);

            return jsonResponse({
              instance: { state: configuredStatus },
              status: configuredStatus,
              reachable: false,
              error: upstreamError,
            });
          }

          return jsonResponse({
            instance: { state: fallbackStatus },
            status: fallbackStatus,
            reachable: false,
            error: upstreamError,
          });
        }

        const payload = typeof data === "object" && data !== null ? data as Record<string, any> : {};
        const state = payload.instance?.state;
        let newStatus = "disconnected";
        if (state === "open") newStatus = "connected";
        else if (state === "connecting") newStatus = "connecting";
        else if (type === "official" && config.access_token) newStatus = "configured";

        await adminClient.from("integrations").update({
          status: newStatus,
          config: {
            ...config,
            ...(payload.instance?.owner ? { connected_number: payload.instance.owner } : {}),
          },
        }).eq("client_id", clientId).eq("provider", provider);

        return jsonResponse({ ...payload, status: newStatus, reachable: true });
      } catch (err) {
        if (isConnectionTimeout(err)) {
          return jsonResponse({
            instance: { state: fallbackStatus },
            status: fallbackStatus,
            reachable: false,
            error: "Evolution API is unavailable or timed out while checking the instance status.",
          });
        }

        throw err;
      }
    }

    if (action === "disconnect") {
      try {
        // Try logout first
        const logoutRes = await fetch(`${config.api_url}/instance/logout/${instancePath}`, {
          method: "DELETE",
          headers: { apikey: config.api_key },
        });
        
        // If logout fails (e.g. 404), try delete
        if (!logoutRes.ok) {
          await fetch(`${config.api_url}/instance/delete/${instancePath}`, {
            method: "DELETE",
            headers: { apikey: config.api_key },
          });
        }
      } catch (err) { 
        console.error("Error during disconnect:", err);
      }

      // Always update local status to disconnected
      await adminClient.from("integrations").update({ 
        status: "disconnected",
        config: {
          ...config,
          connected_number: null
        }
      }).eq("client_id", clientId).eq("provider", provider);

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

      const res = await fetch(`${config.api_url}/message/sendText/${instancePath}`, {
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

      const res = await fetch(`${config.api_url}/message/${endpoint}/${instancePath}`, {
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
