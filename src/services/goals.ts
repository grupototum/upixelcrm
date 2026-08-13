import { supabase } from "@/integrations/supabase/client";
import { tenantIdField } from "@/lib/tenant-utils";
import type { Goal, GoalMetric, GoalPeriod } from "@/types";

export async function getGoals(clientId: string): Promise<Goal[]> {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Goal[];
}

export async function createGoal(params: {
  clientId: string;
  tenantId?: string | null;
  title: string;
  metric: GoalMetric;
  target_value: number;
  period: GoalPeriod;
  assigned_to?: string;
  column_id?: string;
}): Promise<Goal> {
  const { data, error } = await supabase
    .from("goals")
    .insert({
      client_id: params.clientId,
      title: params.title,
      metric: params.metric,
      target_value: params.target_value,
      period: params.period,
      assigned_to: params.assigned_to || null,
      column_id: params.column_id || null,
      ...tenantIdField(params.tenantId),
    })
    .select()
    .single();
  if (error) throw error;
  return data as Goal;
}

export async function updateGoal(id: string, updates: Partial<Pick<Goal, "title" | "metric" | "target_value" | "period" | "assigned_to" | "column_id" | "is_active">>): Promise<void> {
  const { error } = await supabase.from("goals").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase.from("goals").update({ is_active: false }).eq("id", id);
  if (error) throw error;
}

/** Contatos realizados no período: timeline_events type='note'. Query dedicada
 *  (não vem do estado global, que só mantém as últimas 100 entradas). */
export async function countContactsMade(clientId: string, start: Date, end: Date): Promise<number> {
  const { count, error } = await supabase
    .from("timeline_events")
    .select("*", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("type", "note")
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString());
  if (error) throw error;
  return count ?? 0;
}
