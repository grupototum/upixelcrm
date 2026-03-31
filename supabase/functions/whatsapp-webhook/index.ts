import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body).slice(0, 500));

    // Evolution API webhook payload structure
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

    // Find which client owns this instance
    const { data: integration } = await adminClient.from("integrations")
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
    const remoteJid = messageData.key?.remoteJid || "";
    const phone = remoteJid.replace("@s.whatsapp.net", "").replace("@g.us", "");
    const senderName = messageData.pushName || phone;

    // Extract message content
    let content = "";
    let msgType = "text";
    if (messageData.message?.conversation) {
      content = messageData.message.conversation;
    } else if (messageData.message?.extendedTextMessage?.text) {
      content = messageData.message.extendedTextMessage.text;
    } else if (messageData.message?.audioMessage) {
      content = "[Áudio]";
      msgType = "audio";
    } else if (messageData.message?.imageMessage) {
      content = messageData.message.imageMessage.caption || "[Imagem]";
      msgType = "image";
    } else if (messageData.message?.documentMessage) {
      content = messageData.message.documentMessage.fileName || "[Arquivo]";
      msgType = "file";
    } else {
      content = "[Mensagem não suportada]";
    }

    // Find or create conversation
    const { data: existingConv } = await adminClient.from("conversations")
      .select("id, unread_count")
      .eq("client_id", clientId)
      .eq("channel", "whatsapp")
      .eq("metadata->>phone", phone)
      .single();

    let convId: string;
    if (existingConv) {
      convId = existingConv.id;
      await adminClient.from("conversations").update({
        last_message: content,
        last_message_at: new Date().toISOString(),
        unread_count: (existingConv.unread_count || 0) + 1,
        status: "open",
      }).eq("id", convId);
    } else {
      // Try to find lead by phone
      const { data: lead } = await adminClient.from("leads")
        .select("id, name")
        .eq("client_id", clientId)
        .or(`phone.ilike.%${phone.slice(-8)}%`)
        .limit(1)
        .maybeSingle();

      let leadId = lead?.id || null;

      if (!leadId) {
        // Create lead automatically
        // Get the first column to place the lead
        const { data: firstCol } = await adminClient
          .from("pipeline_columns")
          .select("id")
          .order("order", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (firstCol) {
          const { data: newLead } = await adminClient
            .from("leads")
            .insert({
              client_id: clientId,
              name: senderName,
              phone: phone,
              column_id: firstCol.id,
              tags: ["whatsapp-auto"],
              origin: "whatsapp",
            })
            .select("id")
            .single();
          
          if (newLead) {
            leadId = newLead.id;
            console.log("Created new lead from WhatsApp:", senderName, leadId);
          }
        }
      }

      const { data: newConv } = await adminClient.from("conversations").insert({
        client_id: clientId,
        lead_id: leadId,
        channel: "whatsapp",
        status: "open",
        last_message: content,
        last_message_at: new Date().toISOString(),
        unread_count: 1,
        metadata: { phone, lead_name: senderName },
      }).select("id").single();

      convId = newConv!.id;
    }

    // Insert message
    await adminClient.from("messages").insert({
      client_id: clientId,
      conversation_id: convId,
      content,
      type: msgType,
      direction: "inbound",
      sender_name: senderName,
      metadata: { whatsapp_message_id: messageData.key?.id },
    });

    // Update unread count
    const { count } = await adminClient.from("messages")
      .select("*", { count: "exact", head: true })
      .eq("conversation_id", convId)
      .eq("direction", "inbound");

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
