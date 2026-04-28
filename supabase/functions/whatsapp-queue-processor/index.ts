import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-id, content-type",
};

interface QueueItem {
  id: string;
  client_id: string;
  conversation_id: string;
  message_data: any;
  source: string;
  attempt_count: number;
  max_attempts: number;
}

async function processQueueItem(adminClient: any, item: QueueItem): Promise<boolean> {
  try {
    // Atualizar status para 'processing'
    await adminClient
      .from("whatsapp_message_queue")
      .update({ status: "processing" })
      .eq("id", item.id);

    // Recuperar dados da conversa
    const { data: conversation } = await adminClient
      .from("conversations")
      .select("lead_id")
      .eq("id", item.conversation_id)
      .single();

    if (!conversation?.lead_id) {
      throw new Error("Conversation has no lead_id");
    }

    // Invocar automation engine se necessário
    const messageData = item.message_data;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    await fetch(`${supabaseUrl}/functions/v1/automation-engine`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        trigger_type: "new_message",
        client_id: item.client_id,
        lead_id: conversation.lead_id,
        message: messageData.content || "",
        message_type: messageData.type || "text",
        channel: item.source === "evolution" ? "whatsapp" : "whatsapp_official",
      }),
    });

    // Marcar como completado
    await adminClient
      .from("whatsapp_message_queue")
      .update({
        status: "completed",
        processed_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    console.log(`✓ Queue item ${item.id} processed successfully`);
    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const newAttemptCount = item.attempt_count + 1;
    const shouldRetry = newAttemptCount < item.max_attempts;

    console.error(`✗ Queue item ${item.id} failed (attempt ${newAttemptCount}):`, errorMsg);

    // Atualizar com novo tentativa ou marcar como falhado
    await adminClient
      .from("whatsapp_message_queue")
      .update({
        status: shouldRetry ? "pending" : "failed",
        attempt_count: newAttemptCount,
        error_message: errorMsg,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    return !shouldRetry; // Retorna true se falhou permanentemente
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("Starting WhatsApp queue processor...");

    // Buscar items pendentes
    const { data: queueItems, error: fetchError } = await adminClient
      .from("whatsapp_message_queue")
      .select("*")
      .eq("status", "pending")
      .lt("attempt_count", 5)
      .order("created_at", { ascending: true })
      .limit(100);

    if (fetchError) {
      throw new Error(`Failed to fetch queue: ${fetchError.message}`);
    }

    if (!queueItems || queueItems.length === 0) {
      console.log("No pending queue items");
      return new Response(
        JSON.stringify({ processed: 0, message: "No pending items" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${queueItems.length} pending items`);

    // Processar items em paralelo (com limite)
    const maxConcurrent = 5;
    let processedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < queueItems.length; i += maxConcurrent) {
      const batch = queueItems.slice(i, i + maxConcurrent);
      const results = await Promise.all(
        batch.map((item) => processQueueItem(adminClient, item))
      );

      processedCount += results.length;
      failedCount += results.filter(Boolean).length;
    }

    console.log(`Processed: ${processedCount}, Failed: ${failedCount}`);

    return new Response(
      JSON.stringify({
        processed: processedCount,
        failed: failedCount,
        success: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Queue processor error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message, success: false }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
