import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Fetch pending queue items that are due
    const { data: queueItems, error } = await supabase
      .from("automation_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .limit(50); // Process in batches

    if (error) throw error;
    if (!queueItems || queueItems.length === 0) {
      return new Response(JSON.stringify({ message: "No items to process" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const processed = [];

    // 2. Process each item
    for (const item of queueItems) {
      // Mark as processing
      await supabase
        .from("automation_queue")
        .update({ status: "processing" })
        .eq("id", item.id);

      try {
        // Trigger automation engine
        const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/automation-engine`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
          },
          body: JSON.stringify({
            tenant_id: item.tenant_id,
            automation_id: item.automation_id,
            lead_id: item.lead_id,
            node_id: item.node_id,
            context: item.context
          })
        });

        if (!res.ok) {
          const err = await res.text();
          throw new Error(err);
        }

        // Mark as completed
        await supabase
          .from("automation_queue")
          .update({ 
            status: "completed",
            executed_at: new Date().toISOString() 
          })
          .eq("id", item.id);
          
        processed.push({ id: item.id, status: 'success' });
      } catch (err: any) {
        // Mark as failed
        await supabase
          .from("automation_queue")
          .update({ 
            status: "failed", 
            error: err.message 
          })
          .eq("id", item.id);
          
        processed.push({ id: item.id, status: 'failed', error: err.message });
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
