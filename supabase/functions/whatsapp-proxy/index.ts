import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

import { corsHeaders } from "../_shared/cors.ts";

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown error";

const isConnectionTimeout = (error: unknown) => {
  const message = getErrorMessage(error).toLowerCase();
  return ["timed out", "tcp connect error", "connection refused", "dns", "network", "unreachable", "certificate", "unknownissuer", "peer certificate", "tls handshake", "connection reset", "reset by peer", "eof"].some((term) =>
    message.includes(term)
  );
};

const getFallbackStatus = (
  persistedStatus: string | null | undefined,
  type: string | null,
  config: { api_key?: string; instance_name?: string; access_token?: string }
) => {
  if (persistedStatus && persistedStatus !== "disconnected") return persistedStatus;
  if (type === "official" && config.access_token) return "configured";
  if (config.api_key && config.instance_name) return "configured";
  return persistedStatus || "disconnected";
};

async function readResponseBody(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// UPIXEL_WA_TYPE=openwa faz o servidor GERENCIADO (botão "Conectar número") ser
// um OpenWA (rmyndharis/OpenWA, Totum SDR) em vez de Evolution. Para linhas já
// salvas, o protocolo é decidido por linha (`rowIsOpenWA`) — Evolution e OpenWA
// convivem no mesmo tenant. Inbound chega pelo whatsapp-webhook (eventos
// `message.received` / `session.status`), registrado por sessão em
// `POST /api/sessions/{id}/webhooks` — ver ensureOpenWAWebhook.
const envIsOpenWA = (Deno.env.get("UPIXEL_WA_TYPE") || "").toLowerCase() === "openwa";

// Linhas OpenWA carregam `wa_type: "openwa"` e/ou `session_id` (versão publicada
// em 2026-09-01 gravava só session_id, sem instance_name — por isso o fallback).
function rowIsOpenWA(config: Record<string, any> | null | undefined): boolean {
  if (!config) return envIsOpenWA;
  if (config.wa_type === "openwa" || config.session_id) return true;
  if (config.wa_type === "evolution") return false;
  return envIsOpenWA && !!config.managed;
}

// Id da sessão no OpenWA. Linhas novas gravam o mesmo valor em instance_name e
// session_id; linhas da versão anterior só têm session_id.
const openwaSessionId = (config: Record<string, any>): string =>
  String(config.session_id || config.instance_name || "");

// OpenWA fica atrás de Basic Auth (Traefik) além da própria API key — Evolution
// só usa o header `apikey`. Aceita UPIXEL_WA_BASIC_AUTH ("user:senha", formato da
// versão publicada) ou UPIXEL_WA_BASIC_USER/PASS.
function waAuthHeaders(apiKey: string, openwa = envIsOpenWA): Record<string, string> {
  if (!openwa) return { apikey: apiKey };
  const headers: Record<string, string> = { "X-API-Key": apiKey };
  const basicAuth = Deno.env.get("UPIXEL_WA_BASIC_AUTH");
  const basicUser = Deno.env.get("UPIXEL_WA_BASIC_USER");
  const basicPass = Deno.env.get("UPIXEL_WA_BASIC_PASS");
  if (basicAuth) headers["Authorization"] = `Basic ${btoa(basicAuth)}`;
  else if (basicUser && basicPass) headers["Authorization"] = `Basic ${btoa(`${basicUser}:${basicPass}`)}`;
  return headers;
}

const OPENWA_WEBHOOK_EVENTS = ["message.received", "session.status", "session.disconnected"];

// Garante que a sessão OpenWA tem um webhook apontando para o whatsapp-webhook
// desta instância Supabase. Contrato (Swagger do OpenWA, confirmado no motor SDR):
// GET/POST /api/sessions/{id}/webhooks, body { url, events }. Idempotente: se já
// existe webhook com a mesma URL, não duplica. Nunca lança — devolve o resultado
// para ser gravado em config.webhook_registered / webhook_error e logado.
async function ensureOpenWAWebhook(
  apiUrl: string, apiKey: string, sessionId: string, webhookUrl: string,
): Promise<{ registered: boolean; error?: string }> {
  const headers = { ...waAuthHeaders(apiKey, true), "Content-Type": "application/json" };
  const base = `${apiUrl}/api/sessions/${encodeURIComponent(sessionId)}/webhooks`;
  try {
    const listRes = await fetch(base, { headers });
    if (listRes.ok) {
      const list = await readResponseBody(listRes);
      const items: any[] = Array.isArray(list) ? list : Array.isArray((list as any)?.data) ? (list as any).data : [];
      if (items.some((w) => w?.url === webhookUrl)) return { registered: true };
    }
    const res = await fetch(base, {
      method: "POST",
      headers,
      body: JSON.stringify({ url: webhookUrl, events: OPENWA_WEBHOOK_EVENTS }),
    });
    if (res.ok) return { registered: true };
    const body = await readResponseBody(res);
    const error = `HTTP ${res.status}: ${typeof body === "string" ? body : JSON.stringify(body)}`.slice(0, 300);
    console.error(`OpenWA webhook register failed for session ${sessionId}:`, error);
    return { registered: false, error };
  } catch (e) {
    const error = getErrorMessage(e);
    console.error(`OpenWA webhook register error for session ${sessionId}:`, error);
    return { registered: false, error };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const { data: profile } = await supabase
      .from("profiles")
      .select("client_id, tenant_id, role")
      .eq("id", userId)
      .single();
    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // resolveClientId server-side: prefer tenant_id (UUID válido) sobre client_id.
    // Users master têm profile.client_id = profile.id (não é tenant) — cair pra esse
    // valor cria registros órfãos invisíveis ao tenant correto. Pra masters operando
    // como admins de tenant específico, eles precisam mandar `tenant_id` no body.
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);

    let tenantId: string | null = null;
    // 1. Tenant explícito no body (master operando num tenant)
    const bodyForTenant = req.method === "POST"
      ? await req.clone().json().catch(() => ({}))
      : {};
    if (isUuid(bodyForTenant?.tenant_id)) {
      tenantId = bodyForTenant.tenant_id;
    }
    // 2. profile.tenant_id (caminho normal de admin/gerente/vendedor/atendente)
    if (!tenantId && isUuid(profile.tenant_id)) {
      tenantId = profile.tenant_id;
    }
    // 3. profile.client_id se for UUID de tenant válido (legacy compat)
    if (!tenantId && isUuid(profile.client_id)) {
      // verifica se é um tenant real (não profile órfão)
      const { data: t } = await supabase.from("tenants").select("id").eq("id", profile.client_id).maybeSingle();
      if (t) tenantId = profile.client_id;
    }

    if (!tenantId) {
      return new Response(JSON.stringify({
        error: "tenant_id requerido. Para masters, envie tenant_id no body. Para admins/gerentes/etc, o profile precisa ter tenant_id setado.",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // clientId mantido pra compat com queries existentes — usa o mesmo valor do tenantId.
    // Insert em integrations seta AMBOS pra garantir isolamento (causa raiz dos órfãos).
    const clientId = tenantId;
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const type = url.searchParams.get("type") || "normal";
    const provider = type === "official" ? "whatsapp_official" : "whatsapp";
    // instance_name URL param selects a specific WhatsApp instance
    const instanceNameParam = url.searchParams.get("instance_name") || "";

    // ── create-managed-instance: creates instance using shared server credentials ──
    if (action === "create-managed-instance") {
      const managedUrl = (
        Deno.env.get("UPIXEL_WA_URL") ||
        Deno.env.get("UPIXEL_OPENWA_URL") ||
        Deno.env.get("UPIXEL_EVOLUTION_URL") ||
        ""
      ).trim().replace(/\/+$/, "");
      const managedKey = (
        Deno.env.get("UPIXEL_WA_KEY") ||
        Deno.env.get("UPIXEL_OPENWA_KEY") ||
        Deno.env.get("UPIXEL_EVOLUTION_KEY") ||
        ""
      );

      if (!managedUrl || !managedKey) {
        return jsonResponse({ error: "Servidor WhatsApp gerenciado não configurado. Use o modo avançado." }, 503);
      }

      const body = await req.json().catch(() => ({}));
      const friendlyName = (body.name || "").trim().slice(0, 30) || "WhatsApp";

      // ── OpenWA: cria + inicia sessão, servidor devolve um id (UUID) que
      // vira o instance_name salvo — todas as outras ações usam esse id nas URLs. ──
      if (envIsOpenWA) {
        const createRes = await fetch(`${managedUrl}/api/sessions`, {
          method: "POST",
          headers: { ...waAuthHeaders(managedKey), "Content-Type": "application/json" },
          body: JSON.stringify({ name: friendlyName }),
        });
        const createData = await readResponseBody(createRes);
        if (!createRes.ok) {
          console.error("OpenWA create failed:", createRes.status, createData);
          return jsonResponse({ error: `Falha ao criar sessão no servidor WhatsApp (HTTP ${createRes.status}).`, details: createData }, 502);
        }
        const sessionId = (createData as any)?.id;
        if (!sessionId) {
          return jsonResponse({ error: "Servidor WhatsApp não retornou o id da sessão criada.", details: createData }, 502);
        }

        // Inicia a sessão — dispara a geração do QR code no servidor.
        await fetch(`${managedUrl}/api/sessions/${sessionId}/start`, {
          method: "POST",
          headers: waAuthHeaders(managedKey),
        }).catch((e) => console.error("OpenWA start failed:", e));

        const newConfig: Record<string, unknown> = {
          api_url: managedUrl,
          instance_name: sessionId,
          session_id: sessionId,
          wa_type: "openwa",
          api_key: managedKey,
          friendly_name: friendlyName,
          managed: true,
        };
        const { data: inserted, error: insertErr } = await adminClient
          .from("integrations")
          .insert({ client_id: clientId, tenant_id: tenantId, provider: "whatsapp", status: "connecting", config: newConfig })
          .select("id")
          .single();
        if (insertErr) {
          console.error("DB insert error:", insertErr);
          return jsonResponse({ error: "Erro ao salvar instância no banco de dados." }, 500);
        }

        // Webhook de inbound — sem isso nenhuma mensagem recebida (nem as enviadas
        // pelo celular) chega ao CRM. Resultado gravado na config para o painel
        // e o diagnóstico verem se falhou (antes era fire-and-forget no endpoint errado).
        const taggedWebhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-webhook?integration_id=${inserted?.id ?? ""}`;
        const wh = await ensureOpenWAWebhook(managedUrl, managedKey, sessionId, taggedWebhookUrl);
        await adminClient.from("integrations")
          .update({ config: { ...newConfig, webhook_url: taggedWebhookUrl, webhook_registered: wh.registered, webhook_error: wh.error ?? null } })
          .eq("id", inserted?.id);

        // QR code (best effort — pode ainda não estar pronto logo após o start;
        // o app já faz polling de "status"/reconecta o modal se vier vazio).
        const qrRes = await fetch(`${managedUrl}/api/sessions/${sessionId}/qr`, { headers: waAuthHeaders(managedKey) });
        const qrData = await readResponseBody(qrRes);
        const qrCode = qrRes.ok && typeof qrData === "object" && qrData !== null
          ? (qrData as any).qr || (qrData as any).qrCode || (qrData as any).base64 || null
          : null;

        return jsonResponse({
          success: true,
          instance_id: inserted?.id,
          instance_name: sessionId,
          friendly_name: friendlyName,
          qr_code: qrCode,
          status: "connecting",
        });
      }

      // ASCII-only slug for Evolution instance name: NFD decompose, strip non-ASCII (accents/emojis), then non-alphanumeric.
      // eslint-disable-next-line no-control-regex
      const slug = friendlyName.toLowerCase().normalize("NFD").replace(/[^\x00-\x7F]/g, "").replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 20) || "wa";
      const suffix = Math.random().toString(36).slice(2, 6);
      const instanceName = `c${clientId.slice(0, 8)}-${slug}-${suffix}`;
      const instancePath = encodeURIComponent(instanceName);

      // Create instance on shared Evolution server
      const createRes = await fetch(`${managedUrl}/instance/create`, {
        method: "POST",
        headers: { apikey: managedKey, "Content-Type": "application/json" },
        body: JSON.stringify({ instanceName, integration: "WHATSAPP-BAILEYS", qrcode: true }),
      });

      if (!createRes.ok) {
        const errBody = await readResponseBody(createRes);
        console.error("Evolution create failed:", createRes.status, errBody);
        const rawMsg = (errBody && typeof errBody === "object")
          ? ((errBody as any).response?.message ?? (errBody as any).message ?? (errBody as any).error)
          : errBody;
        const evolutionMsg = Array.isArray(rawMsg) ? rawMsg.join("; ") : (rawMsg ? String(rawMsg) : `HTTP ${createRes.status}`);
        // Diagnóstico: só o hostname (nunca a API key) — permite confirmar pra qual
        // servidor a secret UPIXEL_EVOLUTION_URL está de fato apontando, sem expor
        // segredos. "no available server" é o texto padrão do Traefik/Coolify para
        // um router sem backend saudável — geralmente domínio/subdomínio errado.
        let attemptedHost = managedUrl;
        try { attemptedHost = new URL(managedUrl).hostname; } catch { /* mantém managedUrl bruto */ }
        const friendly = createRes.status === 401 || createRes.status === 403
          ? "Servidor Evolution rejeitou a autenticação (API Key inválida)."
          : createRes.status === 409
            ? "Já existe uma instância com esse nome no servidor Evolution. Tente novamente."
            : `Falha ao criar instância no servidor Evolution (${attemptedHost}): ${evolutionMsg}`;
        return jsonResponse({ error: friendly, evolution_status: createRes.status, attempted_host: attemptedHost, details: errBody }, 502);
      }

      // Save to integrations table
      const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-webhook`;
      const newConfig = {
        api_url: managedUrl,
        instance_name: instanceName,
        api_key: managedKey,
        friendly_name: friendlyName,
        managed: true,
      };

      const { data: inserted, error: insertErr } = await adminClient
        .from("integrations")
        .insert({ client_id: clientId, tenant_id: tenantId, provider: "whatsapp", status: "connecting", config: newConfig })
        .select("id")
        .single();

      if (insertErr) {
        console.error("DB insert error:", insertErr);
        return jsonResponse({ error: "Erro ao salvar instância no banco de dados." }, 500);
      }

      // Set webhook (best effort). URL inclui integration_id para roteamento determinístico
      // — evita colisões cross-tenant quando dois tenants compartilham instance_name.
      const taggedWebhookUrl = `${webhookUrl}?integration_id=${inserted?.id ?? ""}`;
      fetch(`${managedUrl}/webhook/set/${instancePath}`, {
        method: "POST",
        headers: { apikey: managedKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          webhook: {
            enabled: true, url: taggedWebhookUrl, webhook_by_events: false,
            events: ["QRCODE_UPDATED", "MESSAGES_UPSERT", "MESSAGES_UPDATE", "MESSAGES_DELETE", "SEND_MESSAGE", "CONNECTION_UPDATE"],
          },
        }),
      }).catch((e) => console.error("Webhook set failed:", e));

      // Get QR code
      const connectRes = await fetch(`${managedUrl}/instance/connect/${instancePath}`, {
        headers: { apikey: managedKey },
      });
      const connectData = await readResponseBody(connectRes);
      const qrCode = typeof connectData === "object" && connectData !== null
        ? (connectData as any).base64 || null
        : null;

      return jsonResponse({
        success: true,
        instance_id: inserted?.id,
        instance_name: instanceName,
        friendly_name: friendlyName,
        qr_code: qrCode,
        status: "connecting",
      });
    }

    // ── list-instances: returns all WA instances for this client ──
    if (action === "list-instances") {
      // Inclui os campos de saúde gravados pelo whatsapp-health-check (cron 5/5min)
      // para o painel avisar quando o servidor Evolution está inacessível — antes
      // isso só existia no banco e falhava em silêncio.
      const listSelect = "id, status, config, provider, health_status, consecutive_failures, last_heartbeat";
      let { data: integrations, error: listErr } = await adminClient
        .from("integrations")
        .select(listSelect)
        .eq("client_id", clientId)
        .in("provider", ["whatsapp", "whatsapp_official"])
        .order("created_at", { ascending: true });

      // Fallback: ambiente sem as colunas de health (migration não aplicada).
      if (listErr) {
        const retry = await adminClient
          .from("integrations")
          .select("id, status, config, provider")
          .eq("client_id", clientId)
          .in("provider", ["whatsapp", "whatsapp_official"])
          .order("created_at", { ascending: true });
        integrations = retry.data;
        listErr = retry.error;
      }

      if (listErr) console.error("list-instances error:", listErr);

      return jsonResponse(
        (integrations || []).map((row: any) => ({
          id: row.id,
          provider: row.provider,
          // Linhas OpenWA da versão anterior só têm session_id — o painel usa este
          // valor como chave nas ações (status/connect/delete).
          instance_name: (row.config as any)?.instance_name || (row.config as any)?.session_id || "",
          wa_type: (row.config as any)?.wa_type || ((row.config as any)?.session_id ? "openwa" : "evolution"),
          webhook_registered: (row.config as any)?.webhook_registered ?? null,
          friendly_name: (row.config as any)?.friendly_name || (row.config as any)?.instance_name || "",
          managed: !!(row.config as any)?.managed,
          status: row.status || "disconnected",
          api_url: (row.config as any)?.api_url || "",
          has_api_key: !!(row.config as any)?.api_key,
          phone_number_id: (row.config as any)?.phone_number_id || "",
          business_id: (row.config as any)?.business_id || "",
          has_access_token: !!(row.config as any)?.access_token,
          connected_number: (row.config as any)?.connected_number || "",
          health_status: (row as any).health_status ?? null,
          consecutive_failures: (row as any).consecutive_failures ?? 0,
          last_heartbeat: (row as any).last_heartbeat ?? null,
        }))
      );
    }

    // ── save-config: create or update a specific instance ──
    if (action === "save-config") {
      const body = await req.json();
      const { api_url, instance_name, api_key, phone_number_id, business_id, access_token } = body;

      if (!api_url || !instance_name) {
        return new Response(JSON.stringify({ error: "Missing fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Multi-instance: find row by (client_id, provider, config->instance_name)
      const { data: existing } = await adminClient
        .from("integrations")
        .select("id, config")
        .eq("client_id", clientId)
        .eq("provider", provider)
        .filter("config->>instance_name", "eq", instance_name)
        .maybeSingle();

      let finalApiKey = api_key;
      if (!finalApiKey) {
        finalApiKey = (existing?.config as any)?.api_key;
        if (!finalApiKey) {
          return new Response(JSON.stringify({ error: "API Key is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const newConfig = {
        api_url,
        instance_name,
        api_key: finalApiKey,
        phone_number_id: phone_number_id ?? (existing?.config as any)?.phone_number_id,
        business_id: business_id ?? (existing?.config as any)?.business_id,
        access_token: access_token ?? (existing?.config as any)?.access_token,
      };

      if (existing) {
        await adminClient.from("integrations").update({
          status: "configured",
          config: newConfig,
        }).eq("id", existing.id);
      } else {
        await adminClient.from("integrations").insert({
          client_id: clientId,
          tenant_id: tenantId,
          provider,
          status: "configured",
          config: newConfig,
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── get-config: return config for a specific instance ──
    if (action === "get-config") {
      const baseQuery = adminClient
        .from("integrations")
        .select("status, config")
        .eq("client_id", clientId)
        .eq("provider", provider);

      const { data: integration } = instanceNameParam
        ? await baseQuery.filter("config->>instance_name", "eq", instanceNameParam).maybeSingle()
        : await baseQuery.order("created_at", { ascending: true }).limit(1).maybeSingle();

      return new Response(
        JSON.stringify({
          configured: !!integration,
          status: integration?.status || "disconnected",
          api_url: (integration?.config as any)?.api_url || "",
          instance_name: (integration?.config as any)?.instance_name || "",
          has_api_key: !!(integration?.config as any)?.api_key,
          phone_number_id: (integration?.config as any)?.phone_number_id || "",
          business_id: (integration?.config as any)?.business_id || "",
          access_token: (integration?.config as any)?.access_token || "",
          connected_number: (integration?.config as any)?.connected_number || "",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Lookup integration for all remaining actions ──
    // When instance_name param given, select that specific row; otherwise prefer connected instance
    const instanceQuery = adminClient
      .from("integrations")
      .select("*")
      .eq("client_id", clientId)
      .eq("provider", provider);

    let integration: Record<string, any> | null = null;
    if (instanceNameParam) {
      // Linhas OpenWA da versão anterior só têm session_id — aceita os dois.
      const { data } = await instanceQuery
        .or(`config->>instance_name.eq.${instanceNameParam},config->>session_id.eq.${instanceNameParam}`)
        .limit(1)
        .maybeSingle();
      integration = data;
    } else {
      // Prefer connected/configured instances (most recently updated); fall back to any
      const { data: connected } = await instanceQuery
        .in("status", ["connected", "configured"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (connected) {
        integration = connected;
      } else {
        const { data: fallback } = await instanceQuery.order("updated_at", { ascending: false }).limit(1).maybeSingle();
        integration = fallback;
      }
    }

    if (!integration?.config) {
      if (action === "status") {
        return jsonResponse({ status: "disconnected", configured: false, instance: { state: "disconnected" }, reachable: false });
      }
      if (action === "delete-instance") {
        return jsonResponse({ success: true }); // nothing to delete
      }
      return jsonResponse({
        error: instanceNameParam
          ? `Instância "${instanceNameParam}" não encontrada. Verifique se ela foi excluída ou se o nome está correto em Configurações > WhatsApp.`
          : "WhatsApp não configurado. Conecte uma instância em Configurações > WhatsApp antes de enviar mensagens.",
        code: instanceNameParam ? "INSTANCE_NOT_FOUND" : "NOT_CONFIGURED",
      }, 400);
    }

    const rawConfig = integration.config as {
      api_url: string;
      instance_name: string;
      api_key: string;
      phone_number_id?: string;
      business_id?: string;
      access_token?: string;
    };
    // Normalize api_url: ensure scheme + remove trailing slash
    const normalizedUrl = (() => {
      let u = (rawConfig.api_url || "").trim().replace(/\/+$/, "");
      if (u && !/^https?:\/\//i.test(u)) u = `https://${u}`;
      return u;
    })();
    const config = { ...rawConfig, api_url: normalizedUrl };
    // Protocolo desta linha (Evolution × OpenWA) — decidido por linha, não por env.
    const isOpenWA = rowIsOpenWA(config);
    // URL-safe instance name (for paths only; JSON bodies must use raw config.instance_name).
    // No OpenWA o path é o id da sessão (session_id, com fallback em instance_name).
    const instancePath = encodeURIComponent(isOpenWA ? openwaSessionId(config) : (config.instance_name || ""));
    // URL do webhook com integration_id para roteamento determinístico cross-tenant.
    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-webhook?integration_id=${integration.id}`;

    // Helper: update this specific integration row
    const updateIntegration = (fields: Record<string, unknown>) =>
      adminClient.from("integrations").update(fields).eq("id", integration.id);

    // ── delete-instance: logout + delete from Evolution API + remove DB row ──
    if (action === "delete-instance") {
      try {
        if (isOpenWA) {
          await fetch(`${config.api_url}/api/sessions/${instancePath}`, {
            method: "DELETE",
            headers: waAuthHeaders(config.api_key, true),
          });
        } else {
          await fetch(`${config.api_url}/instance/logout/${instancePath}`, {
            method: "DELETE",
            headers: { apikey: config.api_key },
          });
          await fetch(`${config.api_url}/instance/delete/${instancePath}`, {
            method: "DELETE",
            headers: { apikey: config.api_key },
          });
        }
      } catch { /* ignore WhatsApp server errors — a linha some do banco de qualquer forma */ }

      await adminClient.from("integrations").delete().eq("id", integration.id);
      return jsonResponse({ success: true });
    }

    if (action === "connect") {
      const fallbackStatus = getFallbackStatus(integration?.status, type, config);

      // ── OpenWA: sem conceito de "oficial" (Cloud API) — só o fluxo QR normal. ──
      if (isOpenWA) {
        if (type === "official") {
          return jsonResponse({ connected: false, reachable: false, error: "WhatsApp Oficial (Cloud API) não é suportado pelo servidor OpenWA. Use o modo normal." }, 400);
        }
        try {
          let sessionId = openwaSessionId(config);
          const checkRes = await fetch(`${config.api_url}/api/sessions/${instancePath}`, { headers: waAuthHeaders(config.api_key, true) });

          if (checkRes.status === 404) {
            // Sessão não existe mais no servidor — recria (mesmo padrão da Evolution: 404 → create).
            const createRes = await fetch(`${config.api_url}/api/sessions`, {
              method: "POST",
              headers: { ...waAuthHeaders(config.api_key, true), "Content-Type": "application/json" },
              body: JSON.stringify({ name: config.instance_name }),
            });
            const createData = await readResponseBody(createRes);
            if (!createRes.ok || !(createData as any)?.id) {
              await updateIntegration({ status: fallbackStatus });
              return jsonResponse({
                connected: false, instance: { state: fallbackStatus }, status: fallbackStatus, reachable: false,
                error: `Falha ao recriar sessão no servidor WhatsApp (HTTP ${createRes.status}).`, details: createData,
              });
            }
            sessionId = (createData as any).id;
            await updateIntegration({ config: { ...config, instance_name: sessionId, session_id: sessionId, wa_type: "openwa" } });
          } else {
            await checkRes.text();
          }

          // (Re)garante o webhook de inbound a cada connect — cobre sessões criadas
          // pela versão anterior, que registrava no endpoint errado.
          const wh = await ensureOpenWAWebhook(config.api_url, config.api_key, sessionId, webhookUrl);
          Object.assign(config, { session_id: sessionId, wa_type: "openwa", webhook_url: webhookUrl, webhook_registered: wh.registered, webhook_error: wh.error ?? null });

          const sessionPath = encodeURIComponent(sessionId);
          await fetch(`${config.api_url}/api/sessions/${sessionPath}/start`, {
            method: "POST",
            headers: waAuthHeaders(config.api_key, true),
          }).catch((e) => console.error("OpenWA start failed:", e));

          const statusRes = await fetch(`${config.api_url}/api/sessions/${sessionPath}`, { headers: waAuthHeaders(config.api_key, true) });
          const statusData = await readResponseBody(statusRes);
          const waStatus = (statusData as any)?.status;

          if (waStatus === "ready") {
            await updateIntegration({
              status: "connected",
              config: { ...config, instance_name: sessionId, connected_number: (statusData as any)?.phone || (config as any).connected_number },
            });
            return jsonResponse({ instance: { state: "open", owner: (statusData as any)?.phone }, status: "connected" });
          }

          const qrRes = await fetch(`${config.api_url}/api/sessions/${sessionPath}/qr`, { headers: waAuthHeaders(config.api_key, true) });
          const qrData = await readResponseBody(qrRes);
          const qrCode = qrRes.ok && typeof qrData === "object" && qrData !== null
            ? (qrData as any).qr || (qrData as any).qrCode || (qrData as any).base64 || null
            : null;

          await updateIntegration({ status: "connecting", config: { ...config, instance_name: sessionId } });
          return jsonResponse({ base64: qrCode, instance: { state: "connecting" }, status: "connecting" });
        } catch (err) {
          if (isConnectionTimeout(err)) {
            await updateIntegration({ status: fallbackStatus });
            return jsonResponse({
              connected: false, instance: { state: fallbackStatus }, status: fallbackStatus, reachable: false,
              error: "Servidor WhatsApp indisponível ou não respondeu ao conectar.",
            });
          }
          throw err;
        }
      }

      try {
        // ── Official (Cloud API) flow ──
        if (type === "official") {
          const checkRes = await fetch(`${config.api_url}/instance/connectionState/${instancePath}`, {
            headers: { apikey: config.api_key },
          });

          if (checkRes.status === 404) {
            const createRes = await fetch(`${config.api_url}/instance/create`, {
              method: "POST",
              headers: { apikey: config.api_key, "Content-Type": "application/json" },
              body: JSON.stringify({
                instanceName: config.instance_name,
                integration: "WHATSAPP-BUSINESS",
                token: config.access_token,
                number: config.phone_number_id,
                businessId: config.business_id,
                qrcode: false,
              }),
            });
            const createData = await readResponseBody(createRes);
            if (!createRes.ok) {
              await updateIntegration({ status: fallbackStatus });
              return jsonResponse({
                connected: false,
                instance: { state: fallbackStatus },
                status: fallbackStatus,
                reachable: false,
                error: createRes.status === 401
                  ? "Credenciais da Evolution API inválidas (401 Unauthorized). Verifique a API Key."
                  : "Falha ao criar instância na Evolution API.",
                details: createData,
              });
            }
          } else {
            await checkRes.text();
          }

          await updateIntegration({
            status: "connected",
            config: { ...config, connected_number: config.phone_number_id || "" },
          });

          await fetch(`${config.api_url}/webhook/set/${instancePath}`, {
            method: "POST",
            headers: { apikey: config.api_key, "Content-Type": "application/json" },
            body: JSON.stringify({
              webhook: {
                enabled: true,
                url: webhookUrl,
                webhook_by_events: false,
                events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "MESSAGES_DELETE", "CONNECTION_UPDATE"]
              }
            })
          }).catch(err => console.error("Failed to set official webhook:", err));

          return jsonResponse({ connected: true, instance: { state: "open" }, status: "connected", reachable: true });
        }

        // ── Lite (Baileys) flow ──
        const checkRes = await fetch(`${config.api_url}/instance/connectionState/${instancePath}`, {
          headers: { apikey: config.api_key },
        });

        if (checkRes.status === 404) {
          const createRes = await fetch(`${config.api_url}/instance/create`, {
            method: "POST",
            headers: { apikey: config.api_key, "Content-Type": "application/json" },
            body: JSON.stringify({
              instanceName: config.instance_name,
              integration: "WHATSAPP-BAILEYS",
              qrcode: true,
            }),
          });
          const createData = await readResponseBody(createRes);
          if (!createRes.ok) {
            await updateIntegration({ status: fallbackStatus });
            return jsonResponse({
              connected: false,
              instance: { state: fallbackStatus },
              status: fallbackStatus,
              reachable: false,
              error: createRes.status === 401
                ? "Credenciais da Evolution API inválidas (401 Unauthorized). Verifique a API Key."
                : "Falha ao criar instância na Evolution API.",
              details: createData,
            });
          }
        } else {
          await checkRes.text();
        }

        const res = await fetch(`${config.api_url}/instance/connect/${instancePath}`, {
          headers: { apikey: config.api_key },
        });
        const data = await readResponseBody(res);
        const payload = typeof data === "object" && data !== null ? data as Record<string, any> : {};

        if (payload.base64 || payload.instance?.state === "open" || payload.instance?.state === "connecting") {
          const newStatus = (payload.instance?.state === "open") ? "connected" : "connecting";
          await updateIntegration({
            status: newStatus,
            config: {
              ...config,
              ...(payload.instance?.owner ? { connected_number: payload.instance.owner } : {}),
            }
          });
        }

        await fetch(`${config.api_url}/webhook/set/${instancePath}`, {
          method: "POST",
          headers: { apikey: config.api_key, "Content-Type": "application/json" },
          body: JSON.stringify({
            webhook: {
              enabled: true,
              url: webhookUrl,
              webhook_by_events: false,
              events: ["QRCODE_UPDATED", "MESSAGES_UPSERT", "MESSAGES_UPDATE", "MESSAGES_DELETE", "SEND_MESSAGE", "CONNECTION_UPDATE"]
            }
          })
        }).catch(err => console.error("Failed to set lite webhook:", err));

        return jsonResponse(data, res.status);
      } catch (err) {
        if (isConnectionTimeout(err)) {
          await updateIntegration({ status: fallbackStatus });
          return jsonResponse({
            connected: false,
            instance: { state: fallbackStatus },
            status: fallbackStatus,
            reachable: false,
            error: "Evolution API is unavailable or timed out while starting the instance connection.",
          });
        }
        throw err;
      }
    }

    if (action === "status") {
      const fallbackStatus = getFallbackStatus(integration?.status, type, config);

      if (isOpenWA) {
        try {
          const res = await fetch(`${config.api_url}/api/sessions/${instancePath}`, { headers: waAuthHeaders(config.api_key, true) });
          const data = await readResponseBody(res);

          if (!res.ok) {
            return jsonResponse({
              instance: { state: fallbackStatus }, status: fallbackStatus, reachable: false,
              error: (data as any)?.message || "Não foi possível consultar o status no servidor WhatsApp.",
            });
          }

          const waStatus = (data as any)?.status;
          const newStatus = waStatus === "ready" ? "connected" : waStatus === "disconnected" ? "disconnected" : "connecting";

          await updateIntegration({
            status: newStatus,
            config: { ...config, ...((data as any)?.phone ? { connected_number: (data as any).phone } : {}) },
          });

          return jsonResponse({
            instance: { state: newStatus === "connected" ? "open" : newStatus, owner: (data as any)?.phone },
            status: newStatus,
            reachable: true,
          });
        } catch (err) {
          if (isConnectionTimeout(err)) {
            return jsonResponse({
              instance: { state: fallbackStatus }, status: fallbackStatus, reachable: false,
              error: "Servidor WhatsApp indisponível ou não respondeu ao checar status.",
            });
          }
          throw err;
        }
      }

      try {
        const res = await fetch(`${config.api_url}/instance/connectionState/${instancePath}`, {
          headers: { apikey: config.api_key },
        });
        const data = await readResponseBody(res);

        if (!res.ok) {
          const upstreamError = typeof data === "string"
            ? data
            : (data as { response?: { message?: string } } | null)?.response?.message || "Could not fetch connection status from Evolution API";

          if (type === "official") {
            const configuredStatus = config.access_token ? "configured" : fallbackStatus;
            await updateIntegration({ status: configuredStatus });
            return jsonResponse({
              instance: { state: configuredStatus },
              status: configuredStatus,
              reachable: false,
              error: upstreamError,
            });
          }

          return jsonResponse({
            instance: { state: fallbackStatus },
            status: fallbackStatus,
            reachable: false,
            error: upstreamError,
          });
        }

        const payload = typeof data === "object" && data !== null ? data as Record<string, any> : {};
        const state = payload.instance?.state;
        let newStatus = "disconnected";
        if (state === "open") newStatus = "connected";
        else if (state === "connecting") newStatus = "connecting";
        else if (type === "official" && config.access_token) newStatus = "configured";

        await updateIntegration({
          status: newStatus,
          config: {
            ...config,
            ...(payload.instance?.owner ? { connected_number: payload.instance.owner } : {}),
          },
        });

        return jsonResponse({ ...payload, status: newStatus, reachable: true });
      } catch (err) {
        if (isConnectionTimeout(err)) {
          return jsonResponse({
            instance: { state: fallbackStatus },
            status: fallbackStatus,
            reachable: false,
            error: "Evolution API is unavailable or timed out while checking the instance status.",
          });
        }
        throw err;
      }
    }

    if (action === "disconnect") {
      try {
        if (isOpenWA) {
          await fetch(`${config.api_url}/api/sessions/${instancePath}`, {
            method: "DELETE",
            headers: waAuthHeaders(config.api_key, true),
          });
        } else {
          const logoutRes = await fetch(`${config.api_url}/instance/logout/${instancePath}`, {
            method: "DELETE",
            headers: { apikey: config.api_key },
          });
          if (!logoutRes.ok) {
            await fetch(`${config.api_url}/instance/delete/${instancePath}`, {
              method: "DELETE",
              headers: { apikey: config.api_key },
            });
          }
        }
      } catch (err) {
        console.error("Error during disconnect:", err);
      }

      await updateIntegration({
        status: "disconnected",
        config: { ...config, connected_number: null }
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "send-message") {
      const body = await req.json();
      const { phone, message } = body;
      if (!phone || !message) {
        return new Response(JSON.stringify({ error: "Missing phone or message" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Honor toggle: bloqueia envio quando instância pausada (status='paused')
      if (integration?.status === "paused") {
        return jsonResponse({
          error: `Instância "${config.instance_name}" está pausada. Ative em Configurações > WhatsApp antes de enviar.`,
          code: "INSTANCE_PAUSED",
        }, 409);
      }

      const cleanPhone = phone.replace(/\D/g, "");
      const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

      let res: Response;
      try {
        // Contrato OpenWA (Swagger): body { chatId: "<telefone>@c.us", text } — não `to`.
        res = isOpenWA
          ? await fetch(`${config.api_url}/api/sessions/${instancePath}/messages/send-text`, {
              method: "POST",
              headers: { ...waAuthHeaders(config.api_key, true), "Content-Type": "application/json" },
              body: JSON.stringify({ chatId: `${formattedPhone}@c.us`, text: message }),
            })
          : await fetch(`${config.api_url}/message/sendText/${instancePath}`, {
              method: "POST",
              headers: { apikey: config.api_key, "Content-Type": "application/json" },
              body: JSON.stringify({
                number: formattedPhone,
                text: message,
              }),
            });
      } catch (fetchErr) {
        return jsonResponse({
          error: `Não foi possível alcançar o servidor WhatsApp (${config.instance_name}). Verifique se o servidor está online.`,
          code: "EVOLUTION_UNREACHABLE",
          detail: getErrorMessage(fetchErr),
          instance: config.instance_name,
        }, 502);
      }
      const data = await readResponseBody(res);

      if (!res.ok) {
        const rawMsg = (data && typeof data === "object")
          ? ((data as any).response?.message ?? (data as any).message ?? (data as any).error)
          : data;
        const evolutionMsg = Array.isArray(rawMsg) ? rawMsg.join("; ") : (rawMsg ? String(rawMsg) : `HTTP ${res.status}`);
        const friendly = res.status === 404
          ? `Instância "${config.instance_name}" não encontrada no servidor WhatsApp. Reconecte em Configurações > WhatsApp.`
          : res.status === 401 || res.status === 403
            ? `API Key inválida para a instância "${config.instance_name}". Atualize em Configurações > WhatsApp.`
            : `WhatsApp rejeitou o envio: ${evolutionMsg}`;
        return jsonResponse({
          error: friendly,
          code: "EVOLUTION_ERROR",
          evolution_status: res.status,
          evolution_body: data,
          instance: config.instance_name,
        }, 502);
      }

      let convId: string | null = null;
      const channel = type === "official" ? "whatsapp_official" : "whatsapp";
      const { data: existingConv } = await adminClient.from("conversations")
        .select("id")
        .eq("client_id", clientId)
        .eq("channel", channel)
        .eq("metadata->>phone", formattedPhone)
        .maybeSingle();

      if (existingConv) {
        convId = existingConv.id;
      } else {
        const { data: lead } = await adminClient.from("leads")
          .select("id")
          .eq("client_id", clientId)
          .or(`phone.ilike.%${cleanPhone.slice(-8)}%`)
          .limit(1)
          .maybeSingle();

        const convPayload: any = {
          client_id: clientId,
          lead_id: lead?.id || null,
          channel,
          status: "open",
          last_message: message,
          last_message_at: new Date().toISOString(),
          metadata: { phone: formattedPhone, instance_name: config.instance_name },
        };
        // Try with integration_id, fall back without it (column may not exist)
        let inserted = await adminClient.from("conversations")
          .insert({ ...convPayload, integration_id: integration.id }).select("id").single();
        if (inserted.error) {
          inserted = await adminClient.from("conversations").insert(convPayload).select("id").single();
        }
        // Final fallback: channel constraint blocks whatsapp_official
        if (inserted.error && channel === "whatsapp_official") {
          inserted = await adminClient.from("conversations").insert({
            ...convPayload,
            channel: "whatsapp",
            metadata: { ...convPayload.metadata, original_channel: "whatsapp_official" },
          }).select("id").single();
        }
        convId = inserted.data?.id || null;
      }

      if (convId) {
        // Grava o id devolvido pela Evolution. É o que permite ao
        // whatsapp-webhook descartar o eco `fromMe` desta mesma mensagem —
        // sem isso, tudo que o CRM envia aparecia duas vezes no inbox.
        // Evolution devolve key.id; OpenWA devolve waMessageId (ou id interno).
        const sentMessageId = (data as any)?.key?.id ?? (data as any)?.waMessageId ?? (data as any)?.id ?? null;
        await adminClient.from("messages").insert({
          client_id: clientId,
          tenant_id: tenantId,
          conversation_id: convId,
          content: message,
          type: "text",
          direction: "outbound",
          sender_name: "Você",
          metadata: { channel, whatsapp_message_id: sentMessageId }
        });
        await adminClient.from("conversations").update({
          last_message: message,
          last_message_at: new Date().toISOString(),
        }).eq("id", convId);
      }

      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "send-media") {
      if (isOpenWA) {
        // Endpoint de envio de mídia do servidor OpenWA não foi confirmado —
        // ver tmp/OPENWA_INTEGRATION_PENDING.md. Erro explícito em vez de adivinhar.
        return jsonResponse({ error: "Envio de mídia ainda não está disponível para o servidor WhatsApp atual (OpenWA). Use apenas texto por enquanto.", code: "NOT_SUPPORTED" }, 501);
      }

      const body = await req.json();
      const { phone, mediaUrl, mediaType, fileName, caption, mimetype } = body;
      if (!phone || !mediaUrl) {
        return new Response(JSON.stringify({ error: "Missing phone or mediaUrl" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Honor toggle: bloqueia envio quando instância pausada
      if (integration?.status === "paused") {
        return jsonResponse({
          error: `Instância "${config.instance_name}" está pausada. Ative em Configurações > WhatsApp antes de enviar.`,
          code: "INSTANCE_PAUSED",
        }, 409);
      }

      const cleanPhone = phone.replace(/\D/g, "");
      const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

      const endpoint = "sendMedia";
      const payload: Record<string, any> = {
        number: formattedPhone,
        mediatype: mediaType || "image",
        media: mediaUrl,
        fileName: fileName || "arquivo",
        caption: caption || ""
      };
      if (mimetype) payload.mimetype = mimetype;

      let res: Response;
      try {
        res = await fetch(`${config.api_url}/message/${endpoint}/${instancePath}`, {
          method: "POST",
          headers: { apikey: config.api_key, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (fetchErr) {
        return jsonResponse({
          error: `Não foi possível alcançar o servidor WhatsApp (${config.instance_name}). Verifique se a Evolution API está online.`,
          code: "EVOLUTION_UNREACHABLE",
          detail: getErrorMessage(fetchErr),
          instance: config.instance_name,
        }, 502);
      }
      const data = await readResponseBody(res);

      if (!res.ok) {
        const rawMsg = (data && typeof data === "object")
          ? ((data as any).response?.message ?? (data as any).message ?? (data as any).error)
          : data;
        const evolutionMsg = Array.isArray(rawMsg) ? rawMsg.join("; ") : (rawMsg ? String(rawMsg) : `HTTP ${res.status}`);
        const friendly = res.status === 404
          ? `Instância "${config.instance_name}" não encontrada no servidor WhatsApp. Reconecte em Configurações > WhatsApp.`
          : res.status === 401 || res.status === 403
            ? `API Key inválida para a instância "${config.instance_name}". Atualize em Configurações > WhatsApp.`
            : `WhatsApp rejeitou o envio de mídia: ${evolutionMsg}`;
        return jsonResponse({
          error: friendly,
          code: "EVOLUTION_ERROR",
          evolution_status: res.status,
          evolution_body: data,
          instance: config.instance_name,
        }, 502);
      }

      let convId: string | null = null;
      const mediaChannel = type === "official" ? "whatsapp_official" : "whatsapp";
      const { data: existingConv } = await adminClient.from("conversations")
        .select("id")
        .eq("client_id", clientId)
        .eq("channel", mediaChannel)
        .eq("metadata->>phone", formattedPhone)
        .maybeSingle();

      if (existingConv) {
        convId = existingConv.id;
      }

      if (convId) {
        const displayText = mediaType === "audio" ? "🎵 Áudio"
          : mediaType === "video" ? "🎥 Vídeo"
          : mediaType === "image" ? "📷 Imagem"
          : `📎 ${fileName || "Arquivo"}`;

        // Map disallowed types to allowed ones if migration not yet applied
        const fallbackType = (t: string) => {
          if (t === "video") return "file";
          if (t === "sticker") return "image";
          if (t === "document") return "file";
          if (t === "location" || t === "contact") return "text";
          return t;
        };
        const msgPayload = {
          client_id: clientId,
          conversation_id: convId,
          content: mediaUrl,
          type: mediaType || "image",
          direction: "outbound",
          sender_name: "Você",
          metadata: {
            media_url: mediaUrl,
            filename: fileName,
            channel: mediaChannel,
            // Mesmo motivo do send-message: sem o id da Evolution, o eco
            // `fromMe` desta mídia entra de novo pelo webhook.
            whatsapp_message_id: (data as any)?.key?.id ?? null,
          },
        };
        const insertResult = await adminClient.from("messages").insert(msgPayload);
        if (insertResult.error?.code === "23514") {
          await adminClient.from("messages").insert({
            ...msgPayload,
            type: fallbackType(mediaType || "image"),
            metadata: { ...msgPayload.metadata, original_type: mediaType },
          });
        }
        await adminClient.from("conversations").update({
          last_message: displayText,
          last_message_at: new Date().toISOString(),
        }).eq("id", convId);
      }

      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
