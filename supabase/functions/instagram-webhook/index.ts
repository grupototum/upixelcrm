import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

import { corsHeaders } from "../_shared/cors.ts";

const IG_APP_SECRET = Deno.env.get("META_APP_SECRET") ?? Deno.env.get("FACEBOOK_APP_SECRET") ?? "";

// ── HMAC do X-Hub-Signature-256 (mesmo padrão do facebook-messenger-webhook) ──
async function verifySignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  if (!IG_APP_SECRET) {
    // Sem secret configurado, nega — nunca aceita silenciosamente.
    console.error("[instagram-webhook] META_APP_SECRET/FACEBOOK_APP_SECRET not configured");
    return false;
  }
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const expected = signatureHeader.slice("sha256=".length);
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(IG_APP_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (computed.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

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

// ─── Auto-reply: lógica dos 3 funis (comment, story_mention, mention) ───

type AutoReplyRule = {
  id: string;
  client_id: string;
  trigger_type: "comment" | "story_mention" | "mention";
  keyword: string | null;
  match_mode: "exact" | "contains" | "starts_with" | "any";
  reply_type: "dm" | "public_comment_reply";
  reply_text: string;
  per_user_cooldown_hours: number;
};

function ruleMatchesText(rule: AutoReplyRule, text: string): boolean {
  // match_mode='any' ou sem keyword: bate em qualquer texto
  if (rule.match_mode === "any" || !rule.keyword) return true;
  const t = (text ?? "").toLowerCase().trim();
  const k = rule.keyword.toLowerCase().trim();
  if (!t || !k) return false;
  if (rule.match_mode === "exact") return t === k;
  if (rule.match_mode === "starts_with") return t.startsWith(k);
  return t.includes(k); // 'contains' default
}

async function shouldSkipDueToCooldown(adminClient: any, rule: AutoReplyRule, targetUserId: string): Promise<boolean> {
  if (rule.per_user_cooldown_hours <= 0) return false; // 0 = ilimitado
  const since = new Date(Date.now() - rule.per_user_cooldown_hours * 3600 * 1000).toISOString();
  const { data } = await adminClient
    .from("instagram_auto_reply_executions")
    .select("id")
    .eq("rule_id", rule.id)
    .eq("target_user_id", targetUserId)
    .gte("created_at", since)
    .limit(1)
    .maybeSingle();
  return !!data;
}

async function logExecution(
  adminClient: any, rule: AutoReplyRule, targetUserId: string,
  payload: Record<string, unknown>, success: boolean, errorMessage?: string,
) {
  await adminClient.from("instagram_auto_reply_executions").insert({
    client_id: rule.client_id,
    rule_id: rule.id,
    target_user_id: targetUserId,
    trigger_payload: payload,
    success,
    error_message: errorMessage ?? null,
  });
}

async function sendDmViaProxy(
  igAccountId: string, accessToken: string, recipientIdOrCommentId: string,
  message: string, viaCommentId: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const body = viaCommentId
    ? { recipient: { comment_id: recipientIdOrCommentId }, message: { text: message } }
    : { recipient: { id: recipientIdOrCommentId }, message: { text: message } };
  const res = await fetch(`https://graph.facebook.com/v21.0/${igAccountId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.text();
    return { ok: false, error: `Meta API ${res.status}: ${errBody}` };
  }
  return { ok: true };
}

async function publicCommentReply(
  accessToken: string, commentId: string, message: string,
): Promise<{ ok: boolean; error?: string }> {
  const url = `https://graph.facebook.com/v21.0/${commentId}/replies?message=${encodeURIComponent(message)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const errBody = await res.text();
    return { ok: false, error: `Meta API ${res.status}: ${errBody}` };
  }
  return { ok: true };
}

async function runRule(
  adminClient: any, rule: AutoReplyRule, config: any,
  targetUserId: string, commentId: string | null, payload: Record<string, unknown>,
) {
  if (await shouldSkipDueToCooldown(adminClient, rule, targetUserId)) {
    console.log(`Rule ${rule.id} skipped for ${targetUserId} (cooldown)`);
    return;
  }
  let result: { ok: boolean; error?: string };
  if (rule.reply_type === "public_comment_reply") {
    if (!commentId) {
      await logExecution(adminClient, rule, targetUserId, payload, false, "comment_id ausente para public reply");
      return;
    }
    result = await publicCommentReply(config.access_token, commentId, rule.reply_text);
  } else {
    // DM — se temos comment_id, usamos private reply (escopo de 7 dias);
    // caso contrário usamos sender_id direto.
    const useCommentId = !!commentId && rule.trigger_type === "comment";
    result = await sendDmViaProxy(
      config.ig_account_id, config.access_token,
      useCommentId ? commentId! : targetUserId,
      rule.reply_text, useCommentId,
    );
  }
  await logExecution(adminClient, rule, targetUserId, payload, result.ok, result.error);
}

async function processChangesEvents(
  adminClient: any, clientId: string, config: any, changes: any[],
) {
  // Carrega regras ativas do tenant uma vez.
  const { data: rulesData } = await adminClient
    .from("instagram_auto_replies")
    .select("id, client_id, trigger_type, keyword, match_mode, reply_type, reply_text, per_user_cooldown_hours")
    .eq("client_id", clientId)
    .eq("active", true);
  const rules = (rulesData ?? []) as AutoReplyRule[];
  if (rules.length === 0) return;

  for (const change of changes) {
    const field = change.field;
    const value = change.value || {};

    if (field === "comments") {
      // Webhook traz: comment_id, parent_id, media, text (em alguns casos), from
      const commentId = value.id || value.comment_id;
      const text = value.text || "";
      const fromId = value.from?.id;
      if (!commentId) continue;

      // Se Meta não mandou o texto, vai buscar via Graph
      let finalText = text;
      if (!finalText) {
        try {
          const r = await fetch(`https://graph.facebook.com/v21.0/${commentId}?fields=text,from&access_token=${config.access_token}`);
          if (r.ok) {
            const d = await r.json();
            finalText = d.text || "";
          }
        } catch { /* ignore */ }
      }

      for (const rule of rules) {
        if (rule.trigger_type !== "comment") continue;
        if (!ruleMatchesText(rule, finalText)) continue;
        if (!fromId) continue;
        await runRule(adminClient, rule, config, String(fromId), commentId, {
          field, comment_id: commentId, text: finalText, from: fromId,
        });
      }
    } else if (field === "mentions") {
      // mentions = quando alguém @ a conta dentro de UM comentário/post
      const commentId = value.comment_id || value.id;
      const mediaId = value.media_id;
      if (!commentId && !mediaId) continue;

      // Resolve autor — mentions webhook só traz IDs
      let fromId: string | null = null;
      let text = "";
      const lookupId = commentId || mediaId;
      try {
        const r = await fetch(`https://graph.facebook.com/v21.0/${lookupId}?fields=text,from&access_token=${config.access_token}`);
        if (r.ok) {
          const d = await r.json();
          fromId = d.from?.id ?? null;
          text = d.text || "";
        }
      } catch { /* ignore */ }
      if (!fromId) continue;

      for (const rule of rules) {
        if (rule.trigger_type !== "mention") continue;
        if (!ruleMatchesText(rule, text)) continue;
        await runRule(adminClient, rule, config, fromId, commentId ?? null, {
          field, comment_id: commentId, media_id: mediaId, from: fromId,
        });
      }
    }
    // outros fields ignorados (live_comments, ig_account, etc.)
  }
}

async function processStoryMention(
  adminClient: any, clientId: string, config: any,
  senderId: string, payload: Record<string, unknown>,
) {
  const { data: rulesData } = await adminClient
    .from("instagram_auto_replies")
    .select("id, client_id, trigger_type, keyword, match_mode, reply_type, reply_text, per_user_cooldown_hours")
    .eq("client_id", clientId)
    .eq("trigger_type", "story_mention")
    .eq("active", true);
  const rules = (rulesData ?? []) as AutoReplyRule[];
  for (const rule of rules) {
    await runRule(adminClient, rule, config, senderId, null, payload);
  }
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

      // FIX: antes um `|| integrations.length > 0` aceitava QUALQUER token
      // desde que existisse alguma integração Instagram (mesmo bug FIX-01
      // já corrigido no whatsapp-webhook).
      if (validToken) {
        return new Response(challenge || "", { status: 200, headers: corsHeaders });
      }
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();

    // Valida a assinatura da Meta ANTES de processar (rejeita eventos forjados).
    const sigOk = await verifySignature(rawBody, req.headers.get("x-hub-signature-256"));
    if (!sigOk) {
      console.warn("[instagram-webhook] Invalid X-Hub-Signature-256");
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
    }
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

      // Eventos de mudança (comments, mentions, etc.) — alimenta os funis 1 e 3.
      if (Array.isArray(entry.changes) && entry.changes.length > 0) {
        try {
          await processChangesEvents(adminClient, clientId, config, entry.changes);
        } catch (err) {
          console.error("processChangesEvents error:", err);
        }
      }

      for (const messaging of entry.messaging || []) {
        if (!messaging.message) continue;

        const isEcho = messaging.message.is_echo || false;
        
        const senderId = messaging.sender?.id;
        const recipientId = messaging.recipient?.id;
        
        // Se for um echo (enviado pelo App mas reportado no Webhook), invertemos: quem "enviou" é o IGAccountId pra gente
        // Mas a conversa pertence ao cliente (o verdadeiro destinatario da DM nesse caso)
        const conversationalIgId = isEcho ? recipientId : senderId;
        const senderName = isEcho ? "Você via IG" : `Instagram User (${conversationalIgId})`;

        let msgType = "text";
        let content = messaging.message.text || "";
        const meta: any = {};

        const attach = messaging.message.attachments?.[0];
        let isStoryMention = false;
        if (attach) {
          if (attach.type === "story_mention") {
            isStoryMention = true;
            msgType = "image"; // story mention vem com mídia da story; trata como imagem na timeline
            meta.story_mention = true;
          } else {
            msgType = attach.type; // image, video, audio, file
            if (!["image","video","audio","file"].includes(msgType)) msgType = "file";
          }
          const url = attach.payload?.url;
          if (url) {
            const publicUrl = await downloadMetaMedia(adminClient, url, "application/octet-stream");
            content = publicUrl || url;
            meta.media_url = content;
          }
        }

        // Funil 2: alguém mencionou a conta numa story dele → DM automática.
        // Dispara apenas no INBOUND (não em echo da gente mandando).
        if (isStoryMention && !isEcho && senderId) {
          try {
            await processStoryMention(adminClient, clientId, config, senderId, {
              source: "story_mention", message_id: messaging.message.mid, sender_id: senderId,
            });
          } catch (err) {
            console.error("processStoryMention error:", err);
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
