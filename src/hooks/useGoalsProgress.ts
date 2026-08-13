import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import * as goalsRepo from "@/services/goals";
import { listActiveAgents } from "@/services/users";
import { getPeriodRange, calculatePace, trendFor } from "@/lib/goal-period";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { resolveClientId } from "@/lib/tenant-utils";
import type { GoalPeriod, GoalProgress, LeaderboardEntry } from "@/types";

/**
 * Progresso das metas pro período pedido. Diferente da v1 (recalculava sobre
 * leads/tasks já carregados no AppContext a cada batch da carga em background,
 * e refazia um count de rede por goal a cada recálculo), aqui tudo vem de 2
 * queries cacheadas pelo react-query — trocar de período só refaz a segunda.
 */
export function useGoalsProgress(period: GoalPeriod) {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const clientId = resolveClientId(tenant?.id, user?.client_id);
  const range = useMemo(() => getPeriodRange(period), [period]);

  const { data: allGoals = [], isLoading: goalsLoading } = useQuery({
    queryKey: ["goals", clientId],
    queryFn: () => goalsRepo.getGoals(clientId as string),
    enabled: !!clientId,
  });

  // A RPC calcula progresso sobre UM range pra todas as metas ativas — sem
  // filtrar por período aqui, uma meta mensal apareceria com o progresso da
  // semana quando o seletor global estivesse em "Semana". O toggle de período
  // filtra QUAIS metas aparecem, não recalcula a mesma meta em ranges diferentes.
  const goals = useMemo(() => allGoals.filter((g) => g.period === period), [allGoals, period]);

  const { data: progressRows = [], isLoading: progressLoading } = useQuery({
    queryKey: ["goals-progress", clientId, range.start.toISOString(), range.end.toISOString()],
    queryFn: () => goalsRepo.getGoalsProgress(range.start, range.end),
    enabled: !!clientId && goals.length > 0,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["goals-agents", clientId],
    queryFn: () => listActiveAgents(clientId as string),
    enabled: !!clientId,
    staleTime: 60_000,
  });
  const agentsById = useMemo(() => Object.fromEntries(agents.map((a) => [a.id, a])), [agents]);

  function buildProgress(goalId: string, targetValue: number, current: number, userId?: string): GoalProgress {
    const goal = goals.find((g) => g.id === goalId)!;
    const percentage = targetValue > 0 ? Math.round((current / targetValue) * 100) : 0;
    return {
      goal,
      user_id: userId,
      current_value: current,
      percentage,
      trend: trendFor(percentage),
      pace_message: calculatePace(
        { current_value: current, period_start: range.start.toISOString(), period_end: range.end.toISOString() },
        targetValue
      ),
      period_start: range.start.toISOString(),
      period_end: range.end.toISOString(),
      sparkline: [],
    };
  }

  /** Metas relevantes pro usuário logado: atribuídas a ele, ou da equipe toda. */
  const myProgress = useMemo((): GoalProgress[] => {
    if (!user?.id) return [];
    return goals
      .map((goal) => {
        const assignedToMe = goal.assignments?.some((a) => a.user_id === user.id);
        const teamGoal = goal.assignments?.some((a) => !a.user_id);
        if (!assignedToMe && !teamGoal) return null;
        const row = progressRows.find((r) => r.goal_id === goal.id && r.user_id === (assignedToMe ? user.id : null));
        return buildProgress(goal.id, goal.target_value, row?.current_value ?? 0, assignedToMe ? user.id : undefined);
      })
      .filter((p): p is GoalProgress => p !== null);
  }, [goals, progressRows, user?.id, range]);

  /** Progresso por pessoa, uma linha por assignment individual (grid de equipe). */
  const teamProgress = useMemo((): GoalProgress[] => {
    const out: GoalProgress[] = [];
    for (const goal of goals) {
      for (const a of goal.assignments ?? []) {
        if (!a.user_id) continue;
        const row = progressRows.find((r) => r.goal_id === goal.id && r.user_id === a.user_id);
        out.push(buildProgress(goal.id, goal.target_value, row?.current_value ?? 0, a.user_id));
      }
    }
    return out;
  }, [goals, progressRows, range]);

  /** Ranking por % médio — só metas com atribuição individual (meta de equipe não entra). */
  const leaderboard = useMemo((): LeaderboardEntry[] => {
    const byUser = new Map<string, { sum: number; count: number }>();
    for (const p of teamProgress) {
      if (!p.user_id) continue;
      const entry = byUser.get(p.user_id) ?? { sum: 0, count: 0 };
      entry.sum += p.percentage;
      entry.count += 1;
      byUser.set(p.user_id, entry);
    }
    const rows = Array.from(byUser.entries())
      .map(([userId, { sum, count }]) => ({ userId, overall_percentage: Math.round(sum / count), goals_count: count }))
      .sort((a, b) => b.overall_percentage - a.overall_percentage);
    return rows.map((r, i) => ({
      user: agentsById[r.userId] ?? { id: r.userId, name: "?" },
      overall_percentage: r.overall_percentage,
      goals_count: r.goals_count,
      rank: i + 1,
      isCurrentUser: r.userId === user?.id,
    }));
  }, [teamProgress, agentsById, user?.id]);

  return {
    goals,
    range,
    myProgress,
    teamProgress,
    leaderboard,
    agentsById,
    isLoading: goalsLoading || progressLoading,
  };
}
