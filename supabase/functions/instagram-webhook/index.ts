import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

import { corsHeaders } from "../_shared/cors.ts";

async function sendPushNotification(
  adminClient: any,
  params: { title: string; body: string; tag: string; type: string; target_user_id?: string; target_client_id?: string; lead_id?: string }
) {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({
        title: params.title, body: params.body, tag: params.tag,
        target_user_id: params.target_user_id, target_client_id: params.target_client_id,
        data: { type: params.type, lead_id: params.lead_id },
      }),
    });
  } catch (err) {
    console.error("Push notification error:", err);
  }
}

async function downloadMetaMedia(adminClient: any, downloadUrl: string, mimetype: string): Promise<string | null> {
  try {
    const mediaRes = await fetch(downloadUrl);
    if (!mediaRes.ok) return null;
    const arrayBuffer = await mediaRes.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const cleanMime = (mimetype || "application/octet-stream").split(";")[0].trim();
    const extMap: Record<string, string> = {
      "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
      "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/aac": "aac",
      "video/mp4": "mp4", "application/pdf": "pdf",
    };
    const ext = extMap[cleanMime] || "bin";
    const fileName = `ig_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const { error: uploadError } = await adminClient.storage.from("whatsapp_media").upload(fileName, bytes, { contentType: cleanMime, upsert: false });
    if (uploadError) return null;

    const { data: { publicUrl } } = adminClient.storage.from("whatsapp_media").getPublicUrl(fileName);
    return publicUrl;
  } catch (err) { return null; }
}

async function findOrCreateLead(
  adminClient: any, clientId: string, senderId: string, senderName: string, config: Record<string, any>
): Promise<string | null> {
  // Use metadata->>phone as the IGSID
  const { data: existingLeads } = await adminClient
    .from("leads").select("id, created_at")
    .eq("client_id", clientId).eq("phone", senderId)
    .order("created_at", { ascending: true });

  if (existingLeads && existingLeads.length > 0) {
    return existingLeads[0].id;
  }

  let targetColId = config?.target_column_id;
  if (!targetColId) {
    const { data: firstCol } = await adminClient.from("pipeline_columns").select("id")
      .eq("client_id", clientId).order("order", { ascending: true }).limit(1).maybeSingle();
    targetColId = firstCol?.id;
  }
  if (!targetColId) return null;

  const { data: newLead } = await adminClient.from("leads").insert({
    client_id: clientId, name: senderName, phone: senderId, column_id: targetColId,
    tags: ["instagram-auto"], origin: "instagram",
  }).select("id").single();
  
  if (!newLead) return null;

  await adminClient.from("timeline_events").insert({
    client_id: clientId, lead_id: newLead.id, type: "stage_change",
    content: `Lead "${senderName}" criado automaticamente via Instagram Direct`, user_name: "Sistema",
  });

  sendPushNotification(adminClient, {
    title: "🆕 Novo Lead do Instagram",
    body: `${senderName} mandou DM`,
    tag: `lead-${newLead.id}`, type: "new_lead", target_client_id: clientId, lead_id: newLead.id,
  });

  return newLead.id;
}

async function upsertConversationAndMessage(
  adminClient: any, clientId: string, senderId: string, senderName: string,
  finalContent: string, msgType: string, msgMeta: Record<string, unknown>,
  channel: string, config: Record<string, any>, messageId?: string, isEcho: boolean = false
) {
  let displayText = finalContent;
  if (msgType === "audio") displayText = "🎵 Áudio";
  if (msgType === "image") displayText = "📷 Imagem";
  if (msgType === "video") displayText = "🎥 Vídeo";
  if (msgType === "file") displayText = "📎 Arquivo";

  const { data: existingConv } = await adminClient.from("conversations").select("id, unread_count, status")
    .eq("client_id", clientId).eq("channel", channel).eq("metadata->>phone", senderId).maybeSingle();

  let convId: string;
  if (existingConv) {
    convId = existingConv.id;
    await adminClient.from("conversations").update({
      last_message: displayText, last_message_at: new Date().toISOString(),
      unread_count: isEcho ? existingConv.unread_count : (existingConv.unread_count || 0) + 1, 
      status: "open", updated_at: new Date().toISOString(),
    }).eq("id", convId);
  } else {
    // If it's an echo and conversation doesn't exist, ignore or create
    const leadId = await findOrCreateLead(adminClient, clientId, senderId, senderName, config);
    const { data: newConv } = await adminClient.from("conversations").insert({
      client_id: clientId, lead_id: leadId, channel, status: "open",
      last_message: displayText, last_message_at: new Date().toISOString(), unread_count: isEcho ? 0 : 1,
      metadata: { phone: senderId, lead_name: senderName, priority: "medium" },
    }).select("id").single();
    if (!newConv) return null;
    convId = newConv.id;
  }

  await adminClient.from("messages").insert({
    client_id: clientId, conversation_id: convId, content: finalContent, type: msgType,
    direction: isEcho ? "outbound" : "inbound", sender_name: senderName,
    metadata: { meta_message_id: messageId, ...msgMeta },
  });

  return convId;
}

// Format logic: Map IG account ID -> integration config
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Webhook verification
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token) {
      const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: integrations } = await adminClient.from("integrations").select("config")
        .eq("provider", "instagram").limit(100);

      const validToken = (integrations || []).some((i: any) => {
        return (i.config as any)?.webhook_verify_token === token;
      });

      if (validToken || (integrations && integrations.length > 0)) {
        return new Response(challenge || "", { status: 200, headers: corsHeaders });
      }
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("IG Webhook received");

    if (body.object !== "instagram") {
      return new Response(JSON.stringify({ ok: true, skipped: "not_instagram" }), { headers: corsHeaders });
    }

    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const results: any[] = [];

    for (const entry of body.entry || []) {
      const igAccountId = entry.id; // Receiver IG Account
      // Find matching instagam integration
      const { data: integrations } = await adminClient.from("integrations").select("client_id, config")
        .eq("provider", "instagram").eq("status", "connected").limit(10);
      const match = (integrations || []).find((i: any) => (i.config as any)?.ig_account_id === igAccountId);
      if (!match) continue;

      const clientId = match.client_id;
      const config = match.config as any;

      for (const messaging of entry.messaging || []) {
        if (!messaging.message) continue;

        const isEcho = messaging.message.is_echo || false;
        
        let senderId = messaging.sender?.id;
        let recipientId = messaging.recipient?.id;
        
        // Se for um echo (enviado pelo App mas reportado no Webhook), invertemos: quem "enviou" é o IGAccountId pra gente
        // Mas a conversa pertence ao cliente (o verdadeiro destinatario da DM nesse caso)
        const conversationalIgId = isEcho ? recipientId : senderId;
        const senderName = isEcho ? "Você via IG" : `Instagram User (${conversationalIgId})`;

        let msgType = "text";
        let content = messaging.message.text || "";
        const meta: any = {};

        const attach = messaging.message.attachments?.[0];
        if (attach) {
          msgType = attach.type; // image, video, audio, file
          if (!["image","video","audio","file"].includes(msgType)) msgType = "file";
          const url = attach.payload?.url;
          if (url) {
            // Nativo do IG muitas vezes entrega URL pronta da CDN deles se valer o short-lived
            // Baixamos a midia pra garantir que fique sempre disponivel
            const publicUrl = await downloadMetaMedia(adminClient, url, "application/octet-stream");
            content = publicUrl || url;
            meta.media_url = content;
          }
        }

        const convId = await upsertConversationAndMessage(
          adminClient, clientId, conversationalIgId, senderName, content, msgType, meta,
          "instagram", config, messaging.message.mid, isEcho
        );

        if (!isEcho && convId) {
          const { data: conv } = await adminClient.from("conversations").select("lead_id").eq("id", convId).maybeSingle();
          if (conv?.lead_id) {
            const { data: lead } = await adminClient.from("leads").select("responsible_id").eq("id", conv.lead_id).maybeSingle();
            if (lead?.responsible_id) {
              sendPushNotification(adminClient, {
                title: `💬 DM Instagram`,
                body: content.slice(0, 100),
                tag: `ig-${convId}`, type: "new_message",
                target_user_id: lead.responsible_id, lead_id: conv.lead_id,
              });
            }
          }
        }
        results.push({ ok: true, convId });
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: results.length }), { headers: corsHeaders });
  } catch (err: unknown) {
    console.error("IG Webhook error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Error" }), { status: 500, headers: corsHeaders });
  }
});
