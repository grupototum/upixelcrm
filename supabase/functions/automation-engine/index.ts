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
      .select("nodes, edges, status")
      .eq("id", automation_id)
      .single();

    if (autoError || !auto) throw new Error("Automation not found");
    
    // Check if automation is active (evaluated after loading the node to use node.type)
    const currentNodeForStatusCheck = (auto.nodes || []).find((n: Node) => n.id === node_id);
    if (auto.status !== 'active' && currentNodeForStatusCheck?.type === 'trigger') {
       console.log(`Automation ${automation_id} is not active (status: ${auto.status}). Skipping.`);
       return new Response(JSON.stringify({ success: true, skipped: 'inactive' }), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
         status: 200,
       });
    }

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

    // Check if node itself is disabled
    if (currentNode.data?.status === 'disabled') {
       console.log(`Node ${node_id} is disabled. Skipping.`);
       const outgoingEdge = edges.find(e => e.source === node_id);
       if (outgoingEdge) {
          // Bypass this node
          return fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/automation-engine`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
            },
            body: JSON.stringify({
              tenant_id: lead.tenant_id,
              automation_id,
              lead_id,
              node_id: outgoingEdge.target,
              context: leadContext
            })
          });
       }
       return new Response(JSON.stringify({ success: true, skipped: 'node_disabled' }), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
    }

    let nextNodeId: string | null = null;
    let outputData: any = {};
    let isWaiting = false;

    // 4. Execute Node Logic based on type
    const nodeType = currentNode.type;
    const nodeData = currentNode.data || {};

    if (nodeType === 'trigger') {
      // For new_message trigger, check keywords if present
      if (nodeData.type === 'new_message' && nodeData.keywords) {
        const keywords = String(nodeData.keywords).split(',').map(k => k.trim().toLowerCase());
        const message = String(leadContext.message || leadContext.last_message || '').toLowerCase();
        const matches = keywords.some(k => message.includes(k));
        
        if (!matches && keywords.length > 0) {
           console.log(`Automation ${automation_id} skipped: Keywords do not match.`);
           return new Response(JSON.stringify({ success: true, skipped: 'keywords_mismatch' }), {
             headers: { ...corsHeaders, "Content-Type": "application/json" },
             status: 200,
           });
        }
      }

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
          client_id: lead.client_id,
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
         const rawBody = typeof nodeData.body === 'object' ? JSON.stringify(nodeData.body) : String(nodeData.body || '');
         bodyStr = interpolate(rawBody, leadContext);
         // attempt to parse if POST/PUT
         if (['POST', 'PUT', 'PATCH'].includes(method) && bodyStr) {
             try { JSON.parse(bodyStr); } catch(e) { bodyStr = JSON.stringify({ content: bodyStr }); }
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
      const sourceHandle = isSideA ? 'a' : 'b'; 
      const outgoingEdge = edges.find(e => e.source === node_id && e.sourceHandle === sourceHandle);
      if (outgoingEdge) nextNodeId = outgoingEdge.target;
    }
    else if (nodeType === 'action') {
      // Execute an internal CRM action
      const actionType = nodeData.configType;
      outputData = { action: actionType };
      
      if (actionType === 'add_tag') {
        const tagToAdd = interpolate(nodeData.tag || '', leadContext);
        if (tagToAdd) {
          const currentTags = lead.tags || [];
          if (!currentTags.includes(tagToAdd)) {
            const updatedTags = [...currentTags, tagToAdd];
            await supabase.from("leads").update({ tags: updatedTags }).eq("id", lead_id);
            leadContext.tags = updatedTags;
            outputData.success = true;
            outputData.tag = tagToAdd;
          }
        }
      } else if (actionType === 'change_status') {
        const newColId = interpolate(nodeData.status || '', leadContext);
        if (newColId) {
           await supabase.from("leads").update({ column_id: newColId }).eq("id", lead_id);
           leadContext.column_id = newColId;
           outputData.success = true;
        }
      } else if (actionType === 'assign_user') {
        const userId = interpolate(nodeData.userId || '', leadContext);
        if (userId) {
          await supabase.from("leads").update({ responsible_id: userId }).eq("id", lead_id);
          leadContext.responsible_id = userId;
          outputData.success = true;
        }
      } else if (actionType === 'leave_note') {
        const note = interpolate(nodeData.note || '', leadContext);
        if (note) {
          await supabase.from("timeline_events").insert({
            lead_id,
            type: 'note',
            content: note,
            client_id: lead.client_id,
            tenant_id: lead.tenant_id,
            user_name: 'Automação'
          });
          outputData.success = true;
        }
      }
      
      const outgoingEdge = edges.find(e => e.source === node_id);
      if (outgoingEdge) nextNodeId = outgoingEdge.target;
    }
    else if (nodeType === 'message') {
      // Send a message via whatsapp or email
      const targetChannel = nodeData.configType || 'whatsapp';
      const text = interpolate(nodeData.text || '', leadContext);
      outputData = { channel: targetChannel, sent: false, textPreview: text.substring(0, 50) };
      
      if (targetChannel === 'whatsapp' || targetChannel === 'whatsapp_official') {
        const clientId = lead.client_id;
        if (clientId) {
          // Find active integration for the specified channel
          const { data: integration } = await supabase.from("integrations")
            .select("config, access_token")
            .eq("client_id", clientId)
            .eq("provider", targetChannel)
            .eq("status", "connected")
            .maybeSingle();
            
          if (integration && integration.config) {
            const config = integration.config;
            const cleanPhone = (lead.phone || '').replace(/\D/g, "");
            const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
            
            if (targetChannel === 'whatsapp') {
              // Evolution API
              const instancePath = config.instance_name;
              let apiUrl = config.api_url || '';
              if (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1);

              try {
                const sendRes = await fetch(`${apiUrl}/message/sendText/${instancePath}`, {
                  method: "POST",
                  headers: { apikey: config.api_key, "Content-Type": "application/json" },
                  body: JSON.stringify({ number: formattedPhone, text }),
                });
                if (sendRes.ok) {
                   outputData.sent = true;
                   await recordOutboundMessage(supabase, lead, targetChannel, text, formattedPhone);
                } else {
                   outputData.error = `API Error ${sendRes.status}`;
                }
              } catch (err: any) { outputData.error = err.message; }
            } else {
              // WhatsApp Official
              const phoneNumberId = config.phone_number_id;
              const accessToken = integration.access_token || config.access_token;
              try {
                const sendRes = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
                  method: "POST",
                  headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
                  body: JSON.stringify({ messaging_product: "whatsapp", to: formattedPhone, type: "text", text: { body: text } }),
                });
                if (sendRes.ok) {
                  outputData.sent = true;
                  await recordOutboundMessage(supabase, lead, targetChannel, text, formattedPhone);
                } else {
                  outputData.error = `Official API Error ${sendRes.status}`;
                }
              } catch (err: any) { outputData.error = err.message; }
            }
          } else {
            outputData.error = `Active integration for ${targetChannel} not found`;
          }
        }
      } else if (targetChannel === 'email') {
        // Simple SMTP or Cloud Function call for email
        outputData.error = "Email automation not fully implemented in engine yet";
      }
      
      const outgoingEdge = edges.find(e => e.source === node_id);
      if (outgoingEdge) nextNodeId = outgoingEdge.target;
    }
    else if (nodeType === 'ai_assistant') {
      const promptText = interpolate(nodeData.prompt || '', leadContext);
      const outputField = nodeData.outputField;

      let aiResponseText = "";

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
              messages: [{ role: 'user', content: promptText }],
              temperature: 0.7,
              max_tokens: 500
            })
          });
          const aiRes = await aiReq.json();
          if (aiRes.choices && aiRes.choices[0]) {
            aiResponseText = aiRes.choices[0].message.content.trim();
          } else {
             throw new Error(aiRes.error?.message || 'Invalid AI response');
          }
        } else {
          outputData.warning = 'OPENAI_API_KEY not configured';
          aiResponseText = "[IA não configurada]";
        }
      } catch (err: any) {
        outputData.error = err.message;
        aiResponseText = `Erro IA: ${err.message}`;
      }

      if (outputField && aiResponseText) {
        const currentCustomFields = lead.custom_fields || {};
        const updatedCustomFields = { ...currentCustomFields, [outputField]: aiResponseText };
        await supabase.from("leads").update({ custom_fields: updatedCustomFields }).eq("id", lead_id);
        leadContext.custom_fields = updatedCustomFields;
      }

      outputData.aiOutput = aiResponseText.substring(0, 100) + "...";

      const outgoingEdge = edges.find(e => e.source === node_id);
      if (outgoingEdge) nextNodeId = outgoingEdge.target;
    }

    // 5. Log Execution
    await supabase.from("automation_executions").insert({
      client_id: lead.client_id,
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
      }).catch(err => console.error("Async trigger error:", err));
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

async function recordOutboundMessage(supabase: any, lead: any, channel: string, text: string, phone: string) {
  const { data: existingConv } = await supabase.from("conversations")
    .select("id")
    .eq("client_id", lead.client_id)
    .eq("channel", channel)
    .ilike("metadata->>phone", `%${phone.slice(-8)}%`)
    .maybeSingle();

  let convId = existingConv?.id;
  if (!convId) {
    const { data: newConv } = await supabase.from("conversations").insert({
      client_id: lead.client_id,
      lead_id: lead.id,
      channel,
      status: "open",
      last_message: text,
      last_message_at: new Date().toISOString(),
      metadata: { phone },
      tenant_id: lead.tenant_id
    }).select("id").single();
    convId = newConv?.id;
  } else {
    await supabase.from("conversations").update({
      last_message: text,
      last_message_at: new Date().toISOString(),
    }).eq("id", convId);
  }

  if (convId) {
    await supabase.from("messages").insert({
      client_id: lead.client_id,
      conversation_id: convId,
      content: text,
      type: "text",
      direction: "outbound",
      sender_name: "Automação",
      tenant_id: lead.tenant_id,
      metadata: { channel, auto_generated: true }
    });
  }
}
