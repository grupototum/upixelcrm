// WhatsApp Cloud API — proxy direto pra Meta Graph API.
// Independente da Evolution: cliente envia/recebe direto via graph.facebook.com.
//
// Actions:
//   save-config       → salva credentials do tenant (phone_number_id, business_id, access_token, verify_token)
//   verify-config     → testa o token chamando /me na Graph API
//   list-instances    → lista todas as instâncias cloud do tenant
//   delete-instance   → remove integration (não desconecta na Meta, isso é manual no dashboard)
//   send-message      → envia texto
//   send-media        → envia mídia (image/audio/video/document)
//   send-template     → envia template aprovado (HSM)
//
// Integration provider: 'whatsapp_cloud' (separado de 'whatsapp' Baileys e 'whatsapp_official' Evolution).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

const GRAPH_API_VERSION = "v22.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

async function readBody(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

type CloudConfig = {
  phone_number_id: string;
  business_account_id: string;
  access_token: string;
  display_phone_number?: string;
  display_name?: string;
  webhook_verify_token?: string;
};

interface IntegrationRow {
  id: string;
  client_id: string;
  config: CloudConfig;
  status: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return jsonResponse({ error: "Unauthorized" }, 401);

    const { data: profile } = await userClient.from("profiles").select("client_id").eq("id", user.id).single();
    if (!profile) return jsonResponse({ error: "Profile not found" }, 404);
    const clientId = profile.client_id;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const instanceIdParam = url.searchParams.get("integration_id");

    // ── verify-config: testa as credenciais chamando /me ──
    if (action === "verify-config") {
      const body = await req.json();
      const { access_token, phone_number_id } = body as { access_token?: string; phone_number_id?: string };
      if (!access_token || !phone_number_id) {
        return jsonResponse({ error: "Missing access_token or phone_number_id" }, 400);
      }
      const verifyRes = await fetch(`${GRAPH_BASE}/${phone_number_id}?fields=display_phone_number,verified_name,quality_rating`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const data = await readBody(verifyRes);
      if (!verifyRes.ok) {
        return jsonResponse({
          ok: false,
          error: "Credenciais inválidas. Confira Phone Number ID e Access Token.",
          details: data,
        }, 200);
      }
      return jsonResponse({
        ok: true,
        display_phone_number: (data as any)?.display_phone_number ?? "",
        verified_name: (data as any)?.verified_name ?? "",
        quality_rating: (data as any)?.quality_rating ?? "",
      });
    }

    // ── save-config: cria/atualiza integration_cloud ──
    if (action === "save-config") {
      const body = await req.json();
      const {
        phone_number_id, business_account_id, access_token,
        display_phone_number, display_name, webhook_verify_token,
      } = body as Partial<CloudConfig>;

      if (!phone_number_id || !business_account_id || !access_token) {
        return jsonResponse({ error: "Missing phone_number_id, business_account_id, or access_token" }, 400);
      }

      const newConfig: CloudConfig = {
        phone_number_id,
        business_account_id,
        access_token,
        display_phone_number: display_phone_number ?? "",
        display_name: display_name ?? "",
        webhook_verify_token: webhook_verify_token ?? crypto.randomUUID(),
      };

      const { data: existing } = await adminClient
        .from("integrations")
        .select("id")
        .eq("client_id", clientId)
        .eq("provider", "whatsapp_cloud")
        .eq("config->>phone_number_id", phone_number_id)
        .maybeSingle();

      if (existing) {
        const { data: updated, error } = await adminClient
          .from("integrations")
          .update({ status: "connected", config: newConfig })
          .eq("id", existing.id)
          .select("id")
          .single();
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ success: true, integration_id: updated.id, webhook_verify_token: newConfig.webhook_verify_token });
      }

      const { data: inserted, error } = await adminClient
        .from("integrations")
        .insert({ client_id: clientId, provider: "whatsapp_cloud", status: "connected", config: newConfig })
        .select("id")
        .single();
      if (error) return jsonResponse({ error: error.message }, 500);

      return jsonResponse({
        success: true,
        integration_id: inserted.id,
        webhook_verify_token: newConfig.webhook_verify_token,
        webhook_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-cloud-webhook?integration_id=${inserted.id}`,
      });
    }

    // ── list-instances ──
    if (action === "list-instances") {
      const { data: instances } = await adminClient
        .from("integrations")
        .select("id, status, config, created_at")
        .eq("client_id", clientId)
        .eq("provider", "whatsapp_cloud")
        .order("created_at", { ascending: false });
      return jsonResponse({ instances: instances ?? [] });
    }

    // Para as actions abaixo precisamos resolver a integration específica.
    const resolveIntegration = async (): Promise<IntegrationRow | null> => {
      const q = adminClient
        .from("integrations")
        .select("id, client_id, status, config")
        .eq("client_id", clientId)
        .eq("provider", "whatsapp_cloud");
      if (instanceIdParam) {
        const { data } = await q.eq("id", instanceIdParam).maybeSingle();
        return data as IntegrationRow | null;
      }
      // Sem id explícito: usa a integration mais recente conectada (default).
      const { data } = await q.eq("status", "connected").order("updated_at", { ascending: false }).limit(1).maybeSingle();
      return data as IntegrationRow | null;
    };

    // ── delete-instance ──
    if (action === "delete-instance") {
      const integration = await resolveIntegration();
      if (!integration) return jsonResponse({ success: true });
      await adminClient.from("integrations").delete().eq("id", integration.id);
      return jsonResponse({ success: true });
    }

    // ── Próximas actions precisam de uma integration válida ──
    const integration = await resolveIntegration();
    if (!integration?.config?.access_token) {
      return jsonResponse({
        error: "WhatsApp Cloud não configurado. Conecte primeiro em Configurações > WhatsApp.",
        code: "NOT_CONFIGURED",
      }, 400);
    }
    const config = integration.config;

    // Helper compartilhado pra postar na Graph API
    const postToWhatsApp = async (payload: Record<string, unknown>) => {
      const res = await fetch(`${GRAPH_BASE}/${config.phone_number_id}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
      });
      const data = await readBody(res);
      return { ok: res.ok, status: res.status, data };
    };

    const friendlyError = (status: number, data: unknown, suffix: string) => {
      const errObj = (data && typeof data === "object") ? (data as any).error : null;
      const msg = errObj?.message ?? errObj?.error_user_msg ?? `HTTP ${status}`;
      const code = errObj?.code;
      let friendly = `WhatsApp Cloud rejeitou ${suffix}: ${msg}`;
      if (status === 401 || code === 190) {
        friendly = "Access Token expirado ou inválido. Atualize em Configurações > WhatsApp.";
      } else if (status === 404) {
        friendly = `Phone Number ID "${config.phone_number_id}" não encontrado na Meta. Confira no dashboard.`;
      }
      return jsonResponse({
        error: friendly,
        code: "META_ERROR",
        meta_status: status,
        meta_body: data,
      }, 502);
    };

    // Persistir mensagem + conversa após envio bem-sucedido
    const persistOutbound = async (toPhone: string, contentText: string, type: string, metadata: Record<string, unknown>) => {
      const channel = "whatsapp_cloud";
      const { data: existingConv } = await adminClient.from("conversations")
        .select("id")
        .eq("client_id", clientId)
        .eq("channel", channel)
        .eq("metadata->>phone", toPhone)
        .maybeSingle();

      let convId = existingConv?.id ?? null;
      if (!convId) {
        const { data: lead } = await adminClient.from("leads")
          .select("id")
          .eq("client_id", clientId)
          .or(`phone.ilike.%${toPhone.slice(-8)}%`)
          .limit(1)
          .maybeSingle();
        const { data: newConv } = await adminClient.from("conversations").insert({
          client_id: clientId,
          lead_id: lead?.id ?? null,
          channel,
          status: "open",
          last_message: contentText,
          last_message_at: new Date().toISOString(),
          metadata: { phone: toPhone, instance_name: config.display_name ?? "" },
        }).select("id").single();
        convId = newConv?.id ?? null;
      }

      if (convId) {
        await adminClient.from("messages").insert({
          client_id: clientId,
          conversation_id: convId,
          content: contentText,
          type,
          direction: "outbound",
          sender_name: "Você",
          metadata: { channel, ...metadata },
        });
        await adminClient.from("conversations").update({
          last_message: contentText,
          last_message_at: new Date().toISOString(),
        }).eq("id", convId);
      }
    };

    const normalizePhone = (p: string) => {
      const clean = p.replace(/\D/g, "");
      return clean.startsWith("55") ? clean : `55${clean}`;
    };

    // ── send-message: texto simples ──
    if (action === "send-message") {
      const body = await req.json();
      const { phone, message } = body as { phone?: string; message?: string };
      if (!phone || !message) return jsonResponse({ error: "Missing phone or message" }, 400);
      const to = normalizePhone(phone);

      const { ok, status, data } = await postToWhatsApp({
        to,
        type: "text",
        text: { body: message },
      });
      if (!ok) return friendlyError(status, data, "envio de mensagem");

      await persistOutbound(to, message, "text", { meta_message_id: (data as any)?.messages?.[0]?.id });
      return jsonResponse(data);
    }

    // ── send-media ──
    if (action === "send-media") {
      const body = await req.json();
      const { phone, mediaUrl, mediaType, fileName, caption } = body as {
        phone?: string; mediaUrl?: string; mediaType?: string; fileName?: string; caption?: string;
      };
      if (!phone || !mediaUrl) return jsonResponse({ error: "Missing phone or mediaUrl" }, 400);
      const to = normalizePhone(phone);

      // Meta Cloud espera type específico (image/audio/video/document)
      const metaType = mediaType === "file" ? "document" : (mediaType || "image");
      const mediaObj: Record<string, unknown> = { link: mediaUrl };
      if (caption && (metaType === "image" || metaType === "video" || metaType === "document")) {
        mediaObj.caption = caption;
      }
      if (metaType === "document" && fileName) {
        mediaObj.filename = fileName;
      }

      const { ok, status, data } = await postToWhatsApp({
        to,
        type: metaType,
        [metaType]: mediaObj,
      });
      if (!ok) return friendlyError(status, data, "envio de mídia");

      const displayContent = caption || mediaUrl;
      await persistOutbound(to, displayContent, metaType === "document" ? "file" : metaType, {
        meta_message_id: (data as any)?.messages?.[0]?.id,
        media_url: mediaUrl,
        filename: fileName,
      });
      return jsonResponse(data);
    }

    // ── send-template: template aprovado (HSM) — necessário fora da janela de 24h ──
    if (action === "send-template") {
      const body = await req.json();
      const { phone, template_name, language_code, components } = body as {
        phone?: string;
        template_name?: string;
        language_code?: string;
        components?: unknown[];
      };
      if (!phone || !template_name) return jsonResponse({ error: "Missing phone or template_name" }, 400);
      const to = normalizePhone(phone);

      const payload: Record<string, unknown> = {
        to,
        type: "template",
        template: {
          name: template_name,
          language: { code: language_code ?? "pt_BR" },
          ...(components ? { components } : {}),
        },
      };

      const { ok, status, data } = await postToWhatsApp(payload);
      if (!ok) return friendlyError(status, data, "envio de template");

      await persistOutbound(to, `[Template: ${template_name}]`, "text", {
        meta_message_id: (data as any)?.messages?.[0]?.id,
        template_name,
      });
      return jsonResponse(data);
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("whatsapp-cloud-proxy error:", message);
    return jsonResponse({ error: message }, 500);
  }
});
