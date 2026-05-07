import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

import { corsHeaders } from "../_shared/cors.ts";

// ─── Push notification helper ───
async function sendPushNotification(
  adminClient: any,
  params: { title: string; body: string; tag: string; type: string; target_user_id?: string; target_client_id?: string; lead_id?: string }
) {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        title: params.title,
        body: params.body,
        tag: params.tag,
        target_user_id: params.target_user_id,
        target_client_id: params.target_client_id,
        data: { type: params.type, lead_id: params.lead_id },
      }),
    });
  } catch (err) {
    console.error("Push notification error (non-blocking):", err);
  }
}

interface MediaInfo {
  content: string;
  type: string;
  metadata: Record<string, unknown>;
}

// ─── Evolution API (Baileys) message extraction ───
function extractMessageContent(messageData: any): MediaInfo {
  const msg = messageData.message;
  const mediaUrl = messageData.mediaUrl;
  if (!msg) return { content: "[Mensagem vazia]", type: "text", metadata: {} };

  if (msg.conversation) return { content: msg.conversation, type: "text", metadata: {} };
  if (msg.extendedTextMessage?.text) return { content: msg.extendedTextMessage.text, type: "text", metadata: {} };

  if (msg.audioMessage) {
    const url = mediaUrl || msg.audioMessage.url || "";
    return { content: url || "[Áudio]", type: "audio", metadata: { mimetype: msg.audioMessage.mimetype, seconds: msg.audioMessage.seconds, media_url: url } };
  }
  if (msg.imageMessage) {
    const url = mediaUrl || msg.imageMessage.url || "";
    return { content: url || "[Imagem]", type: "image", metadata: { caption: msg.imageMessage.caption || "", mimetype: msg.imageMessage.mimetype, media_url: url } };
  }
  if (msg.videoMessage) {
    const url = mediaUrl || msg.videoMessage.url || "";
    return { content: url || "[Vídeo]", type: "video", metadata: { caption: msg.videoMessage.caption || "", mimetype: msg.videoMessage.mimetype, seconds: msg.videoMessage.seconds, media_url: url } };
  }
  if (msg.documentMessage) {
    const url = mediaUrl || msg.documentMessage.url || "";
    const fileName = msg.documentMessage.fileName || "documento";
    return { content: url || `[Arquivo: ${fileName}]`, type: "file", metadata: { filename: fileName, caption: msg.documentMessage.caption || "", mimetype: msg.documentMessage.mimetype, size: msg.documentMessage.fileLength, media_url: url } };
  }
  if (msg.stickerMessage) {
    const url = mediaUrl || msg.stickerMessage.url || "";
    return { content: url || "[Sticker]", type: "image", metadata: { is_sticker: true, mimetype: msg.stickerMessage.mimetype, media_url: url } };
  }
  if (msg.locationMessage) {
    const lat = msg.locationMessage.degreesLatitude;
    const lng = msg.locationMessage.degreesLongitude;
    return { content: `📍 Localização: ${lat}, ${lng}`, type: "text", metadata: { latitude: lat, longitude: lng, is_location: true } };
  }
  if (msg.contactMessage) {
    return { content: `👤 Contato: ${msg.contactMessage.displayName || ""}`, type: "text", metadata: { vcard: msg.contactMessage.vcard, is_contact: true } };
  }
  return { content: "[Mensagem não suportada]", type: "text", metadata: {} };
}

