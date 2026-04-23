import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

import { corsHeaders } from "../_shared/cors.ts";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const { data: profile } = await supabase.from("profiles").select("client_id").eq("id", user.id).single();
    if (!profile) return json({ error: "Profile not found" }, 404);

    const clientId = profile.client_id;
    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const url = new URL(req.url);
    const rawAction = url.searchParams.get("action") ?? "";
    let action = rawAction.trim();

    if (action.includes("&")) {
      const [primaryAction, ...extraPairs] = action.split("&");
      action = primaryAction.trim();
      url.searchParams.set("action", action);

      for (const pair of extraPairs) {
        const [key, value] = pair.split("=");
        if (key && value && !url.searchParams.has(key)) {
          url.searchParams.set(key, value);
        }
      }
    }

    console.log("google-oauth request");

    // Helper: get stored Google credentials from integrations table config
    const getGoogleCreds = async () => {
      const { data } = await adminClient
        .from("integrations")
        .select("config")
        .eq("client_id", clientId)
        .eq("provider", "google_credentials")
        .single();
      const cfg = data?.config as { google_client_id?: string; google_client_secret?: string } | null;
      return {
        clientId: cfg?.google_client_id || Deno.env.get("GOOGLE_CLIENT_ID") || null,
        clientSecret: cfg?.google_client_secret || Deno.env.get("GOOGLE_CLIENT_SECRET") || null,
      };
    };

    // ──── save-credentials: store Google OAuth creds in DB ────
    if (action === "save-credentials") {
      const body = await req.json();
      const { google_client_id, google_client_secret } = body;
      if (!google_client_id || !google_client_secret) return json({ error: "Missing fields" }, 400);

      await adminClient.from("integrations").upsert(
        {
          client_id: clientId,
          provider: "google_credentials",
          status: "configured",
          config: { google_client_id, google_client_secret },
        },
        { onConflict: "client_id,provider" }
      );
      return json({ success: true });
    }

    // ──── status: check connection + credential status ────
    if (action === "status") {
      const { data: integration } = await supabase
        .from("integrations")
        .select("status, config, token_expires_at")
        .eq("provider", "google")
        .single();

      const creds = await getGoogleCreds();

      return json({
        connected: integration?.status === "connected",
        email: (integration?.config as any)?.email || null,
        name: (integration?.config as any)?.name || null,
        expires_at: integration?.token_expires_at || null,
        credentials_configured: !!(creds.clientId && creds.clientSecret),
      });
    }

    // ──── disconnect ────
    if (action === "disconnect") {
      await adminClient.from("integrations").update({ status: "disconnected", access_token: null, refresh_token: null })
        .eq("client_id", clientId).eq("provider", "google");
      return json({ success: true });
    }

    // ──── All other actions need Google creds ────
    const creds = await getGoogleCreds();
    if (!creds.clientId || !creds.clientSecret) {
      return json({ error: "Credenciais Google não configuradas." }, 400);
    }
    const GOOGLE_CLIENT_ID = creds.clientId;
    const GOOGLE_CLIENT_SECRET = creds.clientSecret;

    // ──── auth-url ────
    if (action === "auth-url") {
      const body = await req.json();
      const scopes = [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/drive.readonly",
      ];
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: body.redirect_uri,
        response_type: "code",
        scope: scopes.join(" "),
        access_type: "offline",
        prompt: "consent",
        state: clientId,
      });
      return json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
    }

    // ──── callback ────
    if (action === "callback") {
      const body = await req.json();
      if (!body.code) return json({ error: "Missing authorization code" }, 400);

      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: body.code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: body.redirect_uri,
          grant_type: "authorization_code",
        }),
      });
      const tokenData = await tokenRes.json();
      if (tokenData.error) return json({ error: tokenData.error_description || tokenData.error }, 400);

      const userInfoRes = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userInfo = await userInfoRes.json();
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

      await adminClient.from("integrations").upsert(
        {
          client_id: clientId,
          provider: "google",
          status: "connected",
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || null,
          token_expires_at: expiresAt,
          config: { email: userInfo.email, name: userInfo.name, picture: userInfo.picture },
        },
        { onConflict: "client_id,provider" }
      );
      return json({ success: true, email: userInfo.email, name: userInfo.name });
    }

    // ──── refresh ────
    if (action === "refresh") {
      const { data: integration } = await adminClient.from("integrations").select("*")
        .eq("client_id", clientId).eq("provider", "google").single();
      if (!integration?.refresh_token) return json({ error: "No refresh token" }, 400);

      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: integration.refresh_token,
          grant_type: "refresh_token",
        }),
      });
      const tokenData = await tokenRes.json();
      if (tokenData.error) {
        await adminClient.from("integrations").update({ status: "error" })
          .eq("client_id", clientId).eq("provider", "google");
        return json({ error: "Token refresh failed" }, 400);
      }
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
      await adminClient.from("integrations").update({
        access_token: tokenData.access_token, token_expires_at: expiresAt, status: "connected",
      }).eq("client_id", clientId).eq("provider", "google");
      return json({ success: true, access_token: tokenData.access_token });
    }

    // ──── proxy Google API ────
    const proxyActions = ["gmail-list", "gmail-get", "calendar-list", "drive-list", "gmail-send"];
    if (proxyActions.includes(action || "")) {
      const { data: integration } = await adminClient.from("integrations").select("*")
        .eq("client_id", clientId).eq("provider", "google").single();
      if (!integration?.access_token) return json({ error: "Not connected to Google" }, 401);

      // Auto-refresh if expired
      if (integration.token_expires_at && new Date(integration.token_expires_at) < new Date() && integration.refresh_token) {
        const rr = await fetch(GOOGLE_TOKEN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET,
            refresh_token: integration.refresh_token, grant_type: "refresh_token",
          }),
        });
        const rd = await rr.json();
        if (!rd.error) {
          integration.access_token = rd.access_token;
          await adminClient.from("integrations").update({
            access_token: rd.access_token,
            token_expires_at: new Date(Date.now() + rd.expires_in * 1000).toISOString(),
          }).eq("client_id", clientId).eq("provider", "google");
        }
      }

      const at = integration.access_token;

      if (action === "gmail-list") {
        const listRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20", { headers: { Authorization: `Bearer ${at}` } });
        const listData = await listRes.json();
        if (!listRes.ok) return json(listData, listRes.status);

        const messages = listData.messages || [];
        const detailed = await Promise.all(
          messages.slice(0, 20).map(async (m: { id: string }) => {
            const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, { headers: { Authorization: `Bearer ${at}` } });
            return r.json();
          })
        );
        return json({ messages: detailed });
      }

      if (action === "gmail-get") {
        const messageId = url.searchParams.get("id");
        if (!messageId) return json({ error: "Missing message id" }, 400);
        const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
          headers: { Authorization: `Bearer ${at}` }
        });
        return json(await res.json(), res.status);
      }

      if (action === "gmail-send") {
        const body = await req.json();
        const raw = btoa(unescape(encodeURIComponent(`To: ${body.to}\r\nSubject: ${body.subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body.body}`)));
        const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
          method: "POST",
          headers: { Authorization: `Bearer ${at}`, "Content-Type": "application/json" },
          body: JSON.stringify({ raw }),
        });
        return json(await sendRes.json(), sendRes.status);
      }

      if (action === "calendar-list") {
        const calRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=20&timeMin=${new Date().toISOString()}&orderBy=startTime&singleEvents=true&fields=items(id,summary,start,end,location,description,hangoutLink,htmlLink,attendees)`, { headers: { Authorization: `Bearer ${at}` } });
        return json(await calRes.json(), calRes.status);
      }

      if (action === "drive-list") {
        const driveRes = await fetch("https://www.googleapis.com/drive/v3/files?pageSize=20&fields=files(id,name,mimeType,size,modifiedTime,owners,webViewLink)", { headers: { Authorization: `Bearer ${at}` } });
        return json(await driveRes.json(), driveRes.status);
      }

      return json({ error: "Unknown action" }, 400);
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
