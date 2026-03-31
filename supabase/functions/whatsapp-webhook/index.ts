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
      .select("id, unread_count, status")
      .eq("client_id", clientId)
      .eq("channel", "whatsapp")
      .eq("metadata->>phone", phone)
      .maybeSingle();

    let convId: string;
    if (existingConv) {
      convId = existingConv.id;
      await adminClient.from("conversations").update({
        last_message: content,
        last_message_at: new Date().toISOString(),
        unread_count: (existingConv.unread_count || 0) + 1,
        status: "open", // Reopen if closed/resolved
        updated_at: new Date().toISOString(),
      }).eq("id", convId);
    } else {
      let leadId: string | null = null;

      // Robust Lead Search & Automatic Merging
      const phoneSuffix = phone.length >= 8 ? phone.slice(-8) : phone;
      const { data: duplicateLeads } = await adminClient.from("leads")
        .select("id, created_at, tags, notes")
        .eq("client_id", clientId)
        .or(`phone.ilike.%${phoneSuffix}%`)
        .order("created_at", { ascending: true });

      if (duplicateLeads && duplicateLeads.length > 0) {
        const primaryLead = duplicateLeads[0];
        leadId = primaryLead.id;

        // If we found more than one lead, we merge them
        if (duplicateLeads.length > 1) {
          console.log(`Merging ${duplicateLeads.length} duplicate leads for phone suffix ${phoneSuffix}`);
          const duplicates = duplicateLeads.slice(1);
          const duplicateIds = duplicates.map(d => d.id);

          // 1. Move Conversations
          await adminClient.from("conversations")
            .update({ lead_id: leadId })
            .in("lead_id", duplicateIds);

          // 2. Move Tasks
          await adminClient.from("tasks")
            .update({ lead_id: leadId })
            .in("lead_id", duplicateIds);

          // 3. Move Timeline Events
          await adminClient.from("timeline_events")
            .update({ lead_id: leadId })
            .in("lead_id", duplicateIds);

          // 4. Merge Tags & Notes
          let mergedTags = [...(primaryLead.tags || [])];
          let mergedNotes = primaryLead.notes || "";
          
          duplicates.forEach(d => {
            (d.tags || []).forEach(t => { if (!mergedTags.includes(t)) mergedTags.push(t); });
            if (d.notes) mergedNotes += `\n[Merged Note]: ${d.notes}`;
          });

          await adminClient.from("leads")
            .update({ tags: mergedTags, notes: mergedNotes })
            .eq("id", leadId);

          // 5. Delete Duplicates
          await adminClient.from("leads")
            .delete()
            .in("id", duplicateIds);
            
          console.log("Merge completed successfully.");
        }
      }

      if (!leadId) {
        // Create lead automatically
        // Check for default column in integration config, otherwise fallback to first column
        const cfg = match.config as { target_column_id?: string };
        let targetColId = cfg?.target_column_id;

        if (!targetColId) {
          const { data: firstCol } = await adminClient
            .from("pipeline_columns")
            .select("id")
            .order("order", { ascending: true })
            .limit(1)
            .maybeSingle();
          targetColId = firstCol?.id;
        }

        if (targetColId) {
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
          
          if (newLead) {
            leadId = newLead.id;
            console.log("Created new lead from WhatsApp:", senderName, leadId, "at column:", targetColId);
          } else if (leadError) {
            console.error("Error creating lead:", leadError);
          }
        } else {
          console.error("No pipeline columns found for automatic lead creation.");
        }
      }

      const { data: newConv, error: convError } = await adminClient.from("conversations").insert({
        client_id: clientId,
        lead_id: leadId,
        channel: "whatsapp",
        status: "open",
        last_message: content,
        last_message_at: new Date().toISOString(),
        unread_count: 1,
        metadata: { 
          phone, 
          lead_name: senderName,
          priority: "medium", // Default priority for new chats
        },
      }).select("id").single();

      if (convError) {
        console.error("Error creating conversation:", convError);
        return new Response(JSON.stringify({ error: "Failed to create conversation" }), { status: 500, headers: corsHeaders });
      }
      convId = newConv.id;
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