// ─── Meta Official API message extraction ───
function extractOfficialMessageContent(msg: any): MediaInfo {
  const msgType = msg.type;
  if (msgType === "text") {
    return { content: msg.text?.body || "", type: "text", metadata: {} };
  }
  if (msgType === "image") {
    return { content: "[Imagem]", type: "image", metadata: { media_id: msg.image?.id, caption: msg.image?.caption || "", mimetype: msg.image?.mime_type } };
  }
  if (msgType === "video") {
    return { content: "[Vídeo]", type: "video", metadata: { media_id: msg.video?.id, caption: msg.video?.caption || "", mimetype: msg.video?.mime_type } };
  }
  if (msgType === "audio") {
    return { content: "[Áudio]", type: "audio", metadata: { media_id: msg.audio?.id, mimetype: msg.audio?.mime_type } };
  }
  if (msgType === "document") {
    const fn = msg.document?.filename || "documento";
    return { content: `[Arquivo: ${fn}]`, type: "file", metadata: { media_id: msg.document?.id, filename: fn, caption: msg.document?.caption || "", mimetype: msg.document?.mime_type } };
  }
  if (msgType === "sticker") {
    return { content: "[Sticker]", type: "image", metadata: { media_id: msg.sticker?.id, is_sticker: true, mimetype: msg.sticker?.mime_type } };
  }
  if (msgType === "location") {
    return { content: `📍 Localização: ${msg.location?.latitude}, ${msg.location?.longitude}`, type: "text", metadata: { latitude: msg.location?.latitude, longitude: msg.location?.longitude, is_location: true } };
  }
  if (msgType === "contacts") {
    const name = msg.contacts?.[0]?.name?.formatted_name || "";
    return { content: `👤 Contato: ${name}`, type: "text", metadata: { is_contact: true } };
  }
  return { content: "[Mensagem não suportada]", type: "text", metadata: {} };
}

