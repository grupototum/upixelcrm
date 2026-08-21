import { useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import type { TagMeta } from "@/types";
import * as leadsRepo from "@/services/leads";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { resolveClientId, isValidUuid } from "@/lib/tenant-utils";

/** PostgREST devolve o code do Postgres; 23505 = violação de unique. */
function errCode(e: unknown): string | undefined {
  return typeof e === "object" && e !== null && "code" in e
    ? String((e as { code: unknown }).code)
    : undefined;
}

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export function useTags() {
  const [tags, setTags] = useState<TagMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const { tenant } = useTenant();
  const { user } = useAuth();
  // A tabela `tags` é escopada por tenant_id (UUID) — a coluna client_id não
  // existe mais no banco (ver services/leads.ts). A sentinela "master" do
  // TenantContext e client_ids legados não-UUID quebrariam o cast, daí o guard.
  const tenantId = resolveClientId(tenant?.id, user?.client_id);

  const fetchTags = useCallback(async () => {
    if (!isValidUuid(tenantId)) { setTags([]); setLoading(false); return; }
    setLoading(true);
    try {
      setTags(await leadsRepo.listTags(tenantId));
    } catch (e) {
      logger.error("Error fetching tags:", e);
      toast.error("Erro ao carregar etiquetas: " + errMessage(e));
    }
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const createTag = useCallback(
    async (params: { name: string; color?: string; category?: string }) => {
      if (!isValidUuid(tenantId)) { toast.error("Sem contexto de tenant."); return null; }
      try {
        const data = await leadsRepo.createTag(tenantId, params);
        toast.success(`Tag "${params.name}" criada!`);
        setTags((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        return data;
      } catch (e) {
        toast.error(
          errCode(e) === "23505"
            ? "Esta tag já existe."
            : "Erro ao criar tag: " + errMessage(e)
        );
        return null;
      }
    },
    [tenantId]
  );

  const updateTag = useCallback(
    async (id: string, updates: Partial<Pick<TagMeta, "name" | "color" | "category">>) => {
      try {
        await leadsRepo.updateTag(id, updates);
      } catch (e) {
        toast.error("Erro ao atualizar tag: " + errMessage(e));
        return false;
      }
      setTags((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
      toast.success("Tag atualizada.");
      return true;
    },
    []
  );

  const deleteTag = useCallback(async (id: string) => {
    try {
      await leadsRepo.deleteTag(id);
    } catch (e) {
      toast.error("Erro ao excluir tag: " + errMessage(e));
      return false;
    }
    setTags((prev) => prev.filter((t) => t.id !== id));
    toast.success("Tag removida.");
    return true;
  }, []);

  return { tags, loading, fetchTags, createTag, updateTag, deleteTag };
}
