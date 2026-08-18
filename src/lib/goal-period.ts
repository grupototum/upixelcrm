import {
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfQuarter, endOfQuarter, subDays, subWeeks, subMonths, subQuarters,
  differenceInDays,
} from "date-fns";
import type { GoalPeriod, GoalProgress, GoalTrend } from "@/types";

/**
 * Início/fim do período pedido. `offset` negativo desloca N períodos pro
 * passado (offset=-1 = período anterior) — usado no histórico de detalhe da
 * meta. offset=0 (default) é o período atual.
 */
export function getPeriodRange(period: GoalPeriod, offset = 0): { start: Date; end: Date } {
  const now = new Date();
  if (period === "daily") {
    const d = subDays(now, -offset);
    return { start: startOfDay(d), end: endOfDay(d) };
  }
  if (period === "weekly") {
    const d = subWeeks(now, -offset);
    return { start: startOfWeek(d, { weekStartsOn: 1 }), end: endOfWeek(d, { weekStartsOn: 1 }) };
  }
  if (period === "quarterly") {
    const d = subQuarters(now, -offset);
    return { start: startOfQuarter(d), end: endOfQuarter(d) };
  }
  const d = subMonths(now, -offset);
  return { start: startOfMonth(d), end: endOfMonth(d) };
}

export const PERIOD_LABELS: Record<GoalPeriod, string> = {
  daily: "Diário",
  weekly: "Semanal",
  monthly: "Mensal",
  quarterly: "Trimestral",
};

export const METRIC_LABELS: Record<string, string> = {
  leads_created: "Leads criados",
  tasks_completed: "Tarefas concluídas",
  contacts_made: "Contatos realizados",
  leads_closed: "Fechamentos",
  calls_made: "Ligações realizadas",
  call_attempts: "Tentativas de ligação",
  meetings_done: "Reuniões realizadas",
};

/** Cor/trend por faixa de progresso (PRD §3.4). */
export function trendFor(percentage: number): GoalTrend {
  if (percentage >= 100) return "achieved";
  if (percentage >= 80) return "on_track";
  if (percentage >= 50) return "at_risk";
  return "behind";
}

/**
 * Mensagem de ritmo: quanto falta e em quanto tempo, extrapolando o ritmo
 * necessário pros dias restantes (PRD §3.5).
 */
export function calculatePace(
  progress: Pick<GoalProgress, "current_value" | "period_start" | "period_end">,
  targetValue: number
): string {
  const { period_end, current_value, period_start } = progress;
  const remaining = targetValue - current_value;
  if (remaining <= 0) return "Meta atingida! 🎉";

  const daysLeft = differenceInDays(new Date(period_end), new Date());
  if (daysLeft <= 0) return `Faltam ${Math.ceil(remaining)} pra bater a meta`;

  const totalDays = differenceInDays(new Date(period_end), new Date(period_start));
  const daysElapsed = Math.max(totalDays - daysLeft, 1);

  const neededPerDay = remaining / Math.max(daysLeft, 1);
  const currentRate = current_value / daysElapsed;

  if (neededPerDay <= currentRate) return "No ritmo — continue assim!";

  if (daysLeft >= 7) {
    const neededPerWeek = Math.ceil(neededPerDay * 7);
    return `Precisa de +${neededPerWeek} por semana para bater a meta`;
  }
  return `Precisa de +${Math.ceil(remaining)} nos próximos ${daysLeft} dias`;
}
