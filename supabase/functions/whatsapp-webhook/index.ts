import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MediaInfo {
  content: string;
  type: string;
  metadata: Record<string, unknown>;
}

function extractMessageContent(messageData: any): MediaInfo {
  const msg = messageData.message;
  const mediaUrl = messageData.mediaUrl;
  if (!msg) return { content: "[Mensagem vazia]", type: "text", metadata: {} };

  if (msg.conversation) {
    return { content: msg.conversation, type: "text", metadata: {} };
  }
  if (msg.extendedTextMessage?.text) {
    return { content: msg.extendedTextMessage.text, type: "text", metadata: {} };
  }

  if (msg.audioMessage) {
    const url = mediaUrl || msg.audioMessage.url || "";
    return {
      content: url || "[Áudio]",
      type: "audio",
      metadata: {
        mimetype: msg.audioMessage.mimetype,
        seconds: msg.audioMessage.seconds,
        media_url: url,
      },
    };
  }

  if (msg.imageMessage) {
    const url = mediaUrl || msg.imageMessage.url || "";
    const caption = msg.imageMessage.caption || "";
    return {
      content: url || "[Imagem]",
      type: "image",
      metadata: { caption, mimetype: msg.imageMessage.mimetype, media_url: url },
    };
  }

  if (msg.videoMessage) {
    const url = mediaUrl || msg.videoMessage.url || "";
    const caption = msg.videoMessage.caption || "";
    return {
      content: url || "[Vídeo]",
      type: "video",
      metadata: { caption, mimetype: msg.videoMessage.mimetype, seconds: msg.videoMessage.seconds, media_url: url },
    };
  }

  if (msg.documentMessage) {
    const url = mediaUrl || msg.documentMessage.url || "";
    const fileName = msg.documentMessage.fileName || "documento";
    const caption = msg.documentMessage.caption || "";
    return {
      content: url || `[Arquivo: ${fileName}]`,
      type: "file",
      metadata: { filename: fileName, caption, mimetype: msg.documentMessage.mimetype, size: msg.documentMessage.fileLength, media_url: url },
    };
  }

  if (msg.stickerMessage) {
    const url = mediaUrl || msg.stickerMessage.url || "";
    return {
      content: url || "[Sticker]",
      type: "image",
      metadata: { is_sticker: true, mimetype: msg.stickerMessage.mimetype, media_url: url },
    };
  }

  if (msg.locationMessage) {
    const lat = msg.locationMessage.degreesLatitude;
    const lng = msg.locationMessage.degreesLongitude;
    return {
      content: `📍 Localização: ${lat}, ${lng}`,
      type: "text",
      metadata: { latitude: lat, longitude: lng, is_location: true },
    };
  }

  if (msg.contactMessage) {
    return {
      content: `👤 Contato: ${msg.contactMessage.displayName || ""}`,
      type: "text",
      metadata: { vcard: msg.contactMessage.vcard, is_contact: true },
    };
  }

  return { content: "[Mensagem não suportada]", type: "text", metadata: {} };
}

