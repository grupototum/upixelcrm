import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * check-signup-gate
 * Valida senha de acesso ao /cadastro contra Vault — nunca expõe o secret.
 * POST { password: string } → 200 { ok: true } | 401 { ok: false }
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  let body: { password?: string };
  try { body = await req.json(); }
  catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const submitted = (body.password ?? "").trim();
  if (!submitted) {
    return new Response(JSON.stringify({ ok: false, reason: "missing_password" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await supabase
    .rpc("read_secret", { secret_name: "signup_gate_password" })
    .single();

  if (error || !data) {
    console.error("Vault read error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const expected: string = data as string;
  const match =
    submitted.length === expected.length &&
    submitted.split("").every((c, i) => c === expected[i]);

  if (!match) {
    await new Promise((r) => setTimeout(r, 500));
    return new Response(JSON.stringify({ ok: false, reason: "invalid_password" }), {
      status: 401, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { ...CORS, "Content-Type": "application/json" },
  });
});
