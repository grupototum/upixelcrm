import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WhatsAppConfig {
  api_url: string;
  instance_name: string;
  has_api_key: boolean;
  status: string;
  configured: boolean;
  phone_number_id?: string;
  business_id?: string;
  access_token?: string;
}

export function useWhatsAppIntegration(type: "normal" | "official" = "normal") {
  const [config, setConfig] = useState<WhatsAppConfig>({
    api_url: "",
    instance_name: "",
    has_api_key: false,
    status: "disconnected",
    configured: false,
  });
  const [loading, setLoading] = useState(true);
  const [qrData, setQrData] = useState<string | null>(null);
  const [connectedNumber, setConnectedNumber] = useState("");

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  const invokeFunction = useCallback(async (action: string, body?: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const url = `https://${projectId}.supabase.co/functions/v1/whatsapp-proxy?action=${action}&type=${type}`;
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

  const loadConfig = useCallback(async () => {
    try {
      const data = await invokeFunction("get-config");
      setConfig(data);
      if (data.status === "connected") {
        setConnectedNumber((data as any).connected_number || "");
      }
    } catch {
      // not configured yet
    } finally {
      setLoading(false);
    }
  }, [invokeFunction]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const saveConfig = useCallback(async (
    apiUrl: string, 
    instanceName: string, 
    apiKey: string,
    phoneNumberId?: string,
    businessId?: string,
    accessToken?: string
  ) => {
    try {
      await invokeFunction("save-config", { 
        api_url: apiUrl, 
        instance_name: instanceName, 
        api_key: apiKey,
        phone_number_id: phoneNumberId,
        business_id: businessId,
        access_token: accessToken
      });
      toast.success("Credenciais salvas com sucesso!");
      await loadConfig();
    } catch (err: any) {
      toast.error(err.message);
    }
  }, [invokeFunction, loadConfig]);

  const connect = useCallback(async () => {
    try {
      setQrData(null);
      const data = await invokeFunction("connect");
      if (data.base64) {
        setQrData(data.base64);
      }
      return data;
    } catch (err: any) {
      toast.error(`Erro ao conectar: ${err.message}`);
      return null;
    }
  }, [invokeFunction]);

  const checkStatus = useCallback(async () => {
    try {
      const data = await invokeFunction("status");
      setConfig(prev => ({ ...prev, status: data.status }));
      if (data.status === "connected" && data.instance?.owner) {
        setConnectedNumber(data.instance.owner);
      }
      return data;
    } catch {
      return null;
    }
  }, [invokeFunction]);

  const disconnect = useCallback(async () => {
    try {
      await invokeFunction("disconnect");
      setConfig(prev => ({ ...prev, status: "disconnected" }));
      setConnectedNumber("");
      setQrData(null);
      toast.info("WhatsApp desconectado.");
    } catch (err: any) {
      toast.error(err.message);
    }
  }, [invokeFunction]);

  return {
    config,
    loading,
    qrData,
    connectedNumber,
    saveConfig,
    connect,
    checkStatus,
    disconnect,
    refresh: loadConfig,
  };
}