// ─── Download media from Evolution API and upload to Storage ───
async function downloadAndStoreMedia(
  adminClient: any, config: Record<string, any>, messageData: any, msgType: string, mimetype: string
): Promise<string | null> {
  try {
    const { api_url: apiUrl, api_key: apiKey, instance_name: instanceName } = config;
    if (!apiUrl || !apiKey || !instanceName) return null;

    const messageKey = messageData.key;
    const response = await fetch(`${apiUrl}/chat/getBase64FromMediaMessage/${instanceName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: apiKey },
      body: JSON.stringify({ message: { key: { id: messageKey.id || "", remoteJid: messageKey.remoteJid || "", fromMe: messageKey.fromMe || false } }, convertToMp4: msgType === "video" }),
    });
    if (!response.ok) { console.error("Failed to get base64 media:", response.status); return null; }

    const result = await response.json();
    let base64Data = result.base64;
    if (!base64Data) return null;
    if (base64Data.includes(",")) base64Data = base64Data.split(",")[1];

    const extMap: Record<string, string> = {
      "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
      "audio/ogg; codecs=opus": "ogg", "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a",
      "video/mp4": "mp4", "application/pdf": "pdf",
    };
    const cleanMime = (mimetype || "application/octet-stream").split(";")[0].trim();
    const ext = extMap[mimetype] || extMap[cleanMime] || "bin";
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const binary = atob(base64Data);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const { error: uploadError } = await adminClient.storage.from("whatsapp_media").upload(fileName, bytes, { contentType: cleanMime, upsert: false });
    if (uploadError) { console.error("Storage upload error:", uploadError); return null; }

    const { data: { publicUrl } } = adminClient.storage.from("whatsapp_media").getPublicUrl(fileName);
    console.log("Media uploaded:", publicUrl);
    return publicUrl;
  } catch (err) { console.error("Error downloading/storing media:", err); return null; }
}

// ─── Download media from Meta Graph API and upload to Storage ───
async function downloadOfficialMedia(
  adminClient: any, mediaId: string, accessToken: string, mimetype: string
): Promise<string | null> {
  try {
    // Step 1: Get media URL from Graph API
    const metaRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!metaRes.ok) { console.error("Failed to get media URL from Meta:", metaRes.status); return null; }
    const metaData = await metaRes.json();
    const downloadUrl = metaData.url;
    if (!downloadUrl) return null;

    // Step 2: Download the media binary
    const mediaRes = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!mediaRes.ok) { console.error("Failed to download media from Meta:", mediaRes.status); return null; }
    const arrayBuffer = await mediaRes.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const cleanMime = (mimetype || "application/octet-stream").split(";")[0].trim();
    const extMap: Record<string, string> = {
      "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
      "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/aac": "aac",
      "video/mp4": "mp4", "application/pdf": "pdf",
    };
    const ext = extMap[cleanMime] || "bin";
    const fileName = `official_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const { error: uploadError } = await adminClient.storage.from("whatsapp_media").upload(fileName, bytes, { contentType: cleanMime, upsert: false });
    if (uploadError) { console.error("Storage upload error:", uploadError); return null; }

    const { data: { publicUrl } } = adminClient.storage.from("whatsapp_media").getPublicUrl(fileName);
    console.log("Official media uploaded:", publicUrl);
    return publicUrl;
  } catch (err) { console.error("Error downloading official media:", err); return null; }
}

// ─── Find or create lead ───
async function findOrCreateLead(
  adminClient: any, clientId: string, phone: string, senderName: string, config: Record<string, any>
): Promise<string | null> {
  const cleanPhone = phone.replace(/\D/g, '');
  const phoneSuffix8 = cleanPhone.length >= 8 ? cleanPhone.slice(-8) : cleanPhone;
  const phoneSuffix9 = cleanPhone.length >= 9 ? cleanPhone.slice(-9) : cleanPhone;
  
  // Try matching by suffix first (more precise)
  const { data: existingLeads } = await adminClient
    .from("leads").select("id, created_at, tags, notes, phone")
    .eq("client_id", clientId)
    .or(`phone.ilike.%${phoneSuffix8},phone.ilike.%${phoneSuffix9}`)
    .order("created_at", { ascending: true });

  if (existingLeads && existingLeads.length > 0) {
    const primaryLead = existingLeads[0];
    if (existingLeads.length > 1) {
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
        (d.tags || []).forEach((t: string) => { if (!mergedTags.includes(t)) mergedTags.push(t); });
        if (d.notes) mergedNotes += `\n[Nota mesclada]: ${d.notes}`;
      });
      await adminClient.from("leads").update({ tags: mergedTags, notes: mergedNotes }).eq("id", primaryLead.id);
      await adminClient.from("leads").delete().in("id", duplicateIds);
    }
    return primaryLead.id;
  }

  let targetColId = config?.target_column_id;
  if (!targetColId) {
    const { data: firstCol } = await adminClient.from("pipeline_columns").select("id")
      .eq("client_id", clientId).order("order", { ascending: true }).limit(1).maybeSingle();
    targetColId = firstCol?.id;
  }
  if (!targetColId) {
    // Cria pipeline padrão automaticamente para clients que ainda não configuraram
    console.log("No pipeline columns — creating default for client:", clientId);
    const defaultCols = [
      { client_id: clientId, name: "Novo", order: 0, color: "#3b82f6" },
      { client_id: clientId, name: "Em Atendimento", order: 1, color: "#f59e0b" },
      { client_id: clientId, name: "Negociação", order: 2, color: "#8b5cf6" },
      { client_id: clientId, name: "Ganho", order: 3, color: "#10b981" },
      { client_id: clientId, name: "Perdido", order: 4, color: "#ef4444" },
    ];
    const { data: created, error: colErr } = await adminClient.from("pipeline_columns")
      .insert(defaultCols).select("id").order("order", { ascending: true });
    if (colErr || !created?.length) {
      console.error("Failed to create default pipeline columns:", colErr);
      return null;
    }
    targetColId = created[0].id;
  }

  const { data: newLead, error: leadError } = await adminClient.from("leads").insert({
    client_id: clientId, name: senderName, phone, column_id: targetColId,
    tags: ["whatsapp-auto"], origin: "whatsapp",
  }).select("id").single();
  if (leadError) { console.error("Error creating lead:", leadError); return null; }

  await adminClient.from("timeline_events").insert({
    client_id: clientId, lead_id: newLead.id, type: "stage_change",
    content: `Lead "${senderName}" criado automaticamente via WhatsApp`, user_name: "Sistema",
  });
  console.log("Created lead:", newLead.id);

  // Trigger automation for new lead
  triggerAutomations(adminClient, clientId, "new_lead", newLead.id, { origin: "whatsapp" });

  // Push notification for new lead (broadcast to all users of this client)
  sendPushNotification(adminClient, {
    title: "🆕 Novo Lead",
    body: `${senderName} entrou via WhatsApp`,
    tag: `lead-${newLead.id}`,
    type: "new_lead",
    target_client_id: clientId,
    lead_id: newLead.id,
  });

  return newLead.id;
}

