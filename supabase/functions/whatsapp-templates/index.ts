// WhatsApp Templates (HSM) — proxy pra Meta Graph API.
//
// Fora da janela de 24h, WhatsApp Cloud só envia mensagens via templates
// pré-aprovados (HSM). Esta edge function permite o frontend:
//   - list      → busca templates direto da Meta + retorna status real (APPROVED/PENDING/REJECTED)
//   - create    → submete novo template pra aprovação Meta
//   - delete    → remove template (só funciona se status != APPROVED com tráfego)
//   - sync      → atualiza cache local (tabela whatsapp_templates) com o que a Meta retorna
//
// Auth: Bearer token do user. Resolve client_id/tenant_id server-side e busca
// a integration provider='whatsapp_cloud' do tenant pra pegar waba_id + access_token.

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

interface CloudConfig {
  phone_number_id?: string;
  business_account_id?: string;
  access_token?: string;
}

interface MetaTemplateComponent {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
  text?: string;
  buttons?: Array<Record<string, unknown>>;
}

interface MetaTemplate {
  id: string;
  name: string;
  language: string;
  status: "APPROVED" | "PENDING" | "REJECTED" | "PAUSED" | "IN_APPEAL" | "PENDING_DELETION";
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  components: MetaTemplateComponent[];
  rejected_reason?: string;
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

    const { data: profile } = await userClient
      .from("profiles")
      .select("client_id, tenant_id, role")
      .eq("id", user.id)
      .single();
    if (!profile) return jsonResponse({ error: "Profile not found" }, 404);

    // resolveClientId server-side (mesma lógica das outras edge fns)
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);
    const profileRow = profile as { client_id?: string | null; tenant_id?: string | null };
    const reqBody = req.method === "POST"
      ? await req.clone().json().catch(() => ({} as Record<string, unknown>))
      : {};
    const bodyTenantId = (reqBody as { tenant_id?: string }).tenant_id;
    let tenantId: string | null = null;
    if (isUuid(bodyTenantId)) tenantId = bodyTenantId;
    if (!tenantId && isUuid(profileRow.tenant_id)) tenantId = profileRow.tenant_id;
    if (!tenantId && isUuid(profileRow.client_id)) {
      const { data: t } = await userClient.from("tenants").select("id").eq("id", profileRow.client_id).maybeSingle();
      if (t) tenantId = profileRow.client_id;
    }
    if (!tenantId) {
      return jsonResponse({ error: "tenant_id requerido. Master deve mandar tenant_id no body." }, 400);
    }
    const clientId = tenantId;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Busca a integration WhatsApp Cloud do tenant (precisa de waba_id + access_token)
    const { data: integration } = await adminClient
      .from("integrations")
      .select("id, config")
      .eq("client_id", clientId)
      .eq("provider", "whatsapp_cloud")
      .eq("status", "connected")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!integration?.config) {
      return jsonResponse({
        error: "WhatsApp Cloud API não conectada. Configure em Configurações > WhatsApp antes de gerenciar templates.",
        code: "NOT_CONFIGURED",
      }, 400);
    }

    const config = integration.config as CloudConfig;
    const wabaId = config.business_account_id;
    const accessToken = config.access_token;
    if (!wabaId || !accessToken) {
      return jsonResponse({
        error: "Credenciais Meta incompletas (faltando business_account_id ou access_token).",
        code: "INCOMPLETE_CONFIG",
      }, 400);
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "list";

    // ─── LIST: busca templates direto da Meta + atualiza cache local ───
    if (action === "list") {
      const fetchUrl = `${GRAPH_BASE}/${wabaId}/message_templates?fields=id,name,language,status,category,components,rejected_reason&limit=200`;
      const res = await fetch(fetchUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await readBody(res);

      if (!res.ok) {
        return jsonResponse({
          error: "Falha ao buscar templates da Meta.",
          meta_status: res.status,
          meta_body: data,
        }, 502);
      }

      const templates = ((data as { data?: MetaTemplate[] })?.data ?? []) as MetaTemplate[];

      // Sincroniza cache local (whatsapp_templates table) — upsert por (client_id, name, language)
      // Não bloqueia o response: roda em background, falhas só logadas.
      for (const t of templates) {
        const bodyComponent = t.components.find((c) => c.type === "BODY");
        const contentText = bodyComponent?.text ?? "";
        await adminClient.from("whatsapp_templates").upsert({
          client_id: clientId,
          name: t.name,
          category: t.category,
          status: t.status,
          content: contentText,
          updated_at: new Date().toISOString(),
        }, { onConflict: "client_id,name" }).then(({ error }) => {
          if (error) console.warn(`Failed to upsert template ${t.name}:`, error.message);
        });
      }

      return jsonResponse({ templates, count: templates.length });
    }

    // ─── CREATE: submete novo template pra aprovação Meta ───
    if (action === "create") {
      const body = reqBody as {
        name?: string;
        category?: "MARKETING" | "UTILITY" | "AUTHENTICATION";
        language?: string;
        components?: MetaTemplateComponent[];
      };
      const { name, category, language = "pt_BR", components } = body;

      if (!name || !category || !components || components.length === 0) {
        return jsonResponse({
          error: "Faltam campos: name, category e components (mínimo 1 com type=BODY).",
        }, 400);
      }

      const res = await fetch(`${GRAPH_BASE}/${wabaId}/message_templates`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, category, language, components }),
      });
      const data = await readBody(res);

      if (!res.ok) {
        const errObj = (data && typeof data === "object") ? (data as { error?: { message?: string; error_user_msg?: string } }).error : null;
        const msg = errObj?.error_user_msg ?? errObj?.message ?? `HTTP ${res.status}`;
        return jsonResponse({
          error: `Meta rejeitou o template: ${msg}`,
          meta_status: res.status,
          meta_body: data,
        }, 502);
      }

      const created = data as { id: string; status: string; category: string };

      // Persiste local (status PENDING até Meta aprovar)
      const bodyComponent = components.find((c) => c.type === "BODY");
      await adminClient.from("whatsapp_templates").upsert({
        client_id: clientId,
        name,
        category,
        status: created.status ?? "PENDING",
        content: bodyComponent?.text ?? "",
        updated_at: new Date().toISOString(),
      }, { onConflict: "client_id,name" });

      return jsonResponse({ success: true, template: created });
    }

    // ─── DELETE: remove template (Meta só permite se não houver tráfego recente) ───
    if (action === "delete") {
      const body = reqBody as { name?: string };
      const { name } = body;
      if (!name) return jsonResponse({ error: "Faltando 'name'." }, 400);

      const res = await fetch(`${GRAPH_BASE}/${wabaId}/message_templates?name=${encodeURIComponent(name)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await readBody(res);

      if (!res.ok) {
        return jsonResponse({
          error: "Meta rejeitou a remoção.",
          meta_status: res.status,
          meta_body: data,
        }, 502);
      }

      // Remove do cache local
      await adminClient.from("whatsapp_templates")
        .delete()
        .eq("client_id", clientId)
        .eq("name", name);

      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("whatsapp-templates error:", message);
    return jsonResponse({ error: message }, 500);
  }
});
