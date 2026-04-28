import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { isValidUuid } from "@/lib/tenant-utils";

export type TemplateCategory = "template" | "quick_reply";

export interface CannedResponse {
  id: string;
  client_id: string;
  tenant_id: string | null;
  short_code: string | null;
  title: string;
  content: string;
  category: TemplateCategory;
  created_at: string;
  updated_at?: string;
}

export function useCannedResponses() {
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const { tenant } = useTenant();
  const clientId = user?.client_id ?? tenant?.id;

  const fetchResponses = useCallback(async () => {
    if (!clientId || !isValidUuid(clientId)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("inbox_templates")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching templates:", error);
      setLoading(false);
      return;
    }

    setResponses((data ?? []) as CannedResponse[]);
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    fetchResponses();
  }, [fetchResponses]);

  const create = useCallback(
    async (params: {
      title: string;
      content: string;
      short_code?: string | null;
      category?: TemplateCategory;
    }) => {
      if (!clientId || !isValidUuid(clientId)) {
        toast.error("Sessão inválida.");
        return false;
      }

      const payload: Record<string, unknown> = {
        client_id: clientId,
        title: params.title,
        content: params.content,
        short_code: params.short_code?.trim() || null,
        category: params.category ?? "template",
      };
      if (isValidUuid(tenant?.id)) payload.tenant_id = tenant.id;

      const { data, error } = await supabase
        .from("inbox_templates")
        .insert(payload)
        .select()
        .single();

      if (error) {
        toast.error("Erro ao criar template: " + error.message);
        return false;
      }

      setResponses((prev) => [...prev, data as CannedResponse]);
      toast.success("Template salvo!");
      return true;
    },
    [clientId, tenant?.id]
  );

  const update = useCallback(
    async (id: string, data: Partial<CannedResponse>) => {
      const dbUpdates: Record<string, unknown> = {};
      if (data.title !== undefined) dbUpdates.title = data.title;
      if (data.content !== undefined) dbUpdates.content = data.content;
      if (data.short_code !== undefined) dbUpdates.short_code = data.short_code?.trim() || null;
      if (data.category !== undefined) dbUpdates.category = data.category;

      const { error } = await supabase
        .from("inbox_templates")
        .update(dbUpdates)
        .eq("id", id);

      if (error) {
        toast.error("Erro ao atualizar: " + error.message);
        return false;
      }

      setResponses((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)));
      toast.success("Template atualizado!");
      return true;
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from("inbox_templates").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao remover: " + error.message);
      return false;
    }

    setResponses((prev) => prev.filter((r) => r.id !== id));
    toast.success("Template removido");
    return true;
  }, []);

  // Busca por short_code apenas (usado pelo picker `/`)
  const search = useCallback(
    (query: string) => {
      const filtered = responses.filter((r) => r.short_code);
      if (!query) return filtered;
      const q = query.toLowerCase();
      return filtered.filter(
        (r) =>
          (r.short_code ?? "").toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q)
      );
    },
    [responses]
  );

  const resolveVariables = useCallback(
    (template: string, vars: Record<string, string>) => {
      return template.replace(/\{\{(\w+)\.(\w+)\}\}/g, (match, group, key) => {
        const fullKey = `${group}.${key}`;
        return vars[fullKey] || match;
      });
    },
    []
  );

  return {
    responses,
    loading,
    create,
    update,
    remove,
    search,
    resolveVariables,
    refresh: fetchResponses,
  };
}