// ─── Trigger Complex Automations ───
async function triggerAutomations(adminClient: any, clientId: string, eventType: string, leadId: string, context: any) {
  try {
    // PARTE 1 (Salesbot): retoma runs em status='waiting' para esse lead.
    // Quando o lead manda uma mensagem, qualquer automação parada num
    // wait_for_reply deve continuar a partir do próximo nó.
    if (eventType === "new_message" || eventType?.startsWith("message_received")) {
      const { data: waitingRuns } = await adminClient
        .from("automation_runs")
        .select("id, automation_id, current_node_id, context")
        .eq("lead_id", leadId)
        .eq("status", "waiting");

      for (const run of waitingRuns ?? []) {
        try {
          const { data: auto } = await adminClient
            .from("automations")
            .select("nodes, edges")
            .eq("id", run.automation_id)
            .single();
          if (!auto) continue;

          const edges = auto.edges || [];
          const replyEdge =
            edges.find((e: any) => e.source === run.current_node_id && e.sourceHandle === "reply") ??
            edges.find((e: any) => e.source === run.current_node_id);

          if (!replyEdge) {
            // Sem próximo nó — finaliza o run
            await adminClient
              .from("automation_runs")
              .update({ status: "completed", finished_at: new Date().toISOString() })
              .eq("id", run.id);
            continue;
          }

          // Salva a mensagem do lead em context[saveAs] e retoma o engine
          const saveAs = (run.context as any)?._wait_save_as ?? "last_reply";
          const newContext = {
            ...(run.context as any),
            ...context,
            [saveAs]: context.message ?? context.last_message ?? "",
          };

          await adminClient
            .from("automation_runs")
            .update({ status: "running", context: newContext })
            .eq("id", run.id);

          fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/automation-engine`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              tenant_id: (run.context as any)?.tenant_id,
              automation_id: run.automation_id,
              lead_id: leadId,
              node_id: replyEdge.target,
              context: newContext,
              run_id: run.id,
            }),
          }).catch((err: any) => console.error("Error resuming run:", err));
        } catch (innerErr) {
          console.error("Failed to resume run:", run.id, innerErr);
        }
      }
    }

    // PARTE 2: dispara triggers normais (cria novos runs)
    const { data: automations } = await adminClient.from("automations").select("*")
      .eq("client_id", clientId).eq("status", "active");

    for (const auto of automations || []) {
      const nodes = auto.nodes || [];
      const triggerNodes = nodes.filter((n: any) => n.type === 'trigger' && n.data?.type === eventType);

      for (const trigger of triggerNodes) {
        console.log(`Triggering automation ${auto.id} via node ${trigger.id}`);
        fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/automation-engine`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
          },
          body: JSON.stringify({
            tenant_id: auto.tenant_id,
            automation_id: auto.id,
            lead_id: leadId,
            node_id: trigger.id,
            context
          })
        }).catch((err: any) => console.error("Error invoking engine:", err));
      }
    }
  } catch (err) {
    console.error("Error finding automations:", err);
  }
}

// Build display text from message type
function buildDisplayText(msgType: string, content: string, meta: Record<string, unknown>): string {
  if (msgType === "text") return content;
  if (msgType === "audio") return "🎵 Áudio";
  if (msgType === "image") return (meta.caption as string) || "📷 Imagem";
  if (msgType === "video") return (meta.caption as string) || "🎥 Vídeo";
  if (msgType === "file") return `📎 ${(meta.filename as string) || "Arquivo"}`;
  return content;
}

