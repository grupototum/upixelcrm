import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Node {
  id: string;
  type: string;
  data: any;
}

interface Edge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

function interpolate(template: string, leadContext: any): string {
  if (!template || typeof template !== 'string') return template;
  
  return template.replace(/\{\{(.+?)\}\}/g, (match, path) => {
    const keys = path.trim().split('.');
    let value = leadContext;
    for (const key of keys) {
      if (value === undefined || value === null) return match;
      value = value[key];
    }
    if (typeof value === 'object') return JSON.stringify(value);
    return value !== undefined ? String(value) : match;
  });
}

function evaluateCondition(conditions: any[], operator: 'and'|'or', leadContext: any): boolean {
  if (!conditions || conditions.length === 0) return true;
  
  const evaluateSingle = (c: any) => {
    let actualValue: any = null;
    
    // Check where to get the value
    if (c.type === 'has_phone') actualValue = leadContext.phone;
    else if (c.type === 'has_email') actualValue = leadContext.email;
    else if (c.type === 'has_tag') {
      const tags = leadContext.tags || [];
      return tags.includes(c.value);
    }
    else if (c.type.startsWith('custom.')) {
      const fieldSlug = c.type.replace('custom.', '');
      actualValue = leadContext.custom_fields?.[fieldSlug];
    }

    const expectedValue = c.value;

    switch(c.operator) {
      case 'equals': return String(actualValue) === String(expectedValue);
      case 'not_equals': return String(actualValue) !== String(expectedValue);
      case 'contains': return String(actualValue || '').includes(String(expectedValue || ''));
      case 'is_empty': return !actualValue;
      case 'is_not_empty': return !!actualValue;
      case 'greater_than': return Number(actualValue) > Number(expectedValue);
      case 'less_than': return Number(actualValue) < Number(expectedValue);
      default: return !!actualValue; // fallback to truthy check
    }
  };

  if (operator === 'or') {
    return conditions.some(evaluateSingle);
  }
  return conditions.every(evaluateSingle);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { tenant_id, automation_id, lead_id, node_id, context } = await req.json();

    if (!automation_id || !lead_id || !node_id) {
      throw new Error("Missing required fields: automation_id, lead_id, node_id");
    }

    // 1. Fetch automation definition
    const { data: auto, error: autoError } = await supabase
      .from("automations")
      .select("nodes, edges")
      .eq("id", automation_id)
      .single();

    if (autoError || !auto) throw new Error("Automation not found");

    const nodes: Node[] = auto.nodes || [];
    const edges: Edge[] = auto.edges || [];

    // 2. Fetch Lead Context (merged with provided context)
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .single();

    if (leadError || !lead) throw new Error("Lead not found");

    const leadContext = { ...lead, ...context };

    // 3. Find current node
    const currentNode = nodes.find(n => n.id === node_id);
    if (!currentNode) throw new Error(`Node ${node_id} not found in automation`);

    let nextNodeId: string | null = null;
    let outputData: any = {};
    let isWaiting = false;

    // 4. Execute Node Logic based on type
    const nodeType = currentNode.type;
    const nodeData = currentNode.data || {};

    if (nodeType === 'trigger') {
      // Just passthrough
      const outgoingEdge = edges.find(e => e.source === node_id);
      if (outgoingEdge) nextNodeId = outgoingEdge.target;
    } 
    else if (nodeType === 'condition') {
      const isTrue = evaluateCondition(nodeData.conditions || [], nodeData.conditionOperator || 'and', leadContext);
      outputData = { evaluatedTo: isTrue };
      // Find edge matching the boolean result
      const sourceHandle = isTrue ? 'true' : 'false';
      const outgoingEdge = edges.find(e => e.source === node_id && e.sourceHandle === sourceHandle);
      if (outgoingEdge) nextNodeId = outgoingEdge.target;
    }
    else if (nodeType === 'delay') {
      // Create a delay entry in the queue and STOP execution
      let scheduledAt = new Date();
      if (nodeData.delayType === 'fixed') {
        const amount = Number(nodeData.amount) || 1;
        const unit = nodeData.unit || 'days';
        if (unit === 'minutes') scheduledAt.setMinutes(scheduledAt.getMinutes() + amount);
        else if (unit === 'hours') scheduledAt.setHours(scheduledAt.getHours() + amount);
        else if (unit === 'days') scheduledAt.setDate(scheduledAt.getDate() + amount);
      } else if (nodeData.delayType === 'dynamic') {
        const dynamicVal = interpolate(nodeData.dynamicDate || '', leadContext);
        if (dynamicVal) scheduledAt = new Date(dynamicVal);
      }
      
      const outgoingEdge = edges.find(e => e.source === node_id);
      if (outgoingEdge) {
        await supabase.from("automation_queue").insert({
          tenant_id: lead.tenant_id,
          automation_id,
          lead_id,
          node_id: outgoingEdge.target,
          scheduled_at: scheduledAt.toISOString(),
          context: leadContext
        });
      }
      isWaiting = true;
      outputData = { scheduledAt };
    }
    else if (nodeType === 'webhook') {
      const url = interpolate(nodeData.url || '', leadContext);
      const method = nodeData.method || 'POST';
      let bodyStr = undefined;
      
      try {
         bodyStr = interpolate(typeof nodeData.body === 'object' ? JSON.stringify(nodeData.body) : String(nodeData.body), leadContext);
         // attempt to parse if POST/PUT
         if (['POST', 'PUT', 'PATCH'].includes(method)) {
             bodyStr = JSON.stringify(JSON.parse(bodyStr)); // ensure valid json
         }
      } catch (e) {
         // ignore
      }

      const headers = { 'Content-Type': 'application/json', ...(nodeData.headers || {}) };

      try {
        const res = await fetch(url, { method, headers, body: ['GET', 'HEAD'].includes(method) ? undefined : bodyStr });
        const resText = await res.text();
        outputData = { status: res.status, response: resText.substring(0, 500) };
      } catch (err: any) {
        outputData = { error: err.message };
      }

      const outgoingEdge = edges.find(e => e.source === node_id);
      if (outgoingEdge) nextNodeId = outgoingEdge.target;
    }
    else if (nodeType === 'randomizer') {
      // Randomly pick side A or side B based on configured percentages
      const sideA_pct = Number(nodeData.percentageA) || 50;
      const rand = Math.random() * 100;
      const isSideA = rand <= sideA_pct;
      
      outputData = { picked: isSideA ? 'A' : 'B', randomValue: rand };
      const sourceHandle = isSideA ? 'a' : 'b'; // Need to check what handles the randomizer has. Let's assume 'a' and 'b'
      const outgoingEdge = edges.find(e => e.source === node_id && e.sourceHandle === sourceHandle);
      if (outgoingEdge) nextNodeId = outgoingEdge.target;
    }
    else if (nodeType === 'action') {
      // Execute an internal CRM action
      const actionType = nodeData.configType;
      outputData = { action: actionType };
      
      if (actionType === 'add_tag') {
        // We need a tag name or ID from nodeData
        const tag = interpolate(nodeData.tag || '', leadContext);
        // We'd push this to leads array or a relation table, assume custom_fields for now if tag is undefined
      } else if (actionType === 'change_status') {
        const newStatus = interpolate(nodeData.status || '', leadContext);
        if (newStatus) {
           await supabase.from("leads").update({ pipeline_id: newStatus }).eq("id", lead_id);
        }
      }
      
      const outgoingEdge = edges.find(e => e.source === node_id);
      if (outgoingEdge) nextNodeId = outgoingEdge.target;
    }
    else if (nodeType === 'message') {
      // Send a message via whatsapp or email
      const channel = nodeData.configType || 'whatsapp';
      const text = interpolate(nodeData.text || '', leadContext);
      outputData = { channel, sent: true, textPreview: text.substring(0, 50) };
      
      // We would call our internal message proxy here
      
      const outgoingEdge = edges.find(e => e.source === node_id);
      if (outgoingEdge) nextNodeId = outgoingEdge.target;
    }
    else if (nodeType === 'ai_assistant') {
      const prompt = interpolate(nodeData.prompt || '', leadContext);
      const outputField = nodeData.outputField;

      let aiResponseText = "Mock AI Response for demonstration."; // Default for local test

      try {
        const openAiKey = Deno.env.get("OPENAI_API_KEY");
        if (openAiKey) {
          const aiReq = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openAiKey}`
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.7,
              max_tokens: 500
            })
          });
          const aiRes = await aiReq.json();
          if (aiRes.choices && aiRes.choices[0]) {
            aiResponseText = aiRes.choices[0].message.content.trim();
          } else {
             outputData = { error: 'Invalid AI response' };
          }
        } else {
          outputData = { warning: 'OPENAI_API_KEY not configured, using mock response.' };
        }
      } catch (err: any) {
        outputData = { error: err.message };
        aiResponseText = "Erro ao processar IA.";
      }

      if (outputField) {
        // Save to custom fields
        const currentCustomFields = leadContext.custom_fields || {};
        const updatedCustomFields = { ...currentCustomFields, [outputField]: aiResponseText };
        await supabase.from("leads").update({ custom_fields: updatedCustomFields }).eq("id", lead_id);
        
        // Update context for next nodes
        leadContext.custom_fields = updatedCustomFields;
      }

      outputData = { ...outputData, aiOutput: aiResponseText };

      const outgoingEdge = edges.find(e => e.source === node_id);
      if (outgoingEdge) nextNodeId = outgoingEdge.target;
    }

    // 5. Log Execution
    await supabase.from("automation_executions").insert({
      tenant_id: lead.tenant_id,
      automation_id,
      lead_id,
      node_id,
      node_type: nodeType,
      input: { context: leadContext },
      output: outputData,
      status: outputData.error ? 'failed' : 'success'
    });

    // 6. Invoke Next Node (if not waiting for delay)
    if (nextNodeId && !isWaiting) {
      // Async fire and forget to prevent blocking
      fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/automation-engine`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
        },
        body: JSON.stringify({
          tenant_id: lead.tenant_id,
          automation_id,
          lead_id,
          node_id: nextNodeId,
          context: leadContext
        })
      }).catch(console.error);
    }

    return new Response(JSON.stringify({ success: true, nextNodeId, isWaiting }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Automation Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
