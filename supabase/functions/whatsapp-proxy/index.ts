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
    // instance_name URL param selects a specific WhatsApp instance
    const instanceNameParam = url.searchParams.get("instance_name") || "";

    // ── list-instances: returns all WA instances for this client ──
    if (action === "list-instances") {
      const { data: integrations, error: listErr } = await adminClient
        .from("integrations")
        .select("id, status, config, provider")
        .eq("client_id", clientId)
        .in("provider", ["whatsapp", "whatsapp_official"])
        .order("created_at", { ascending: true });

      if (listErr) console.error("list-instances error:", listErr);

      return jsonResponse(
        (integrations || []).map((row: any) => ({
          id: row.id,
          provider: row.provider,
          instance_name: (row.config as any)?.instance_name || "",
          status: row.status || "disconnected",
          api_url: (row.config as any)?.api_url || "",
          has_api_key: !!(row.config as any)?.api_key,
          phone_number_id: (row.config as any)?.phone_number_id || "",
          business_id: (row.config as any)?.business_id || "",
          has_access_token: !!(row.config as any)?.access_token,
          connected_number: (row.config as any)?.connected_number || "",
        }))
      );
    }

    // ── save-config: create or update a specific instance ──
    if (action === "save-config") {
      const body = await req.json();
      const { api_url, instance_name, api_key, phone_number_id, business_id, access_token } = body;

      if (!api_url || !instance_name) {
        return new Response(JSON.stringify({ error: "Missing fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Multi-instance: find row by (client_id, provider, config->instance_name)
      const { data: existing } = await adminClient
        .from("integrations")
        .select("id, config")
        .eq("client_id", clientId)
        .eq("provider", provider)
        .filter("config->>instance_name", "eq", instance_name)
        .maybeSingle();

      let finalApiKey = api_key;
      if (!finalApiKey) {
        finalApiKey = (existing?.config as any)?.api_key;
        if (!finalApiKey) {
          return new Response(JSON.stringify({ error: "API Key is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const newConfig = {
        api_url,
        instance_name,
        api_key: finalApiKey,
        phone_number_id: phone_number_id ?? (existing?.config as any)?.phone_number_id,
        business_id: business_id ?? (existing?.config as any)?.business_id,
        access_token: access_token ?? (existing?.config as any)?.access_token,
      };

      if (existing) {
        await adminClient.from("integrations").update({
          status: "configured",
          config: newConfig,
        }).eq("id", existing.id);
      } else {
        await adminClient.from("integrations").insert({
          client_id: clientId,
          provider,
          status: "configured",
          config: newConfig,
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── get-config: return config for a specific instance ──
    if (action === "get-config") {
      const baseQuery = adminClient
        .from("integrations")
        .select("status, config")
        .eq("client_id", clientId)
        .eq("provider", provider);

      const { data: integration } = instanceNameParam
        ? await baseQuery.filter("config->>instance_name", "eq", instanceNameParam).maybeSingle()
        : await baseQuery.order("created_at", { ascending: true }).limit(1).maybeSingle();

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

    // ── Lookup integration for all remaining actions ──
    // When instance_name param given, select that specific row; otherwise first row of this provider
    const instanceQuery = adminClient
      .from("integrations")
      .select("*")
      .eq("client_id", clientId)
      .eq("provider", provider);

    const { data: integration } = instanceNameParam
      ? await instanceQuery.filter("config->>instance_name", "eq", instanceNameParam).maybeSingle()
      : await instanceQuery.order("created_at", { ascending: true }).limit(1).maybeSingle();

    if (!integration?.config) {
      if (action === "status") {
        return jsonResponse({ status: "disconnected", configured: false, instance: { state: "disconnected" }, reachable: false });
      }
      if (action === "delete-instance") {
        return jsonResponse({ success: true }); // nothing to delete
      }
      return jsonResponse({ error: "WhatsApp not configured" }, 400);
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

    // Helper: update this specific integration row
    const updateIntegration = (fields: Record<string, unknown>) =>
      adminClient.from("integrations").update(fields).eq("id", integration.id);

    // ── delete-instance: logout + delete from Evolution API + remove DB row ──
    if (action === "delete-instance") {
      try {
        await fetch(`${config.api_url}/instance/logout/${instancePath}`, {
          method: "DELETE",
          headers: { apikey: config.api_key },
        });
        await fetch(`${config.api_url}/instance/delete/${instancePath}`, {
          method: "DELETE",
          headers: { apikey: config.api_key },
        });
      } catch { /* ignore Evolution API errors */ }

      await adminClient.from("integrations").delete().eq("id", integration.id);
      return jsonResponse({ success: true });
    }

    if (action === "connect") {
      const fallbackStatus = getFallbackStatus(integration?.status, type, config);

      try {
        // ── Official (Cloud API) flow ──
        if (type === "official") {
          const checkRes = await fetch(`${config.api_url}/instance/connectionState/${instancePath}`, {
            headers: { apikey: config.api_key },
          });

          if (checkRes.status === 404) {
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
              await updateIntegration({ status: fallbackStatus });
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

          await updateIntegration({
            status: "connected",
            config: { ...config, connected_number: config.phone_number_id || "" },
          });

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

        // ── Lite (Baileys) flow ──
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
            await updateIntegration({ status: fallbackStatus });
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
          await updateIntegration({
            status: newStatus,
            config: {
              ...config,
              ...(payload.instance?.owner ? { connected_number: payload.instance.owner } : {}),
            }
          });
        }

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
          await updateIntegration({ status: fallbackStatus });
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
            await updateIntegration({ status: configuredStatus });
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

        await updateIntegration({
          status: newStatus,
          config: {
            ...config,
            ...(payload.instance?.owner ? { connected_number: payload.instance.owner } : {}),
          },
        });

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
        const logoutRes = await fetch(`${config.api_url}/instance/logout/${instancePath}`, {
          method: "DELETE",
          headers: { apikey: config.api_key },
        });
        if (!logoutRes.ok) {
          await fetch(`${config.api_url}/instance/delete/${instancePath}`, {
            method: "DELETE",
            headers: { apikey: config.api_key },
          });
        }
      } catch (err) {
        console.error("Error during disconnect:", err);
      }

      await updateIntegration({
        status: "disconnected",
        config: { ...config, connected_number: null }
      });

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

      let convId: string | null = null;
      const channel = type === "official" ? "whatsapp_official" : "whatsapp";
      const { data: existingConv } = await adminClient.from("conversations")
        .select("id")
        .eq("client_id", clientId)
        .eq("channel", channel)
        .eq("metadata->>phone", formattedPhone)
        .maybeSingle();

      if (existingConv) {
        convId = existingConv.id;
      } else {
        const { data: lead } = await adminClient.from("leads")
          .select("id")
          .eq("client_id", clientId)
          .or(`phone.ilike.%${cleanPhone.slice(-8)}%`)
          .limit(1)
          .maybeSingle();

        const convPayload: any = {
          client_id: clientId,
          lead_id: lead?.id || null,
          channel,
          status: "open",
          last_message: message,
          last_message_at: new Date().toISOString(),
          metadata: { phone: formattedPhone, instance_name: config.instance_name },
        };
        // Try with integration_id, fall back without it (column may not exist)
        let inserted = await adminClient.from("conversations")
          .insert({ ...convPayload, integration_id: integration.id }).select("id").single();
        if (inserted.error) {
          inserted = await adminClient.from("conversations").insert(convPayload).select("id").single();
        }
        // Final fallback: channel constraint blocks whatsapp_official
        if (inserted.error && channel === "whatsapp_official") {
          inserted = await adminClient.from("conversations").insert({
            ...convPayload,
            channel: "whatsapp",
            metadata: { ...convPayload.metadata, original_channel: "whatsapp_official" },
          }).select("id").single();
        }
        convId = inserted.data?.id || null;
      }

      if (convId) {
        await adminClient.from("messages").insert({
          client_id: clientId,
          conversation_id: convId,
          content: message,
          type: "text",
          direction: "outbound",
          sender_name: "Você",
          metadata: { channel }
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

      let convId: string | null = null;
      const mediaChannel = type === "official" ? "whatsapp_official" : "whatsapp";
      const { data: existingConv } = await adminClient.from("conversations")
        .select("id")
        .eq("client_id", clientId)
        .eq("channel", mediaChannel)
        .eq("metadata->>phone", formattedPhone)
        .maybeSingle();

      if (existingConv) {
        convId = existingConv.id;
      }

      if (convId) {
        const displayText = mediaType === "audio" ? "🎵 Áudio"
          : mediaType === "video" ? "🎥 Vídeo"
          : mediaType === "image" ? "📷 Imagem"
          : `📎 ${fileName || "Arquivo"}`;

        // Map disallowed types to allowed ones if migration not yet applied
        const fallbackType = (t: string) => {
          if (t === "video") return "file";
          if (t === "sticker") return "image";
          if (t === "document") return "file";
          if (t === "location" || t === "contact") return "text";
          return t;
        };
        const msgPayload = {
          client_id: clientId,
          conversation_id: convId,
          content: mediaUrl,
          type: mediaType || "image",
          direction: "outbound",
          sender_name: "Você",
          metadata: {
            media_url: mediaUrl,
            filename: fileName,
            channel: mediaChannel
          },
        };
        const insertResult = await adminClient.from("messages").insert(msgPayload);
        if (insertResult.error?.code === "23514") {
          await adminClient.from("messages").insert({
            ...msgPayload,
            type: fallbackType(mediaType || "image"),
            metadata: { ...msgPayload.metadata, original_type: mediaType },
          });
        }
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
