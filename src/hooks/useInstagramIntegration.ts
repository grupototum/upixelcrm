import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface InstagramConfig {
  configured: boolean;
  status: "disconnected" | "connected" | "error";
  ig_account_id: string;
  access_token: string;
  webhook_verify_token: string;
}

export function useInstagramIntegration() {
  const [config, setConfig] = useState<InstagramConfig>({
    configured: false,
    status: "disconnected",
    ig_account_id: "",
    access_token: "",
    webhook_verify_token: "",
  });
  const [loading, setLoading] = useState(false);

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  const fetchConfig = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("client_id")
        .eq("id", session.user.id)
        .single();
        
      if (!profile) return;

      const { data } = await supabase
        .from("integrations")
        .select("status, config")
        .eq("provider", "instagram")
        .eq("client_id", profile.client_id)
        .maybeSingle();

      if (data) {
        setConfig({
          configured: true,
          status: data.status as any || "disconnected",
          ig_account_id: (data.config as any)?.ig_account_id || "",
          access_token: (data.config as any)?.access_token || "",
          webhook_verify_token: (data.config as any)?.webhook_verify_token || "",
        });
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const saveConfig = async (ig_account_id: string, access_token: string, webhook_verify_token: string) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const url = `https://${projectId}.supabase.co/functions/v1/instagram-proxy?action=save-config`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ ig_account_id, access_token, webhook_verify_token }),
      });

      if (!res.ok) {
        throw new Error("Failed to save config.");
      }

      toast.success("Credenciais salvas com sucesso!");
      await fetchConfig();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar credenciais.");
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const url = `https://${projectId}.supabase.co/functions/v1/instagram-proxy?action=disconnect`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to disconnect.");
      }

      toast.success("Integração desconectada.");
      await fetchConfig();
    } catch (err: any) {
      toast.error(err.message || "Erro ao desconectar.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return { config, loading, saveConfig, fetchConfig, disconnect };
}
