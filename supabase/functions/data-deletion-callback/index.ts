// Meta Data Deletion Request Callback
// https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback/
//
// Quando o usuário pede "remover dados deste app" no Meta Business Suite ou
// desinstala o app, a Meta POSTa aqui:
//   - Content-Type: application/x-www-form-urlencoded
//   - Campo: signed_request=BASE64URL_HEADER.BASE64URL_PAYLOAD
//
// O payload é HMAC-SHA256(payload, META_APP_SECRET). Validamos a assinatura,
// extraímos user_id, e respondemos:
//   { "url": "https://upixel.app/data-deletion-status?code=XXX",
//     "confirmation_code": "XXX" }
//
// Em paralelo, agendamos a remoção dos dados associados ao Meta user_id.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

const jsonResp = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Base64URL → Base64 padrão
function base64UrlToBase64(input: string): string {
  let b = input.replace(/-/g, "+").replace(/_/g, "/");
  while (b.length % 4 !== 0) b += "=";
  return b;
}

function base64UrlDecodeToBytes(input: string): Uint8Array {
  const std = base64UrlToBase64(input);
  const raw = atob(std);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function verifySignedRequest(signedRequest: string, appSecret: string): Promise<Record<string, unknown> | null> {
  const [encodedSig, encodedPayload] = signedRequest.split(".");
  if (!encodedSig || !encodedPayload) return null;

  const sigBytes = base64UrlDecodeToBytes(encodedSig);

  const enc = new TextEncoder();
  const keyData = enc.encode(appSecret);
  const cryptoKey = await crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const expected = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(encodedPayload));
  const expectedBytes = new Uint8Array(expected);

  if (expectedBytes.length !== sigBytes.length) return null;
  let diff = 0;
  for (let i = 0; i < expectedBytes.length; i++) diff |= expectedBytes[i] ^ sigBytes[i];
  if (diff !== 0) return null;

  try {
    const payloadJson = new TextDecoder().decode(base64UrlDecodeToBytes(encodedPayload));
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // GET — health-check (Meta usa pra validar que o endpoint existe)
  if (req.method === "GET") {
    return jsonResp({
      ok: true,
      message: "Meta Data Deletion Callback endpoint — POST aqui com signed_request pra deletar dados",
    });
  }

  if (req.method !== "POST") {
    return jsonResp({ error: "Method not allowed" }, 405);
  }

  try {
    const appSecret = Deno.env.get("META_APP_SECRET");
    if (!appSecret) {
      console.error("META_APP_SECRET not set");
      return jsonResp({ error: "Server not configured" }, 503);
    }

    // Lê signed_request do form-urlencoded
    const ct = req.headers.get("content-type") || "";
    let signedRequest: string | null = null;
    if (ct.includes("application/x-www-form-urlencoded")) {
      const form = await req.formData();
      signedRequest = (form.get("signed_request") as string | null) ?? null;
    } else if (ct.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      signedRequest = body?.signed_request ?? null;
    }

    if (!signedRequest) {
      return jsonResp({ error: "Missing signed_request" }, 400);
    }

    const payload = await verifySignedRequest(signedRequest, appSecret);
    if (!payload) {
      return jsonResp({ error: "Invalid signature" }, 401);
    }

    const userId = (payload.user_id as string | undefined) ?? "";
    if (!userId) {
      return jsonResp({ error: "Missing user_id in payload" }, 400);
    }

    // Gera código curto e único
    const confirmationCode = `del_${userId.slice(0, 8)}_${Date.now().toString(36)}`;
    const statusUrl = `https://upixel.app/data-deletion-status?code=${encodeURIComponent(confirmationCode)}`;

    // Registra a solicitação no banco — workers/admin processam a remoção real depois
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Best-effort: tabela meta_data_deletion_requests (cria se não existir via migration separada)
    await admin.from("meta_data_deletion_requests").insert({
      meta_user_id: userId,
      confirmation_code: confirmationCode,
      payload,
      status: "pending",
    }).then(() => undefined).catch((e) => {
      // Não derruba a resposta — só loga. A Meta exige resposta rápida.
      console.error("Failed to insert deletion request:", e?.message ?? e);
    });

    return jsonResp({
      url: statusUrl,
      confirmation_code: confirmationCode,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("data-deletion-callback error:", message);
    return jsonResp({ error: message }, 500);
  }
});
