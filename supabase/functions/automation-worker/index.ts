import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_RETRIES = 4;

/** Exponential backoff delay: 2^attempt minutes (2, 4, 8, 16 min) */
function nextRetryAt(retryCount: number): string {
  const delayMs = Math.pow(2, retryCount) * 60 * 1000;
  return new Date(Date.now() + delayMs).toISOString();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env");
      return new Response(JSON.stringify({ error: "missing_env", processed: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200, // soft-fail para não estourar o invoke do client
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch pending queue items that are due. Tenta com next_retry_at;
    // se a coluna não existir (migration antiga), faz fallback sem o filtro.
    const now = new Date().toISOString();
    let queueItems: any[] | null = null;
    let error: any = null;

    {
      const res = await supabase
        .from("automation_queue")
        .select("*")
        .eq("status", "pending")
        .lte("scheduled_at", now)
        .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
        .limit(50);
      queueItems = res.data;
      error = res.error;
    }

    if (error) {
      console.warn("Primary query failed, retrying without next_retry_at:", error.message);
      const res = await supabase
        .from("automation_queue")
        .select("*")
        .eq("status", "pending")
        .lte("scheduled_at", now)
        .limit(50);
      queueItems = res.data;
      if (res.error) {
        console.error("Fallback query also failed:", res.error.message);
        return new Response(JSON.stringify({ error: res.error.message, processed: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    if (!queueItems || queueItems.length === 0) {
      return new Response(JSON.stringify({ message: "No items to process", processed: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const processed = [];

    for (const item of queueItems) {
      // Mark as processing to prevent duplicate pickup
      await supabase
        .from("automation_queue")
        .update({ status: "processing" })
        .eq("id", item.id);

      try {
        const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/automation-engine`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            tenant_id: item.tenant_id,
            automation_id: item.automation_id,
            lead_id: item.lead_id,
            node_id: item.node_id,
            context: item.context,
            // Recupera o run_id armazenado no contexto da fila (delay/timeout)
            run_id: (item.context as any)?._run_id ?? null,
          }),
        });

        if (!res.ok) {
          const err = await res.text();
          throw new Error(`Engine ${res.status}: ${err}`);
        }

        await supabase
          .from("automation_queue")
          .update({
            status: "completed",
            executed_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        processed.push({ id: item.id, status: "success" });
      } catch (err: any) {
        const retryCount = (item.retry_count ?? 0) + 1;

        if (retryCount <= MAX_RETRIES) {
          // Reschedule with exponential backoff
          await supabase
            .from("automation_queue")
            .update({
              status: "pending",
              retry_count: retryCount,
              next_retry_at: nextRetryAt(retryCount),
              error: err.message,
            })
            .eq("id", item.id);

          processed.push({
            id: item.id,
            status: "retrying",
            retry_count: retryCount,
            error: err.message,
          });
        } else {
          // Exhausted all retries
          await supabase
            .from("automation_queue")
            .update({
              status: "failed",
              error: `Max retries (${MAX_RETRIES}) exceeded. Last: ${err.message}`,
            })
            .eq("id", item.id);

          processed.push({ id: item.id, status: "failed", error: err.message });
        }
      }
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Worker Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