// Download media from Evolution API and upload to Supabase Storage
async function downloadAndStoreMedia(
  adminClient: any,
  config: Record<string, any>,
  messageData: any,
  msgType: string,
  mimetype: string
): Promise<string | null> {
  try {
    const apiUrl = config.api_url;
    const apiKey = config.api_key;
    const instanceName = config.instance_name;

    if (!apiUrl || !apiKey || !instanceName) {
      console.log("Missing Evolution API config for media download");
      return null;
    }

    // Use Evolution API getBase64FromMediaMessage
    const messageKey = messageData.key;
    const response = await fetch(
      `${apiUrl}/chat/getBase64FromMediaMessage/${instanceName}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: apiKey,
        },
        body: JSON.stringify({
          message: {
            key: {
              id: messageKey.id || "",
              remoteJid: messageKey.remoteJid || "",
              fromMe: messageKey.fromMe || false,
            },
          },
          convertToMp4: msgType === "video",
        }),
      }
    );

    if (!response.ok) {
      console.error("Failed to get base64 media:", response.status, await response.text().catch(() => ""));
      return null;
    }

    const result = await response.json();
    let base64Data = result.base64;

    if (!base64Data) {
      console.log("No base64 data returned from Evolution API");
      return null;
    }

    // Clean base64 prefix if present (e.g., data:video/mp4;base64,...)
    if (base64Data.includes(",")) {
      base64Data = base64Data.split(",")[1];
    }

    // Determine file extension from mimetype
    const extMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
      "audio/ogg; codecs=opus": "ogg",
      "audio/ogg": "ogg",
      "audio/mpeg": "mp3",
      "audio/mp4": "m4a",
      "video/mp4": "mp4",
      "video/mpeg": "mpeg",
      "video/quicktime": "mov",
      "video/x-matroska": "mkv",
      "video/3gpp": "3gp",
      "application/pdf": "pdf",
      "application/msword": "doc",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
      "application/vnd.ms-excel": "xls",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    };

    const cleanMime = (mimetype || "application/octet-stream").split(";")[0].trim();
    const ext = extMap[mimetype] || extMap[cleanMime] || "bin";
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    // Decode base64 and upload (Optimized)
    const binary = atob(base64Data);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));

    const { error: uploadError } = await adminClient.storage
      .from("whatsapp_media")
      .upload(fileName, bytes, {
        contentType: cleanMime,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return null;
    }

    const { data: { publicUrl } } = adminClient.storage
      .from("whatsapp_media")
      .getPublicUrl(fileName);

    console.log("Media uploaded successfully:", publicUrl);
    return publicUrl;
  } catch (err) {
    console.error("Error downloading/storing media:", err);
    return null;
  }
}

async function findOrCreateLead(
  adminClient: any,
  clientId: string,
  phone: string,
  senderName: string,
  config: Record<string, any>
): Promise<string | null> {
  const phoneSuffix = phone.length >= 8 ? phone.slice(-8) : phone;
  const { data: existingLeads } = await adminClient
    .from("leads")
    .select("id, created_at, tags, notes")
    .eq("client_id", clientId)
    .or(`phone.ilike.%${phoneSuffix}%`)
    .order("created_at", { ascending: true });

  if (existingLeads && existingLeads.length > 0) {
    const primaryLead = existingLeads[0];

    if (existingLeads.length > 1) {
      console.log(`Merging ${existingLeads.length} duplicate leads for phone suffix ${phoneSuffix}`);
      const duplicates = existingLeads.slice(1);
      const duplicateIds = duplicates.map((d: any) => d.id);

      await Promise.all([
        adminClient.from("conversations").update({ lead_id: primaryLead.id }).in("lead_id", duplicateIds),
        adminClient.from("tasks").update({ lead_id: primaryLead.id }).in("lead_id", duplicateIds),
        adminClient.from("timeline_events").update({ lead_id: primaryLead.id }).in("lead_id", duplicateIds),
      ]);

      let mergedTags = [...(primaryLead.tags || [])];
      let mergedNotes = primaryLead.notes || "";
      duplicates.forEach((d: any) => {
        (d.tags || []).forEach((t: string) => {
          if (!mergedTags.includes(t)) mergedTags.push(t);
        });
        if (d.notes) mergedNotes += `\n[Nota mesclada]: ${d.notes}`;
      });

      await adminClient.from("leads").update({ tags: mergedTags, notes: mergedNotes }).eq("id", primaryLead.id);
      await adminClient.from("leads").delete().in("id", duplicateIds);
    }

    return primaryLead.id;
  }

  let targetColId = config?.target_column_id;
  if (!targetColId) {
    const { data: firstCol } = await adminClient
      .from("pipeline_columns")
      .select("id")
      .eq("client_id", clientId)
      .order("order", { ascending: true })
      .limit(1)
      .maybeSingle();
    targetColId = firstCol?.id;
  }

  if (!targetColId) {
    console.error("No pipeline columns found for client:", clientId);
    return null;
  }

  const { data: newLead, error: leadError } = await adminClient
    .from("leads")
    .insert({
      client_id: clientId,
      name: senderName,
      phone: phone,
      column_id: targetColId,
      tags: ["whatsapp-auto"],
      origin: "whatsapp",
    })
    .select("id")
    .single();

  if (leadError) {
    console.error("Error creating lead:", leadError);
    return null;
  }

  await adminClient.from("timeline_events").insert({
    client_id: clientId,
    lead_id: newLead.id,
    type: "stage_change",
    content: `Lead "${senderName}" criado automaticamente via WhatsApp`,
    user_name: "Sistema",
  });

  console.log("Created lead:", senderName, newLead.id, "column:", targetColId);
  return newLead.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body).slice(0, 500));

    const event = body.event;
    if (event !== "messages.upsert") {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const instanceName = body.instance;
    const messageData = body.data;

    if (!messageData || messageData.key?.fromMe) {
      return new Response(JSON.stringify({ ok: true, skipped: "own_message" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const remoteJid = messageData.key?.remoteJid || "";
    if (remoteJid.endsWith("@g.us")) {
      return new Response(JSON.stringify({ ok: true, skipped: "group_message" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find integration
    const { data: integration } = await adminClient
      .from("integrations")
      .select("client_id, config")
      .eq("provider", "whatsapp")
      .eq("status", "connected")
      .limit(100);

    const match = (integration || []).find((i: any) => {
      const cfg = i.config as { instance_name?: string };
      return cfg?.instance_name === instanceName;
    });

    if (!match) {
      console.log("No matching integration for instance:", instanceName);
      return new Response(JSON.stringify({ ok: true, skipped: "no_match" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientId = match.client_id;
    const matchConfig = (match.config || {}) as Record<string, any>;
    const phone = remoteJid.replace("@s.whatsapp.net", "");
    const senderName = messageData.pushName || phone;

    // Extract message content
    const { content, type: msgType, metadata: msgMeta } = extractMessageContent(messageData);

    // For media messages, download via Evolution API and upload to Storage
    let finalContent = content;
    const isMedia = ["image", "audio", "video", "file"].includes(msgType);
    
    if (isMedia) {
      const mimetype = (msgMeta.mimetype as string) || "application/octet-stream";
      const publicUrl = await downloadAndStoreMedia(
        adminClient,
        matchConfig,
        messageData,
        msgType,
        mimetype
      );
      if (publicUrl) {
        finalContent = publicUrl;
        msgMeta.media_url = publicUrl;
      }
    }

    // Build display text
    const displayText = msgType === "text" ? finalContent
      : msgType === "audio" ? "🎵 Áudio"
      : msgType === "image" ? (msgMeta.caption as string) || "📷 Imagem"
      : msgType === "video" ? (msgMeta.caption as string) || "🎥 Vídeo"
      : msgType === "file" ? `📎 ${(msgMeta.filename as string) || "Arquivo"}`
      : finalContent;

    // Find or create conversation
    const { data: existingConv } = await adminClient
      .from("conversations")
      .select("id, unread_count, status")
      .eq("client_id", clientId)
      .eq("channel", "whatsapp")
      .eq("metadata->>phone", phone)
      .maybeSingle();

    let convId: string;
    if (existingConv) {
      convId = existingConv.id;
      await adminClient.from("conversations").update({
        last_message: displayText,
        last_message_at: new Date().toISOString(),
        unread_count: (existingConv.unread_count || 0) + 1,
        status: "open",
        updated_at: new Date().toISOString(),
      }).eq("id", convId);
    } else {
      const leadId = await findOrCreateLead(adminClient, clientId, phone, senderName, matchConfig);

      const { data: newConv, error: convError } = await adminClient
        .from("conversations")
        .insert({
          client_id: clientId,
          lead_id: leadId,
          channel: "whatsapp",
          status: "open",
          last_message: displayText,
          last_message_at: new Date().toISOString(),
          unread_count: 1,
          metadata: { phone, lead_name: senderName, priority: "medium" },
        })
        .select("id")
        .single();

      if (convError) {
        console.error("Error creating conversation:", convError);
        return new Response(JSON.stringify({ error: "Failed to create conversation" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      convId = newConv.id;
    }

    // Insert message
    await adminClient.from("messages").insert({
      client_id: clientId,
      conversation_id: convId,
      content: finalContent,
      type: msgType,
      direction: "inbound",
      sender_name: senderName,
      metadata: {
        whatsapp_message_id: messageData.key?.id,
        ...msgMeta,
      },
    });

    return new Response(JSON.stringify({ ok: true, conversation_id: convId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("Webhook error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
