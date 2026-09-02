import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { resolveClientId } from "@/lib/tenant-utils";

export interface WaInstance {
  id: string;
  provider: "whatsapp" | "whatsapp_official";
  instance_name: string;
  friendly_name: string;
  managed: boolean;
  status: string;
  api_url: string;
  has_api_key: boolean;
  phone_number_id: string;
  business_id: string;
  has_access_token: boolean;
  connected_number: string;
  health_status?: string | null;
  consecutive_failures?: number | null;
}

export function useWhatsAppInstances() {
  const [instances, setInstances] = useState<WaInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { tenant } = useTenant();
  // Tenant do subdomínio atual. Sem isso o proxy usa profile.tenant_id — para o
  // master isso é o tenant "Master", e o número conectado cai no tenant errado.
  const tenantId = resolveClientId(tenant?.id, user?.client_id);

  const loadInstances = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "whatsapp-proxy?action=list-instances",
        { body: { tenant_id: tenantId } }
      );
      if (error) {
        logger.error("Proxy error:", error);
        throw new Error(error.message);
      }
      setInstances(Array.isArray(data) ? data : []);
    } catch (err: any) {
      logger.error("Failed to load WA instances:", err.message || err);
      setInstances([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

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
            tenant_id: tenantId,
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
    [loadInstances, tenantId]
  );

  const deleteInstance = useCallback(
    async (instance: WaInstance) => {
      const typeParam = instance.provider === "whatsapp_official" ? "official" : "normal";
      const { error } = await supabase.functions.invoke(
        `whatsapp-proxy?action=delete-instance&type=${typeParam}&instance_name=${encodeURIComponent(instance.instance_name)}`,
        { body: { tenant_id: tenantId } }
      );
      if (error) {
        toast.error("Erro ao remover instância: " + error.message);
        return;
      }
      toast.success("Instância removida.");
      await loadInstances();
    },
    [loadInstances, tenantId]
  );

  return {
    instances,
    loading,
    refresh: loadInstances,
    saveInstance,
    deleteInstance,
  };
}
