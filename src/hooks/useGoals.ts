import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as goalsRepo from "@/services/goals";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { resolveClientId } from "@/lib/tenant-utils";
import type { Goal, GoalMetric, GoalPeriod } from "@/types";

/** CRUD de metas pra tela de configuração. Mesma queryKey ["goals", clientId]
 *  de useGoalsProgress — os dois hooks compartilham o cache do react-query. */
export function useGoals() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const clientId = resolveClientId(tenant?.id, user?.client_id);
  const queryClient = useQueryClient();

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["goals", clientId],
    queryFn: () => goalsRepo.getGoals(clientId as string),
    enabled: !!clientId,
  });

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["goals", clientId] }),
    [queryClient, clientId]
  );

  const createGoal = useCallback(async (data: {
    title: string; metric: GoalMetric; target_value: number; period: GoalPeriod; column_id?: string; userIds: string[];
  }) => {
    if (!clientId) { toast.error("Sem contexto de cliente."); return; }
    try {
      await goalsRepo.createGoal({ clientId, tenantId: tenant?.id, ...data });
      await invalidate();
      toast.success("Meta criada!");
    } catch (error) {
      toast.error("Erro ao criar meta: " + (error as { message?: string })?.message);
    }
  }, [clientId, tenant?.id, invalidate]);

  const updateGoal = useCallback(async (
    id: string,
    data: Partial<Pick<Goal, "title" | "metric" | "target_value" | "period" | "column_id">>,
    userIds?: string[]
  ) => {
    if (userIds && !clientId) { toast.error("Sem contexto de cliente."); return; }
    try {
      await goalsRepo.updateGoal(id, data, userIds ? { clientId: clientId as string, tenantId: tenant?.id, userIds } : undefined);
      await invalidate();
      toast.success("Meta atualizada!");
    } catch (error) {
      toast.error("Erro ao editar meta: " + (error as { message?: string })?.message);
    }
  }, [clientId, tenant?.id, invalidate]);

  const toggleGoalActive = useCallback(async (id: string, isActive: boolean) => {
    try {
      await goalsRepo.toggleGoalActive(id, isActive);
      await invalidate();
    } catch (error) {
      toast.error("Erro ao alterar meta: " + (error as { message?: string })?.message);
    }
  }, [invalidate]);

  const removeGoal = useCallback(async (id: string) => {
    try {
      await goalsRepo.deleteGoal(id);
      await invalidate();
      toast.success("Meta removida.");
    } catch (error) {
      toast.error("Erro ao remover meta: " + (error as { message?: string })?.message);
    }
  }, [invalidate]);

  return { goals, isLoading, createGoal, updateGoal, toggleGoalActive, removeGoal };
}
