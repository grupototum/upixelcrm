// Adds a tenant subdomain as a custom domain in the Vercel project, so that
// `{subdomain}.upixel.app` resolves to the app without manual admin action.
//
// Fluxo:
//   1. SignupPage cria tenant+org no Supabase
//   2. Chama essa função fire-and-forget com { subdomain }
//   3. Aqui validamos o subdomínio, verificamos auth e POSTamos pra Vercel API
//   4. Vercel cria o domínio + provisiona SSL (~10s)
//   5. O onboarding do cliente fica 100% automático
//
// Idempotente: se o domínio já existir (409 da Vercel), retornamos sucesso.
//
// Secrets necessários (Supabase Edge → Settings → Secrets):
//   VERCEL_API_TOKEN
//   VERCEL_PROJECT_ID
//   VERCEL_TEAM_ID   (opcional, só pra projetos de team)
//
// Env opcional:
//   ROOT_DOMAIN      (default: "upixel.app")

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

const SUBDOMAIN_RE = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;
const DEFAULT_ROOT = "upixel.app";

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

async function readBody(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth: usuário recém-criado pelo signup tem sessão válida — usamos
    // isso como prova de que a chamada vem do fluxo legítimo.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const subdomain = String((body as { subdomain?: string }).subdomain ?? "").trim().toLowerCase();

    if (!SUBDOMAIN_RE.test(subdomain)) {
      return json({ error: "Subdomínio inválido", code: "INVALID_SUBDOMAIN" }, 400);
    }

    const vercelToken = Deno.env.get("VERCEL_API_TOKEN");
    const projectId = Deno.env.get("VERCEL_PROJECT_ID");
    const teamId = Deno.env.get("VERCEL_TEAM_ID");
    const rootDomain = Deno.env.get("ROOT_DOMAIN") || DEFAULT_ROOT;

    if (!vercelToken || !projectId) {
      return json({
        error: "Vercel API não configurada. Faltam VERCEL_API_TOKEN ou VERCEL_PROJECT_ID nos secrets.",
        code: "VERCEL_NOT_CONFIGURED",
      }, 503);
    }

    const fullDomain = `${subdomain}.${rootDomain}`;

    const url = new URL(`https://api.vercel.com/v10/projects/${projectId}/domains`);
    if (teamId) url.searchParams.set("teamId", teamId);

    const vercelRes = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: fullDomain }),
    });
    const vercelData = await readBody(vercelRes);

    // 409 = domain already exists no projeto → idempotente, tratamos como sucesso
    if (vercelRes.status === 409) {
      return json({
        success: true,
        domain: fullDomain,
        already_existed: true,
      });
    }

    if (!vercelRes.ok) {
      const errCode = (vercelData as { error?: { code?: string } })?.error?.code;
      const errMsg = (vercelData as { error?: { message?: string } })?.error?.message
        ?? `HTTP ${vercelRes.status}`;
      console.error("[tenant-provision-domain] Vercel API error:", vercelRes.status, vercelData);
      return json({
        error: `Falha ao adicionar domínio na Vercel: ${errMsg}`,
        code: errCode ?? "VERCEL_API_ERROR",
        details: vercelData,
      }, 502);
    }

    return json({
      success: true,
      domain: fullDomain,
      vercel: vercelData,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("tenant-provision-domain error:", message);
    return json({ error: message }, 500);
  }
});
