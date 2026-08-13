// WhatsApp Message Queue Processor
// Triggered by Supabase Cron — processa itens pendentes da fila e aciona automation-engine.
// verify_jwt: false — função interna de cron, autentica internamente via SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

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
    // Claim atômico: sem o `status = 'pending'` na condição, duas execuções
    // concorrentes do cron (ou uma execução lenta sobreposta à seguinte)
    // pegavam o mesmo item e processavam a mensagem duas vezes.
    const { data: claimed } = await adminClient
      .from("whatsapp_message_queue")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", item.id)
      .eq("status", "pending")
      .select("id");

    if (!claimed || claimed.length === 0) {
      console.log(`Queue item ${item.id} já reivindicado por outra execução`);
      return true;
    }

    const { data: conversation } = await adminClient
      .from("conversations")
      .select("lead_id")
      .eq("id", item.conversation_id)
      .single();

    if (!conversation?.lead_id) {
      throw new Error("Conversation has no lead_id");
    }

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
        channel: item.source === "evolution" ? "whatsapp" : "whatsapp_cloud",
      }),
    });

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

    await adminClient
      .from("whatsapp_message_queue")
      .update({
        status: shouldRetry ? "pending" : "failed",
        attempt_count: newAttemptCount,
        error_message: errorMsg,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    return !shouldRetry;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Gatilho interno de cron: rejeita anon key (pública) e chamadas sem credencial.
  const cronBearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!cronBearer || cronBearer === (Deno.env.get("SUPABASE_ANON_KEY") ?? "")) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 403,
    });
  }

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("Starting WhatsApp queue processor...");

    // Reaper: item que ficou em `processing` (a função morreu no meio) nunca
    // mais era buscado — o SELECT só olha `pending`. 10 min é folgado o
    // bastante para não competir com uma execução ainda viva.
    const stuckBefore = new Date(Date.now() - 10 * 60_000).toISOString();
    const { data: reaped } = await adminClient
      .from("whatsapp_message_queue")
      .update({ status: "pending", updated_at: new Date().toISOString() })
      .eq("status", "processing")
      .lt("updated_at", stuckBefore)
      .select("id");
    if (reaped?.length) console.warn(`Reaped ${reaped.length} item(ns) presos em processing`);

    const { data: queueItems, error: fetchError } = await adminClient
      .from("whatsapp_message_queue")
      .select("*")
      .eq("status", "pending")
      // Itens da rota SDR (route='sdr') são consumidos por um serviço externo
      // na VPS — o cron do salesbot só processa os seus próprios.
      .eq("route", "salesbot")
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

    const maxConcurrent = 5;
    let processedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < queueItems.length; i += maxConcurrent) {
      const batch = queueItems.slice(i, i + maxConcurrent);
      const results = await Promise.all(
        batch.map((item) => processQueueItem(adminClient, item))
      );
      processedCount += results.length;
      // `false` = falhou e ainda vai ser retentado. Contava-se `Boolean`, que
      // é true no sucesso — o log de saúde reportava sucessos como falhas.
      failedCount += results.filter((ok) => !ok).length;
    }

    console.log(`Processed: ${processedCount}, Failed: ${failedCount}`);

    return new Response(
      JSON.stringify({ processed: processedCount, failed: failedCount, success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Queue processor error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message, success: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
