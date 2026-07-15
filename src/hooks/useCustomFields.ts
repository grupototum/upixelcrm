import { useState, useEffect, useCallback } from "react";
import * as leadsRepo from "@/services/leads";
import { toast } from "sonner";
import type { CustomFieldDefinition, CustomFieldType } from "@/types";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { resolveClientId } from "@/lib/tenant-utils";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function useCustomFields() {
  const [definitions, setDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  const { tenant } = useTenant();
  const { user } = useAuth();
  const clientId = resolveClientId(tenant?.id, user?.client_id);

  const fetchDefinitions = useCallback(async () => {
    if (!clientId) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await leadsRepo.listCustomFieldDefinitions(clientId);
      setDefinitions(data);
    } catch (error) {
      console.error("Error fetching custom field definitions:", error);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    fetchDefinitions();
  }, [fetchDefinitions]);

  const createField = useCallback(
    async (params: {
      name: string;
      field_type: CustomFieldType;
      options?: Array<{ label: string; value: string }>;
      is_required?: boolean;
      visible_pipelines?: string[];
    }) => {
      if (!clientId) { toast.error("Sem contexto de cliente."); return null; }
      const slug = slugify(params.name);
      try {
        const data = await leadsRepo.createCustomFieldDefinition({
          client_id: clientId,
          name: params.name,
          slug,
          field_type: params.field_type,
          options: params.options || [],
          is_required: params.is_required ?? false,
          visible_pipelines: params.visible_pipelines || [],
          display_order: definitions.length,
        });
        toast.success(`Campo "${params.name}" criado!`);
        setDefinitions((prev) => [...prev, data]);
        return data;
      } catch (err) {
        const message = (err as { message?: string })?.message;
        toast.error("Erro ao criar campo: " + message);
        return null;
      }
    },
    [clientId, definitions.length]
  );

  const updateField = useCallback(
    async (id: string, updates: Partial<CustomFieldDefinition>) => {
      try {
        await leadsRepo.updateCustomFieldDefinition(id, updates);
        setDefinitions((prev) =>
          prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
        );
        return true;
      } catch (err) {
        const message = (err as { message?: string })?.message;
        toast.error("Erro ao atualizar campo: " + message);
        return false;
      }
    },
    []
  );

  const deleteField = useCallback(async (id: string) => {
    try {
      await leadsRepo.deleteCustomFieldDefinition(id);
      setDefinitions((prev) => prev.filter((d) => d.id !== id));
      toast.success("Campo removido.");
      return true;
    } catch (err) {
      const message = (err as { message?: string })?.message;
      toast.error("Erro ao excluir campo: " + message);
      return false;
    }
  }, []);

  return {
    definitions,
    loading,
    fetchDefinitions,
    createField,
    updateField,
    deleteField,
  };
}
