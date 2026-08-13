import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import * as fieldSettingsRepo from "@/services/fieldSettings";
import type { StandardFieldConfig } from "@/types";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { resolveClientId } from "@/lib/tenant-utils";

export function useFieldSettings() {
  const [fieldConfig, setFieldConfig] = useState<StandardFieldConfig[]>(fieldSettingsRepo.DEFAULT_FIELD_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  const { tenant } = useTenant();
  const { user } = useAuth();
  const clientId = resolveClientId(tenant?.id, user?.client_id);

  const fetchConfig = useCallback(async () => {
    if (!clientId) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const data = await fieldSettingsRepo.getFieldSettings(clientId, tenant?.id);
      setFieldConfig([...data].sort((a, b) => a.order - b.order));
    } catch (error) {
      console.error("Error fetching field settings:", error);
    }
    setIsLoading(false);
  }, [clientId, tenant?.id]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const saveConfig = useCallback(async (config: StandardFieldConfig[]) => {
    if (!clientId) { toast.error("Sem contexto de cliente."); return; }
    try {
      await fieldSettingsRepo.saveFieldSettings(clientId, config, tenant?.id);
      setFieldConfig([...config].sort((a, b) => a.order - b.order));
      toast.success("Configuração salva!");
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error("Erro ao salvar configuração: " + message);
    }
  }, [clientId, tenant?.id]);

  const enabledFields = fieldConfig.filter((f) => f.enabled).sort((a, b) => a.order - b.order);

  return { fieldConfig, enabledFields, isLoading, saveConfig };
}