// Map disallowed message types to allowed ones (pre-migration constraint)
function fallbackMessageType(type: string): string {
  if (type === "video") return "file";
  if (type === "sticker") return "image";
  if (type === "document") return "file";
  if (type === "location" || type === "contact") return "text";
  return type;
}

// Insert conversation with fallbacks for missing columns / disallowed channels
async function safeInsertConversation(adminClient: any, payload: any) {
  let { data, error } = await adminClient.from("conversations").insert(payload).select("id").single();
  if (!error) return { data, error: null };

  // Fallback 1: integration_id column doesn't exist
  if (error.message?.includes("integration_id") || error.code === "PGRST204") {
    const { integration_id, ...rest } = payload;
    ({ data, error } = await adminClient.from("conversations").insert(rest).select("id").single());
    if (!error) return { data, error: null };
  }

  // Fallback 2: channel not allowed by check constraint (e.g. whatsapp_official)
  if (error?.code === "23514" || error?.message?.includes("conversations_channel_check")) {
    const { integration_id, ...rest } = payload;
    const fallbackPayload = {
      ...rest,
      channel: "whatsapp",
      metadata: { ...(payload.metadata || {}), original_channel: payload.channel },
    };
    ({ data, error } = await adminClient.from("conversations").insert(fallbackPayload).select("id").single());
  }

  return { data, error };
}

// Insert message with fallback for disallowed types
async function safeInsertMessage(adminClient: any, payload: any) {
  let { data, error } = await adminClient.from("messages").insert(payload);
  if (!error) return { data, error: null };

  // Fallback: type not allowed by check constraint
  if (error?.code === "23514" || error?.message?.includes("messages_type_check")) {
    const fallbackPayload = {
      ...payload,
      type: fallbackMessageType(payload.type),
      metadata: { ...(payload.metadata || {}), original_type: payload.type },
    };
    ({ data, error } = await adminClient.from("messages").insert(fallbackPayload));
  }

  return { data, error };
}

// ─── Upsert conversation and insert message ───
async function upsertConversationAndMessage(
  adminClient: any, clientId: string, phone: string, senderName: string,
  finalContent: string, msgType: string, msgMeta: Record<string, unknown>,
  channel: string, config: Record<string, any>, messageId?: string,
  integrationId?: string
) {
  const displayText = buildDisplayText(msgType, finalContent, msgMeta);

  // Look up existing conversation by (client_id, channel, phone)
  // Note: avoid filtering by integration_id - column may not exist yet
  const { data: existingConv } = await adminClient.from("conversations")
    .select("id, unread_count, status")
    .eq("client_id", clientId)
    .eq("channel", channel)
    .eq("metadata->>phone", phone)
    .maybeSingle();

  let convId: string;
  if (existingConv) {
    convId = existingConv.id;
    await adminClient.from("conversations").update({
      last_message: displayText, last_message_at: new Date().toISOString(),
      unread_count: (existingConv.unread_count || 0) + 1, status: "open", updated_at: new Date().toISOString(),
    }).eq("id", convId);
  } else {
    const leadId = await findOrCreateLead(adminClient, clientId, phone, senderName, config);
    const insertPayload = {
      client_id: clientId, lead_id: leadId, channel, status: "open",
      last_message: displayText, last_message_at: new Date().toISOString(), unread_count: 1,
      integration_id: integrationId ?? null,
      metadata: { phone, lead_name: senderName, priority: "medium", instance_name: config?.instance_name ?? null },
    };
    const { data: newConv, error: convError } = await safeInsertConversation(adminClient, insertPayload);
    if (convError) { console.error("Error creating conversation:", convError); return null; }
    convId = newConv.id;
  }

  const msgPayload = {
    client_id: clientId, conversation_id: convId, content: finalContent, type: msgType,
    direction: "inbound", sender_name: senderName,
    metadata: { whatsapp_message_id: messageId, ...msgMeta },
  };
  const { error: msgError } = await safeInsertMessage(adminClient, msgPayload);
  if (msgError) console.error("Error inserting message:", msgError);

  return convId;
}

