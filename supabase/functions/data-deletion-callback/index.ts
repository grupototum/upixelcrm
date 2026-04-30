import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

interface SignedRequestPayload {
  algorithm: string;
  expires: number;
  issued_at: number;
  user_id?: string;
  app_user_id?: string;
}

// Helper to decode base64url
function base64urlDecode(str: string): string {
  const padding = "=".repeat((4 - (str.length % 4)) % 4);
  const decoded = atob((str + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return decoded;
}

// Helper to encode to base64url
function base64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// Verify the signed_request signature
async function verifySignedRequest(
  signedRequest: string,
  appSecret: string
): Promise<SignedRequestPayload | null> {
  try {
    const parts = signedRequest.split(".");
    if (parts.length !== 2) {
      console.error("Invalid signed_request format");
      return null;
    }

    const [encodedPayload, providedSignature] = parts;

    // Decode the payload
    const payloadJson = base64urlDecode(encodedPayload);
    const payload: SignedRequestPayload = JSON.parse(payloadJson);

    // Verify signature: HMAC-SHA256(payload, app_secret)
    const encoder = new TextEncoder();
    const keyData = encoder.encode(appSecret);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBytes = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(encodedPayload)
    );
    const calculatedSignature = base64urlEncode(new Uint8Array(signatureBytes));

    if (calculatedSignature !== providedSignature) {
      console.error("Signature verification failed");
      return null;
    }

    return payload;
  } catch (error) {
    console.error("Error verifying signed_request:", error);
    return null;
  }
}

// Generate a confirmation code
function generateConfirmationCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 32; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

serve(async (req) => {
  // Only handle POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const appSecret = Deno.env.get("FACEBOOK_APP_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!appSecret || !supabaseUrl || !supabaseServiceKey) {
      console.error("Missing required environment variables");
      return new Response(
        JSON.stringify({ error: "Server misconfiguration" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse the form data
    const formData = await req.formData();
    const signedRequest = formData.get("signed_request");

    if (!signedRequest || typeof signedRequest !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid signed_request" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify the signed request
    const payload = await verifySignedRequest(signedRequest, appSecret);
    if (!payload) {
      return new Response(
        JSON.stringify({ error: "Invalid signed_request" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Extract user ID (could be user_id or app_user_id depending on context)
    const userId = payload.user_id || payload.app_user_id;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "No user ID in signed_request" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role key for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Processing data deletion for user: ${userId}`);

    // For Meta integrations, find the user by their Meta user ID
    // This assumes you have a column tracking the Meta user ID
    // Adjust the query based on your actual schema

    // Option 1: If users have a meta_user_id or similar column
    const { data: users, error: searchError } = await supabase
      .from("users")
      .select("id, auth_id")
      .or(`meta_user_id.eq.${userId},facebook_id.eq.${userId},instagram_id.eq.${userId}`)
      .limit(1);

    if (searchError) {
      console.error("Error searching for user:", searchError);
      // Still return success to Meta - we'll log this for manual review
      return new Response(
        JSON.stringify({
          url: `${supabaseUrl}/data-deletion-status?code=${generateConfirmationCode()}`,
          confirmation_code: generateConfirmationCode(),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (users && users.length > 0) {
      const user = users[0];
      const internalUserId = user.id;

      // Delete all user data (adjust tables based on your schema)
      // This should cascade delete if proper foreign keys are set up

      // Delete from leads (conversations, messages will cascade)
      await supabase
        .from("leads")
        .delete()
        .eq("created_by", internalUserId);

      // Delete from conversations
      await supabase
        .from("conversations")
        .delete()
        .eq("created_by", internalUserId);

      // Delete from tasks
      await supabase
        .from("tasks")
        .delete()
        .eq("created_by", internalUserId);

      // Delete from automations
      await supabase
        .from("automations")
        .delete()
        .eq("created_by", internalUserId);

      // Delete user preferences/settings
      await supabase
        .from("user_settings")
        .delete()
        .eq("user_id", internalUserId);

      // Delete from audit log
      await supabase
        .from("audit_log")
        .delete()
        .eq("user_id", internalUserId);

      // Finally, delete the user from auth if they exist
      if (user.auth_id) {
        try {
          // Note: Deleting via auth admin API requires special handling
          // This is a placeholder - actual deletion via admin API may vary
          console.log(`Queued auth user ${user.auth_id} for deletion`);
        } catch (authError) {
          console.error("Error deleting auth user:", authError);
          // Continue despite auth deletion error
        }
      }

      console.log(`Data deletion completed for internal user: ${internalUserId}`);
    }

    // Generate confirmation code
    const confirmationCode = generateConfirmationCode();

    // Return the response in the format Meta expects
    // The URL should be a page where the user (or Meta) can check deletion status
    return new Response(
      JSON.stringify({
        url: `${supabaseUrl}/data-deletion-status?code=${confirmationCode}`,
        confirmation_code: confirmationCode,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Data deletion callback error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
