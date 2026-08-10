// Notifica todos os usuários com role "master" sobre um novo cadastro de tenant.
// Chamado em fire-and-forget pelo SignupPage após o tenant ser criado com sucesso.
// Roda com service_role para conseguir escrever em notifications.user_id != auth.uid().

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

interface SignupPayload {
  tenantId?: string;
  tenantName?: string;
  subdomain?: string;
  ownerEmail?: string;
  ownerName?: string;
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

    // Confirma que o token é de um usuário válido (mesmo recém-criado).
    // O signup acabou de gerar uma sessão para este usuário; usamos isso como prova
    // de que a chamada vem do fluxo legítimo de cadastro, não de um agente externo.
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json().catch(() => ({}))) as SignupPayload;
    const tenantName = (payload.tenantName ?? "").trim() || "(sem nome)";
    const subdomain = (payload.subdomain ?? "").trim();
    const ownerEmail = (payload.ownerEmail ?? "").trim();
    const ownerName = (payload.ownerName ?? "").trim();

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Busca todos os usuários master.
    const { data: masters, error: mastersError } = await adminClient
      .from("profiles")
      .select("id")
      .eq("role", "master");

    if (mastersError) {
      return new Response(JSON.stringify({ error: mastersError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!masters || masters.length === 0) {
      // Sem masters cadastrados — nada a notificar.
      return new Response(JSON.stringify({ notified: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const title = "Novo cadastro no uPixel";
    const bodyLines = [
      `Empresa: ${tenantName}`,
      subdomain ? `Subdomínio: ${subdomain}` : null,
      ownerName ? `Responsável: ${ownerName}` : null,
      ownerEmail ? `E-mail: ${ownerEmail}` : null,
    ].filter(Boolean);
    const body = bodyLines.join(" · ");

    const rows = masters.map((m) => ({
      user_id: m.id,
      type: "new_signup",
      title,
      body,
      read: false,
    }));

    const { error: insertError } = await adminClient.from("notifications").insert(rows);
    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ notified: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
