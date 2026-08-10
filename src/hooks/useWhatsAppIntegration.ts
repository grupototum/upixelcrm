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

export function useWhatsAppIntegration(
  type: "normal" | "official" = "normal",
  instanceName?: string
) {
  const [config, setConfig] = useState<WhatsAppConfig>({
    api_url: "",
    instance_name: instanceName || "",
    has_api_key: false,
    status: "disconnected",
    configured: false,
  });
  const [loading, setLoading] = useState(true);
  const [qrData, setQrData] = useState<string | null>(null);
  const [connectedNumber, setConnectedNumber] = useState("");

  const buildParams = useCallback(
    (action: string) => {
      const p = new URLSearchParams({ action, type });
      if (instanceName) p.set("instance_name", instanceName);
      return p.toString();
    },
    [type, instanceName]
  );

  const invokeFunction = useCallback(
    async (action: string, body?: Record<string, unknown>) => {
      const { data, error } = await supabase.functions.invoke(
        `whatsapp-proxy?${buildParams(action)}`,
        { body: body ? body : undefined }
      );
      if (error) throw new Error(error.message || "Request failed");
      return data;
    },
    [buildParams]
  );

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

  const saveConfig = useCallback(
    async (
      apiUrl: string,
      instanceNameArg: string,
      apiKey: string,
      phoneNumberId?: string,
      businessId?: string,
      accessToken?: string
    ) => {
      try {
        await invokeFunction("save-config", {
          api_url: apiUrl,
          instance_name: instanceNameArg,
          api_key: apiKey,
          phone_number_id: phoneNumberId,
          business_id: businessId,
          access_token: accessToken,
        });
        toast.success("Credenciais salvas com sucesso!");
        await loadConfig();
      } catch (err: any) {
        toast.error(err.message);
      }
    },
    [invokeFunction, loadConfig]
  );

  const checkStatus = useCallback(async () => {
    try {
      const data = await invokeFunction("status");
      setConfig((prev) => ({ ...prev, status: data.status }));
      if (data.status === "connected" && data.instance?.owner) {
        setConnectedNumber(data.instance.owner);
      }
      return data;
    } catch {
      return null;
    }
  }, [invokeFunction]);

  const connect = useCallback(async () => {
    try {
      setQrData(null);
      const data = await invokeFunction("connect");

      if (data?.status) {
        setConfig((prev) => ({ ...prev, status: data.status }));
      }

      if (data?.reachable === false) {
        toast.error(data.error || "A Evolution API está indisponível no momento.");
        return data;
      }

      if (type === "official") {
        if (data.connected || data.instance?.state === "open") {
          setConfig((prev) => ({ ...prev, status: "connected" }));
          toast.success("WhatsApp Oficial conectado!");
        }
        await checkStatus();
      } else {
        if (data.base64) {
          setQrData(data.base64);
          setConfig((prev) => ({ ...prev, status: "connecting" }));
        } else if (data.instance?.state === "open") {
          setConfig((prev) => ({ ...prev, status: "connected" }));
        }
      }
      return data;
    } catch (err: any) {
      toast.error(`Erro ao conectar: ${err.message}`);
      return null;
    }
  }, [invokeFunction, type, checkStatus]);

  const disconnect = useCallback(async () => {
    try {
      await invokeFunction("disconnect");
      setConfig((prev) => ({ ...prev, status: "disconnected" }));
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
