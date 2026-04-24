import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WaInstance {
  id: string;
  provider: "whatsapp" | "whatsapp_official";
  instance_name: string;
  status: string;
  api_url: string;
  has_api_key: boolean;
  phone_number_id: string;
  business_id: string;
  has_access_token: boolean;
  connected_number: string;
}

export function useWhatsAppInstances() {
  const [instances, setInstances] = useState<WaInstance[]>([]);
  const [loading, setLoading] = useState(true);

  const loadInstances = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "whatsapp-proxy?action=list-instances"
      );
      if (error) throw new Error(error.message);
      setInstances((data as WaInstance[]) || []);
    } catch (err: any) {
      console.error("Failed to load WA instances:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  const saveInstance = useCallback(
    async (params: {
      type: "normal" | "official";
      api_url: string;
      instance_name: string;
      api_key: string;
      phone_number_id?: string;
      business_id?: string;
      access_token?: string;
    }) => {
      const typeParam = params.type === "official" ? "official" : "normal";
      const { error } = await supabase.functions.invoke(
        `whatsapp-proxy?action=save-config&type=${typeParam}`,
        {
          body: {
            api_url: params.api_url,
            instance_name: params.instance_name,
            api_key: params.api_key,
            phone_number_id: params.phone_number_id,
            business_id: params.business_id,
            access_token: params.access_token,
          },
        }
      );
      if (error) throw new Error(error.message);
      await loadInstances();
    },
    [loadInstances]
  );

  const deleteInstance = useCallback(
    async (instance: WaInstance) => {
      const typeParam = instance.provider === "whatsapp_official" ? "official" : "normal";
      const { error } = await supabase.functions.invoke(
        `whatsapp-proxy?action=delete-instance&type=${typeParam}&instance_name=${encodeURIComponent(instance.instance_name)}`
      );
      if (error) {
        toast.error("Erro ao remover instância: " + error.message);
        return;
      }
      toast.success("Instância removida.");
      await loadInstances();
    },
    [loadInstances]
  );

  return {
    instances,
    loading,
    refresh: loadInstances,
    saveInstance,
    deleteInstance,
  };
}
