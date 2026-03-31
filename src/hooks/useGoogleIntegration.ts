import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GoogleStatus {
  connected: boolean;
  email: string | null;
  name: string | null;
  loading: boolean;
  credentialsConfigured: boolean;
}

export function useGoogleIntegration() {
  const [status, setStatus] = useState<GoogleStatus>({
    connected: false,
    email: null,
    name: null,
    loading: true,
    credentialsConfigured: false,
  });

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  const invokeFunction = useCallback(async (action: string, body?: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const url = `https://${projectId}.supabase.co/functions/v1/google-oauth?action=${action}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Request failed");
    }
    return res.json();
  }, [projectId]);

  const checkStatus = useCallback(async () => {
    try {
      const data = await invokeFunction("status");
      setStatus({ connected: data.connected, email: data.email, name: data.name, loading: false, credentialsConfigured: data.credentials_configured ?? false });
    } catch {
      setStatus(s => ({ ...s, loading: false }));
    }
  }, [invokeFunction]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");

    if (code && window.location.pathname === "/google") {
      // Remove code from URL
      window.history.replaceState({}, "", "/google");

      (async () => {
        try {
          toast.loading("Finalizando conexão com Google...");
          const redirectUri = `${window.location.origin}/google`;
          const data = await invokeFunction("callback", { code, redirect_uri: redirectUri });
          toast.dismiss();
          toast.success(`Google conectado: ${data.email}`);
          setStatus({ connected: true, email: data.email, name: data.name, loading: false });
        } catch (err: any) {
          toast.dismiss();
          toast.error(`Erro ao conectar: ${err.message}`);
        }
      })();
    }
  }, [invokeFunction]);

  const connect = useCallback(async () => {
    try {
      const redirectUri = `${window.location.origin}/google`;
      const data = await invokeFunction("auth-url", { redirect_uri: redirectUri });
      window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message);
    }
  }, [invokeFunction]);

  const disconnect = useCallback(async () => {
    try {
      await invokeFunction("disconnect");
      setStatus({ connected: false, email: null, name: null, loading: false });
      toast.info("Conta Google desconectada.");
    } catch (err: any) {
      toast.error(err.message);
    }
  }, [invokeFunction]);

  const fetchGmailList = useCallback(() => invokeFunction("gmail-list"), [invokeFunction]);
  const fetchCalendarList = useCallback(() => invokeFunction("calendar-list"), [invokeFunction]);
  const fetchDriveList = useCallback(() => invokeFunction("drive-list"), [invokeFunction]);
  const sendEmail = useCallback((to: string, subject: string, body: string) =>
    invokeFunction("gmail-send", { to, subject, body }), [invokeFunction]);

  return {
    ...status,
    connect,
    disconnect,
    fetchGmailList,
    fetchCalendarList,
    fetchDriveList,
    sendEmail,
    refresh: checkStatus,
  };
}
