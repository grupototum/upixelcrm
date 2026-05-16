// Meta Deauthorize Callback
// https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow/#deauth
//
// Quando o usuário remove o app no Facebook/Meta Business, a Meta POSTa aqui:
//   - Content-Type: application/x-www-form-urlencoded
//   - Campo: signed_request=BASE64URL_HEADER.BASE64URL_PAYLOAD
//
// Diferente do data-deletion-callback: aqui não apagamos dados — apenas
// registramos o evento. Um worker posterior invalida tokens armazenados
// para esse meta_user_id.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

const jsonResp = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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

  if (req.method === "GET") {
    return jsonResp({
      ok: true,
      message: "Meta Deauthorize Callback endpoint — POST aqui com signed_request quando usuário remove o app",
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

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await admin.from("meta_deauthorization_events").insert({
      meta_user_id: userId,
      payload,
      status: "pending",
    }).then(() => undefined).catch((e) => {
      console.error("Failed to insert deauthorization event:", e?.message ?? e);
    });

    return jsonResp({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("deauthorize-callback error:", message);
    return jsonResp({ error: message }, 500);
  }
});
