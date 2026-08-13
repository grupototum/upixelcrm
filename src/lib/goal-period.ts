import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import type { GoalPeriod } from "@/types";

export function getPeriodRange(period: GoalPeriod): { start: Date; end: Date } {
  const now = new Date();
  if (period === "daily") return { start: startOfDay(now), end: endOfDay(now) };
  if (period === "weekly") return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
  return { start: startOfMonth(now), end: endOfMonth(now) };
}

export const PERIOD_LABELS: Record<GoalPeriod, string> = {
  daily: "Diário",
  weekly: "Semanal",
  monthly: "Mensal",
};

export const METRIC_LABELS: Record<string, string> = {
  leads_created: "Leads criados",
  tasks_completed: "Tarefas concluídas",
  contacts_made: "Contatos realizados",
  leads_closed: "Fechamentos",
};
