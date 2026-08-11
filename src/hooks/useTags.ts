import { useState, useEffect, useCallback } from "react";
import * as leadsRepo from "@/services/leads";
import { toast } from "sonner";
import type { TagMeta } from "@/types";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { resolveClientId, isValidUuid } from "@/lib/tenant-utils";

export function useTags() {
  const [tags, setTags] = useState<TagMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const { tenant } = useTenant();
  const { user } = useAuth();
  // tags.tenant_id é UUID — sentinela "master" ou client_id legado não-UUID
  // quebrariam a query (400 de cast), por isso o guard isValidUuid abaixo.
  const clientId = resolveClientId(tenant?.id, user?.client_id);

  const fetchTags = useCallback(async () => {
    if (!isValidUuid(clientId)) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await leadsRepo.listTags(clientId);
      setTags(data);
    } catch (error) {
      console.error("Error fetching tags:", error);
      toast.error("Erro ao carregar etiquetas. Tente novamente.");
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const createTag = useCallback(
    async (params: { name: string; color?: string; category?: string }) => {
      if (!isValidUuid(clientId)) { toast.error("Sem contexto de cliente."); return null; }
      try {
        const data = await leadsRepo.createTag(clientId, params);
        toast.success(`Tag "${params.name}" criada!`);
        setTags((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        return data;
      } catch (err) {
        const code = (err as { code?: string })?.code;
        const message = (err as { message?: string })?.message;
        if (code === "23505") {
          toast.error("Esta tag já existe.");
        } else {
          toast.error("Erro ao criar tag: " + message);
        }
        return null;
      }
    },
    [clientId]
  );

  const updateTag = useCallback(
    async (id: string, updates: Partial<Pick<TagMeta, "name" | "color" | "category">>) => {
      try {
        await leadsRepo.updateTag(id, updates);
        setTags((prev) =>
          prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
        );
        return true;
      } catch (err) {
        const message = (err as { message?: string })?.message;
        toast.error("Erro ao atualizar tag: " + message);
        return false;
      }
    },
    []
  );

  const deleteTag = useCallback(async (id: string) => {
    try {
      await leadsRepo.deleteTag(id);
      setTags((prev) => prev.filter((t) => t.id !== id));
      toast.success("Tag removida.");
      return true;
    } catch (err) {
      const message = (err as { message?: string })?.message;
      toast.error("Erro ao excluir tag: " + message);
      return false;
    }
  }, []);

  return {
    tags,
    loading,
    fetchTags,
    createTag,
    updateTag,
    deleteTag,
  };
}
