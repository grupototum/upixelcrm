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
  if (!msg) return { content: "[Mensagem vazia]", type: "text", metadata: {} };

  // Text messages
  if (msg.conversation) {
    return { content: msg.conversation, type: "text", metadata: {} };
  }
  if (msg.extendedTextMessage?.text) {
    return { content: msg.extendedTextMessage.text, type: "text", metadata: {} };
  }

  // Audio
  if (msg.audioMessage) {
    const url = msg.audioMessage.url || "";
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

  // Image
  if (msg.imageMessage) {
    const url = msg.imageMessage.url || "";
    const caption = msg.imageMessage.caption || "";
    return {
      content: url || "[Imagem]",
      type: "image",
      metadata: {
        caption,
        mimetype: msg.imageMessage.mimetype,
        media_url: url,
      },
    };
  }

  // Video
  if (msg.videoMessage) {
    const url = msg.videoMessage.url || "";
    const caption = msg.videoMessage.caption || "";
    return {
      content: url || "[Vídeo]",
      type: "video",
      metadata: {
        caption,
        mimetype: msg.videoMessage.mimetype,
        seconds: msg.videoMessage.seconds,
        media_url: url,
      },
    };
  }

  // Document / File
  if (msg.documentMessage) {
    const url = msg.documentMessage.url || "";
    const fileName = msg.documentMessage.fileName || "documento";
    return {
      content: url || `[Arquivo: ${fileName}]`,
      type: "file",
      metadata: {
        filename: fileName,
        mimetype: msg.documentMessage.mimetype,
        size: msg.documentMessage.fileLength,
        media_url: url,
      },
    };
  }

  // Sticker
  if (msg.stickerMessage) {
    const url = msg.stickerMessage.url || "";
    return {
      content: url || "[Sticker]",
      type: "image",
      metadata: { is_sticker: true, mimetype: msg.stickerMessage.mimetype, media_url: url },
    };
  }

  // Location
  if (msg.locationMessage) {
    const lat = msg.locationMessage.degreesLatitude;
    const lng = msg.locationMessage.degreesLongitude;
    return {
      content: `📍 Localização: ${lat}, ${lng}`,
      type: "text",
      metadata: { latitude: lat, longitude: lng, is_location: true },
    };
  }

  // Contact card
  if (msg.contactMessage) {
    return {
      content: `👤 Contato: ${msg.contactMessage.displayName || ""}`,
      type: "text",
      metadata: { vcard: msg.contactMessage.vcard, is_contact: true },
    };
  }

  return { content: "[Mensagem não suportada]", type: "text", metadata: {} };
}

async function findOrCreateLead(
  adminClient: any,
  clientId: string,
  phone: string,
  senderName: string,
  config: Record<string, any>
): Promise<string | null> {
  // Search by phone suffix
  const phoneSuffix = phone.length >= 8 ? phone.slice(-8) : phone;
  const { data: existingLeads } = await adminClient
    .from("leads")
    .select("id, created_at, tags, notes")
    .eq("client_id", clientId)
    .or(`phone.ilike.%${phoneSuffix}%`)
    .order("created_at", { ascending: true });

  if (existingLeads && existingLeads.length > 0) {
    const primaryLead = existingLeads[0];

    // Merge duplicates if any
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
      console.log("Merge completed.");
    }

    return primaryLead.id;
  }

  // Create new lead — find target column for THIS client
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

  // Create timeline event for the new lead
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

    // Skip group messages
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
    const phone = remoteJid.replace("@s.whatsapp.net", "");
    const senderName = messageData.pushName || phone;

    // Extract message content with media support
    const { content, type: msgType, metadata: msgMeta } = extractMessageContent(messageData);

    // Build display text for last_message preview
    const displayText = msgType === "text" ? content
      : msgType === "audio" ? "🎵 Áudio"
      : msgType === "image" ? (msgMeta.caption as string) || "📷 Imagem"
      : msgType === "video" ? (msgMeta.caption as string) || "🎥 Vídeo"
      : msgType === "file" ? `📎 ${(msgMeta.filename as string) || "Arquivo"}`
      : content;

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
      // Find or create lead
      const cfg = (match.config || {}) as Record<string, any>;
      const leadId = await findOrCreateLead(adminClient, clientId, phone, senderName, cfg);

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
          metadata: {
            phone,
            lead_name: senderName,
            priority: "medium",
          },
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

    // Insert message with full metadata
    await adminClient.from("messages").insert({
      client_id: clientId,
      conversation_id: convId,
      content,
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
