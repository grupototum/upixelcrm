// WhatsApp Templates (HSM) — proxy pra Meta Graph API.
//
// Fora da janela de 24h, WhatsApp Cloud só envia mensagens via templates
// pré-aprovados (HSM). Esta edge function permite o frontend:
//   - list      → busca templates direto da Meta + retorna status real (APPROVED/PENDING/REJECTED)
//   - create    → submete novo template pra aprovação Meta
//   - delete    → remove template (só funciona se status != APPROVED com tráfego)
//
// Observabilidade: emite logs JSON estruturados via _shared/logger.ts.
// Cada response de erro retorna um `code` específico (ex.: NOT_CONFIGURED,
// INVALID_TENANT, META_REJECTED) pra facilitar diagnóstico no Logs Explorer
// e no frontend (ver useBroadcast.ts → extractEdgeError).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";
import { createLogger, newRequestId } from "../_shared/logger.ts";

const SERVICE = "whatsapp-templates";
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

  const requestId = newRequestId();
  const log = createLogger(SERVICE, { request_id: requestId });

  try {
    // ── Autenticação ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      log.warn("auth_missing_header");
      return jsonResponse({ error: "Unauthorized: missing_header", code: "MISSING_AUTH_HEADER", request_id: requestId }, 401);
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      log.warn("auth_invalid_jwt", { auth_error: userError?.message });
      return jsonResponse({
        error: "Unauthorized: invalid_jwt",
        code: "INVALID_JWT",
        details: userError?.message ?? "no user",
        request_id: requestId,
      }, 401);
    }

    log.withContext({ user_id: user.id });

    // ── Profile ──
    const { data: profile, error: profileError } = await userClient
      .from("profiles")
      .select("client_id, tenant_id, role")
      .eq("id", user.id)
      .single();
    if (profileError || !profile) {
      log.error("profile_not_found", { profile_error: profileError?.message });
      return jsonResponse({
        error: "Profile not found",
        code: "PROFILE_NOT_FOUND",
        details: profileError?.message,
        request_id: requestId,
      }, 404);
    }

    // ── Resolve tenant_id ──
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);
    const profileRow = profile as { client_id?: string | null; tenant_id?: string | null; role?: string };
    const reqBody = req.method === "POST"
      ? await req.clone().json().catch(() => ({} as Record<string, unknown>))
      : {};
    const bodyTenantId = (reqBody as { tenant_id?: string }).tenant_id;

    let tenantId: string | null = null;
    let tenantSource: string = "none";
    if (isUuid(bodyTenantId)) { tenantId = bodyTenantId; tenantSource = "body"; }
    if (!tenantId && isUuid(profileRow.tenant_id)) { tenantId = profileRow.tenant_id!; tenantSource = "profile.tenant_id"; }
    if (!tenantId && isUuid(profileRow.client_id)) {
      const { data: t } = await userClient.from("tenants").select("id").eq("id", profileRow.client_id!).maybeSingle();
      if (t) { tenantId = profileRow.client_id!; tenantSource = "profile.client_id"; }
    }
    if (!tenantId) {
      log.error("tenant_resolution_failed", {
        role: profileRow.role,
        has_body_tenant_id: !!bodyTenantId,
        has_profile_tenant_id: !!profileRow.tenant_id,
      });
      return jsonResponse({
        error: "tenant_id requerido. Master deve mandar tenant_id no body.",
        code: "TENANT_REQUIRED",
        request_id: requestId,
      }, 400);
    }
    const clientId = tenantId;
    log.withContext({ tenant_id: tenantId, client_id: clientId });
    log.info("tenant_resolved", { source: tenantSource });

    // ── Action ──
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "list";
    log.withContext({ action });

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Busca integration WhatsApp Cloud ──
    const { data: integration, error: integrationError } = await adminClient
      .from("integrations")
      .select("id, config, status")
      .eq("client_id", clientId)
      .eq("provider", "whatsapp_cloud")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (integrationError) {
      log.error("integration_query_failed", { db_error: integrationError.message });
      return jsonResponse({
        error: "Erro ao consultar integração.",
        code: "DB_ERROR",
        details: integrationError.message,
        request_id: requestId,
      }, 500);
    }

    if (!integration) {
      log.error("integration_not_found", { searched_client_id: clientId });
      return jsonResponse({
        error: "WhatsApp Cloud não conectado neste tenant. Conecte primeiro em Integrações > WhatsApp.",
        code: "NOT_CONFIGURED",
        request_id: requestId,
      }, 400);
    }

    if (integration.status !== "connected") {
      log.warn("integration_not_connected", { integration_id: integration.id, status: integration.status });
      return jsonResponse({
        error: `WhatsApp Cloud está com status '${integration.status}'. Reative a integração antes de usar templates.`,
        code: "INTEGRATION_INACTIVE",
        request_id: requestId,
      }, 400);
    }

    const config = integration.config as CloudConfig;
    const wabaId = config?.business_account_id;
    const accessToken = config?.access_token;
    if (!wabaId || !accessToken) {
      log.error("incomplete_credentials", {
        integration_id: integration.id,
        has_waba_id: !!wabaId,
        has_access_token: !!accessToken,
      });
      return jsonResponse({
        error: "Credenciais Meta incompletas (faltando business_account_id ou access_token).",
        code: "INCOMPLETE_CONFIG",
        request_id: requestId,
      }, 400);
    }

    // ─── LIST ───
    if (action === "list") {
      const fetchUrl = `${GRAPH_BASE}/${wabaId}/message_templates?fields=id,name,language,status,category,components,rejected_reason&limit=200`;
      log.info("meta_list_request");
      const res = await fetch(fetchUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await readBody(res);

      if (!res.ok) {
        log.error("meta_list_failed", { meta_status: res.status, meta_body: data });
        return jsonResponse({
          error: "Falha ao buscar templates da Meta.",
          code: "META_LIST_FAILED",
          meta_status: res.status,
          meta_body: data,
          request_id: requestId,
        }, 502);
      }

      const templates = ((data as { data?: MetaTemplate[] })?.data ?? []) as MetaTemplate[];
      log.info("meta_list_ok", { count: templates.length });

      for (const t of templates) {
        const bodyComponent = t.components.find((c) => c.type === "BODY");
        const contentText = bodyComponent?.text ?? "";
        const { error: upsertError } = await adminClient.from("whatsapp_templates").upsert({
          client_id: clientId,
          name: t.name,
          category: t.category,
          status: t.status,
          content: contentText,
          updated_at: new Date().toISOString(),
        }, { onConflict: "client_id,name" });
        if (upsertError) log.warn("upsert_template_failed", { template_name: t.name, db_error: upsertError.message });
      }

      return jsonResponse({ templates, count: templates.length, request_id: requestId });
    }

    // ─── CREATE ───
    if (action === "create") {
      const body = reqBody as {
        name?: string;
        category?: "MARKETING" | "UTILITY" | "AUTHENTICATION";
        language?: string;
        components?: MetaTemplateComponent[];
      };
      const { name, category, language = "pt_BR", components } = body;

      if (!name || !category || !components || components.length === 0) {
        log.warn("create_missing_fields", {
          has_name: !!name,
          has_category: !!category,
          components_count: components?.length ?? 0,
        });
        return jsonResponse({
          error: "Faltam campos: name, category e components (mínimo 1 com type=BODY).",
          code: "MISSING_FIELDS",
          request_id: requestId,
        }, 400);
      }

      log.info("meta_create_request", { template_name: name, category, language, components_count: components.length });

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
        const errObj = (data && typeof data === "object")
          ? (data as { error?: { message?: string; error_user_msg?: string; error_subcode?: number; code?: number } }).error
          : null;
        const msg = errObj?.error_user_msg ?? errObj?.message ?? `HTTP ${res.status}`;
        log.error("meta_create_rejected", {
          template_name: name,
          meta_status: res.status,
          meta_error_code: errObj?.code,
          meta_subcode: errObj?.error_subcode,
          meta_message: msg,
          meta_body: data,
        });
        return jsonResponse({
          error: `Meta rejeitou o template: ${msg}`,
          code: "META_REJECTED",
          meta_status: res.status,
          meta_body: data,
          request_id: requestId,
        }, 502);
      }

      const created = data as { id: string; status: string; category: string };
      log.info("meta_create_ok", { template_name: name, meta_id: created.id, status: created.status });

      const bodyComponent = components.find((c) => c.type === "BODY");
      const { error: upsertError } = await adminClient.from("whatsapp_templates").upsert({
        client_id: clientId,
        name,
        category,
        status: created.status ?? "PENDING",
        content: bodyComponent?.text ?? "",
        updated_at: new Date().toISOString(),
      }, { onConflict: "client_id,name" });
      if (upsertError) log.warn("create_cache_upsert_failed", { template_name: name, db_error: upsertError.message });

      return jsonResponse({ success: true, template: created, request_id: requestId });
    }

    // ─── DELETE ───
    if (action === "delete") {
      const body = reqBody as { name?: string };
      const { name } = body;
      if (!name) {
        log.warn("delete_missing_name");
        return jsonResponse({ error: "Faltando 'name'.", code: "MISSING_NAME", request_id: requestId }, 400);
      }

      log.info("meta_delete_request", { template_name: name });

      const res = await fetch(`${GRAPH_BASE}/${wabaId}/message_templates?name=${encodeURIComponent(name)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await readBody(res);

      if (!res.ok) {
        log.error("meta_delete_rejected", { template_name: name, meta_status: res.status, meta_body: data });
        return jsonResponse({
          error: "Meta rejeitou a remoção.",
          code: "META_DELETE_REJECTED",
          meta_status: res.status,
          meta_body: data,
          request_id: requestId,
        }, 502);
      }

      await adminClient.from("whatsapp_templates").delete().eq("client_id", clientId).eq("name", name);
      log.info("meta_delete_ok", { template_name: name });
      return jsonResponse({ success: true, request_id: requestId });
    }

    log.warn("unknown_action", { received_action: action });
    return jsonResponse({ error: `Unknown action: ${action}`, code: "UNKNOWN_ACTION", request_id: requestId }, 400);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const stack = err instanceof Error ? err.stack : undefined;
    log.fatal("unhandled_exception", { error_message: message, stack: stack?.split("\n").slice(0, 5).join(" | ") });
    return jsonResponse({
      error: message,
      code: "UNHANDLED_EXCEPTION",
      request_id: requestId,
    }, 500);
  }
});
