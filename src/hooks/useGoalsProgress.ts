import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import * as goalsRepo from "@/services/goals";
import { getPeriodRange } from "@/lib/goal-period";
import { useAppState } from "@/contexts/AppContext";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { resolveClientId } from "@/lib/tenant-utils";
import type { Goal, GoalMetric, GoalPeriod, GoalProgress } from "@/types";

/** Conta a métrica do goal usando o estado já carregado (leads/tasks completos
 *  em memória — evita 1 query por goal). `contacts_made` é exceção: o estado
 *  global só guarda as últimas 100 entradas de timeline, então usa query dedicada. */
async function countForMetric(
  metric: GoalMetric,
  period: GoalPeriod,
  clientId: string,
  assignedTo: string | undefined,
  columnId: string | undefined,
  leads: ReturnType<typeof useAppState>["leads"],
  tasks: ReturnType<typeof useAppState>["tasks"]
): Promise<number> {
  const { start, end } = getPeriodRange(period);
  const inRange = (iso: string) => { const d = new Date(iso); return d >= start && d <= end; };

  if (metric === "leads_created") {
    return leads.filter((l) => inRange(l.created_at) && (!assignedTo || l.responsible_id === assignedTo)).length;
  }
  if (metric === "tasks_completed") {
    return tasks.filter((t) => t.completed_at && inRange(t.completed_at) && (!assignedTo || t.assigned_to === assignedTo)).length;
  }
  if (metric === "leads_closed") {
    return leads.filter((l) => columnId && l.column_id === columnId && inRange(l.updated_at) && (!assignedTo || l.responsible_id === assignedTo)).length;
  }
  // contacts_made
  return goalsRepo.countContactsMade(clientId, start, end);
}

export function useGoalsProgress() {
  const { leads, tasks } = useAppState();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [progress, setProgress] = useState<GoalProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { tenant } = useTenant();
  const { user } = useAuth();
  const clientId = resolveClientId(tenant?.id, user?.client_id);

  const fetchGoals = useCallback(async () => {
    if (!clientId) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const data = await goalsRepo.getGoals(clientId);
      setGoals(data);
    } catch (error) {
      console.error("Error fetching goals:", error);
    }
    setIsLoading(false);
  }, [clientId]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  useEffect(() => {
    if (goals.length === 0) { setProgress([]); return; }
    let cancelled = false;
    (async () => {
      const results = await Promise.all(goals.map(async (goal) => {
        const current = await countForMetric(goal.metric, goal.period, clientId, goal.assigned_to, goal.column_id, leads, tasks);
        return { goal, current_value: current, percentage: Math.round((current / goal.target_value) * 100) };
      }));
      if (!cancelled) setProgress(results);
    })();
    return () => { cancelled = true; };
  }, [goals, leads, tasks, clientId]);

  const createGoal = useCallback(async (data: {
    title: string; metric: GoalMetric; target_value: number; period: GoalPeriod; assigned_to?: string; column_id?: string;
  }) => {
    if (!clientId) { toast.error("Sem contexto de cliente."); return; }
    try {
      const created = await goalsRepo.createGoal({ clientId, tenantId: tenant?.id, ...data });
      setGoals((prev) => [created, ...prev]);
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error("Erro ao criar meta: " + message);
    }
  }, [clientId, tenant?.id]);

  const updateGoal = useCallback(async (id: string, data: Partial<Pick<Goal, "title" | "metric" | "target_value" | "period" | "assigned_to" | "column_id">>) => {
    try {
      await goalsRepo.updateGoal(id, data);
      setGoals((prev) => prev.map((g) => g.id === id ? { ...g, ...data } : g));
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error("Erro ao editar meta: " + message);
    }
  }, []);

  const removeGoal = useCallback(async (id: string) => {
    try {
      await goalsRepo.deleteGoal(id);
      setGoals((prev) => prev.filter((g) => g.id !== id));
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error("Erro ao remover meta: " + message);
    }
  }, []);

  return { goals, progress, isLoading, createGoal, updateGoal, removeGoal };
}