// ─── Handle Evolution API (Baileys) webhook ───
async function handleEvolutionWebhook(body: any, adminClient: any) {
  const instanceName = body.instance;
  const messageData = body.data;

  if (!messageData || messageData.key?.fromMe) return { ok: true, skipped: "own_message" };

  const remoteJid = messageData.key?.remoteJid || "";
  if (remoteJid.endsWith("@g.us")) return { ok: true, skipped: "group_message" };

  // Find integration by instance name — also accept non-connected (configured) instances
  const { data: integrations } = await adminClient.from("integrations").select("id, client_id, config")
    .eq("provider", "whatsapp").limit(200);

  const match = (integrations || []).find((i: any) => (i.config as any)?.instance_name === instanceName);
  if (!match) {
    console.log("No matching integration for instance:", instanceName);
    return { ok: true, skipped: "no_match" };
  }

  const clientId = match.client_id;
  const integrationId = match.id as string;
  const matchConfig = (match.config || {}) as Record<string, any>;
  const phone = remoteJid.replace("@s.whatsapp.net", "");
  const senderName = messageData.pushName || phone;

  const { content, type: msgType, metadata: msgMeta } = extractMessageContent(messageData);

  let finalContent = content;
  const isMedia = ["image", "audio", "video", "file"].includes(msgType);
  if (isMedia) {
    const mimetype = (msgMeta.mimetype as string) || "application/octet-stream";
    const publicUrl = await downloadAndStoreMedia(adminClient, matchConfig, messageData, msgType, mimetype);
    if (publicUrl) { finalContent = publicUrl; msgMeta.media_url = publicUrl; }
  }

  const convId = await upsertConversationAndMessage(
    adminClient, clientId, phone, senderName, finalContent, msgType, msgMeta,
    "whatsapp", matchConfig, messageData.key?.id, integrationId
  );

  // Trigger Automations
  if (convId) {
    const { data: conv } = await adminClient.from("conversations").select("lead_id").eq("id", convId).maybeSingle();
    if (conv?.lead_id) {
      triggerAutomations(adminClient, clientId, "new_message", conv.lead_id, {
        message: finalContent,
        message_type: msgType,
        channel: "whatsapp",
      });

      const { data: lead } = await adminClient.from("leads").select("responsible_id").eq("id", conv.lead_id).maybeSingle();
      const targetUserId = lead?.responsible_id;
      if (targetUserId) {
        sendPushNotification(adminClient, {
          title: `💬 ${senderName}`,
          body: buildDisplayText(msgType, finalContent, msgMeta).slice(0, 100),
          tag: `msg-${convId}`,
          type: "new_message",
          target_user_id: targetUserId,
          lead_id: conv.lead_id,
        });
      }
    }
  }

  return { ok: true, conversation_id: convId };
}

