import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { CustomFieldDefinition, CustomFieldType } from "@/types";

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

  const fetchDefinitions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("custom_field_definitions")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Error fetching custom field definitions:", error);
    } else {
      setDefinitions((data as unknown as CustomFieldDefinition[]) || []);
    }
    setLoading(false);
  }, []);

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
      const slug = slugify(params.name);
      const { data, error } = await supabase
        .from("custom_field_definitions")
        .insert({
          name: params.name,
          slug,
          field_type: params.field_type,
          options: params.options || [],
          is_required: params.is_required ?? false,
          visible_pipelines: params.visible_pipelines || [],
          display_order: definitions.length,
        })
        .select()
        .single();

      if (error) {
        toast.error("Erro ao criar campo: " + error.message);
        return null;
      }
      toast.success(`Campo "${params.name}" criado!`);
      setDefinitions((prev) => [...prev, data as unknown as CustomFieldDefinition]);
      return data;
    },
    [definitions.length]
  );

  const updateField = useCallback(
    async (id: string, updates: Partial<CustomFieldDefinition>) => {
      const { error } = await supabase
        .from("custom_field_definitions")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) {
        toast.error("Erro ao atualizar campo: " + error.message);
        return false;
      }
      setDefinitions((prev) =>
        prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
      );
      return true;
    },
    []
  );

  const deleteField = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("custom_field_definitions")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir campo: " + error.message);
      return false;
    }
    setDefinitions((prev) => prev.filter((d) => d.id !== id));
    toast.success("Campo removido.");
    return true;
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
