import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

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
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Get client_id for the user
    const { data: profile } = await supabase
      .from("profiles")
      .select("client_id")
      .eq("id", userId)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientId = profile.client_id;

    // Actions that don't require Google credentials
    if (action === "status") {
      const { data: integration } = await supabase
        .from("integrations")
        .select("status, config, token_expires_at")
        .eq("provider", "google")
        .single();

      const hasCredentials = !!Deno.env.get("GOOGLE_CLIENT_ID") && !!Deno.env.get("GOOGLE_CLIENT_SECRET");

      return new Response(
        JSON.stringify({
          connected: integration?.status === "connected",
          email: (integration?.config as any)?.email || null,
          name: (integration?.config as any)?.name || null,
          expires_at: integration?.token_expires_at || null,
          credentials_configured: hasCredentials,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "disconnect") {
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await adminClient.from("integrations").update({ status: "disconnected", access_token: null, refresh_token: null })
        .eq("client_id", clientId).eq("provider", "google");
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // All other actions require Google credentials
    const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
    const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ error: "Credenciais Google não configuradas. Adicione GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET como secrets." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to upsert integrations (since RLS is on)
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "auth-url") {
      const body = await req.json();
      const redirectUri = body.redirect_uri;
      const scopes = [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/drive.readonly",
      ];

      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: scopes.join(" "),
        access_type: "offline",
        prompt: "consent",
        state: clientId,
      });

      return new Response(
        JSON.stringify({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "callback") {
      const body = await req.json();
      const { code, redirect_uri } = body;

      if (!code) {
        return new Response(JSON.stringify({ error: "Missing authorization code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Exchange code for tokens
      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: redirect_uri,
          grant_type: "authorization_code",
        }),
      });

      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        return new Response(JSON.stringify({ error: tokenData.error_description || tokenData.error }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get user info
      const userInfoRes = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userInfo = await userInfoRes.json();

      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

      // Store tokens
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

      return new Response(
        JSON.stringify({ success: true, email: userInfo.email, name: userInfo.name }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "refresh") {
      const { data: integration } = await adminClient
        .from("integrations")
        .select("*")
        .eq("client_id", clientId)
        .eq("provider", "google")
        .single();

      if (!integration?.refresh_token) {
        return new Response(JSON.stringify({ error: "No refresh token available" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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
        return new Response(JSON.stringify({ error: "Token refresh failed" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

      await adminClient.from("integrations").update({
        access_token: tokenData.access_token,
        token_expires_at: expiresAt,
        status: "connected",
      }).eq("client_id", clientId).eq("provider", "google");

      return new Response(
        JSON.stringify({ success: true, access_token: tokenData.access_token }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "status") {
      const { data: integration } = await supabase
        .from("integrations")
        .select("status, config, token_expires_at")
        .eq("provider", "google")
        .single();

      return new Response(
        JSON.stringify({
          connected: integration?.status === "connected",
          email: (integration?.config as any)?.email || null,
          name: (integration?.config as any)?.name || null,
          expires_at: integration?.token_expires_at || null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "disconnect") {
      await adminClient.from("integrations").update({ status: "disconnected", access_token: null, refresh_token: null })
        .eq("client_id", clientId).eq("provider", "google");

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Proxy Google API calls
    if (action === "gmail-list" || action === "calendar-list" || action === "drive-list" || action === "gmail-send") {
      const { data: integration } = await adminClient
        .from("integrations")
        .select("*")
        .eq("client_id", clientId)
        .eq("provider", "google")
        .single();

      if (!integration?.access_token) {
        return new Response(JSON.stringify({ error: "Not connected to Google" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if token expired, refresh if needed
      if (integration.token_expires_at && new Date(integration.token_expires_at) < new Date()) {
        if (integration.refresh_token) {
          const refreshRes = await fetch(GOOGLE_TOKEN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: GOOGLE_CLIENT_ID,
              client_secret: GOOGLE_CLIENT_SECRET,
              refresh_token: integration.refresh_token,
              grant_type: "refresh_token",
            }),
          });
          const refreshData = await refreshRes.json();
          if (!refreshData.error) {
            integration.access_token = refreshData.access_token;
            await adminClient.from("integrations").update({
              access_token: refreshData.access_token,
              token_expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
            }).eq("client_id", clientId).eq("provider", "google");
          }
        }
      }

      const accessToken = integration.access_token;
      let apiUrl: string;
      let apiOptions: RequestInit = { headers: { Authorization: `Bearer ${accessToken}` } };

      switch (action) {
        case "gmail-list":
          apiUrl = "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20";
          break;
        case "gmail-send": {
          const body = await req.json();
          const raw = btoa(
            `To: ${body.to}\r\nSubject: ${body.subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body.body}`
          );
          apiUrl = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
          apiOptions = {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ raw }),
          };
          break;
        }
        case "calendar-list":
          apiUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=20&timeMin=${new Date().toISOString()}&orderBy=startTime&singleEvents=true`;
          break;
        case "drive-list":
          apiUrl = "https://www.googleapis.com/drive/v3/files?pageSize=20&fields=files(id,name,mimeType,size,modifiedTime,owners)";
          break;
        default:
          return new Response(JSON.stringify({ error: "Unknown action" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
      }

      const apiRes = await fetch(apiUrl, apiOptions);
      const apiData = await apiRes.json();

      return new Response(JSON.stringify(apiData), {
        status: apiRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