// ─── Handle Meta Official API webhook ───
async function handleOfficialWebhook(body: any, adminClient: any) {
  const results: any[] = [];

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== "messages") continue;
      const value = change.value;
      if (!value?.messages) continue;

      const phoneNumberId = value.metadata?.phone_number_id;

      // Find integration by phone_number_id
      const { data: integrations } = await adminClient.from("integrations").select("id, client_id, config, access_token")
        .eq("provider", "whatsapp_official").limit(200);

      const match = (integrations || []).find((i: any) => (i.config as any)?.phone_number_id === phoneNumberId);
      if (!match) {
        console.log("No matching official integration for phone_number_id:", phoneNumberId);
        continue;
      }

      const clientId = match.client_id;
      const integrationId = match.id as string;
      const matchConfig = (match.config || {}) as Record<string, any>;
      const accessToken = matchConfig.access_token || match.access_token || "";

      // Build contacts map for sender names
      const contactsMap: Record<string, string> = {};
      for (const c of value.contacts || []) {
        contactsMap[c.wa_id] = c.profile?.name || c.wa_id;
      }

      for (const msg of value.messages) {
        const senderPhone = msg.from;
        const senderName = contactsMap[senderPhone] || senderPhone;

        const { content, type: msgType, metadata: msgMeta } = extractOfficialMessageContent(msg);

        let finalContent = content;
        const mediaId = msgMeta.media_id as string | undefined;
        if (mediaId && accessToken) {
          const mimetype = (msgMeta.mimetype as string) || "application/octet-stream";
          const publicUrl = await downloadOfficialMedia(adminClient, mediaId, accessToken, mimetype);
          if (publicUrl) { finalContent = publicUrl; msgMeta.media_url = publicUrl; }
        }

        const convId = await upsertConversationAndMessage(
          adminClient, clientId, senderPhone, senderName, finalContent, msgType, msgMeta,
          "whatsapp_official", matchConfig, msg.id, integrationId
        );

        // Trigger Automations
        if (convId) {
          const { data: conv } = await adminClient.from("conversations").select("lead_id").eq("id", convId).maybeSingle();
          if (conv?.lead_id) {
            triggerAutomations(adminClient, clientId, "new_message", conv.lead_id, { 
              message: finalContent, 
              message_type: msgType, 
              channel: "whatsapp_official" 
            });

            const { data: lead } = await adminClient.from("leads").select("responsible_id").eq("id", conv.lead_id).maybeSingle();
            const targetUserId = lead?.responsible_id;
            if (targetUserId) {
              sendPushNotification(adminClient, {
                title: `💬 ${senderName}`,
                body: buildDisplayText(msgType, finalContent, msgMeta).slice(0, 100),
                tag: `msg-${convId}`,
                type: "new_message",
                target_user_id: targetUserId,
                lead_id: conv.lead_id,
              });
            }
          }
        }

        results.push({ ok: true, conversation_id: convId });
      }
    }
  }

  return results.length > 0 ? results[0] : { ok: true, skipped: "no_messages" };
}

// ─── Main handler ───
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Meta webhook verification (GET request)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token) {
      // Verify token against stored integrations
      const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: integrations } = await adminClient.from("integrations").select("config")
        .eq("provider", "whatsapp_official").limit(100);

      const validToken = (integrations || []).some((i: any) => {
        const cfg = i.config as any;
        return cfg?.webhook_verify_token === token;
      });

      // FIX-01: Only accept the challenge when the token actually matches a stored
      // verify_token. The previous fallback `|| integrations.length > 0` allowed any
      // request that arrived while ANY official integration existed to pass verification,
      // completely bypassing the token check and enabling fraudulent webhook registration.
      if (validToken) {
        return new Response(challenge || "", { status: 200, headers: corsHeaders });
      }
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Webhook received");

    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Detect format: Meta Official API has "object": "whatsapp_business_account"
    if (body.object === "whatsapp_business_account") {
      const result = await handleOfficialWebhook(body, adminClient);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Evolution API format
    const event = body.event;
    
    // Handle message events
    if (event === "messages.upsert") {
      const result = await handleEvolutionWebhook(body, adminClient);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle connection status updates
    if (event === "connection.update") {
      const instanceName = body.instance;
      const state = body.data?.state;
      if (instanceName && state) {
        let newStatus = "disconnected";
        if (state === "open") newStatus = "connected";
        else if (state === "connecting") newStatus = "connecting";

        await adminClient.from("integrations").update({ status: newStatus })
          .eq("provider", "whatsapp") // FIX-05: Permite atualização de desconectados
          .filter("config->>instance_name", "eq", instanceName);
          
        console.log(`Connection update for ${instanceName}: ${state} -> ${newStatus}`);
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Skip other events
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
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
