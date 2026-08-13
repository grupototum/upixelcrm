import { supabase } from "@/integrations/supabase/client";
import { tenantIdField } from "@/lib/tenant-utils";
import type { Goal, GoalAssignment, GoalMetric, GoalPeriod } from "@/types";

/** Linha crua de goal_assignments vinda do join — sem dados de usuário (resolvidos no client via listActiveAgents). */
type RawAssignment = { id: string; goal_id: string; user_id: string | null };

function mapGoal(row: Record<string, unknown>): Goal {
  const rawAssignments = (row.goal_assignments as RawAssignment[] | null) ?? [];
  return {
    id: row.id as string,
    client_id: row.client_id as string,
    title: row.title as string,
    metric: row.metric as GoalMetric,
    target_value: row.target_value as number,
    period: row.period as GoalPeriod,
    column_id: (row.column_id as string) || undefined,
    is_active: row.is_active as boolean,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    assignments: rawAssignments.map((a): GoalAssignment => ({
      id: a.id,
      goal_id: a.goal_id,
      user_id: a.user_id || undefined,
    })),
  };
}

export async function getGoals(clientId: string): Promise<Goal[]> {
  const { data, error } = await supabase
    .from("goals")
    .select("*, goal_assignments(*)")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapGoal(row as unknown as Record<string, unknown>));
}

/** userIds vazio ou ausente = meta da equipe toda (1 assignment com user_id NULL). */
async function syncAssignments(goalId: string, clientId: string, tenantId: string | null | undefined, userIds: string[]): Promise<void> {
  const { error: delError } = await supabase.from("goal_assignments").delete().eq("goal_id", goalId);
  if (delError) throw delError;

  const rows = (userIds.length > 0 ? userIds : [null]).map((userId) => ({
    goal_id: goalId,
    user_id: userId,
    client_id: clientId,
    ...tenantIdField(tenantId),
  }));
  const { error: insError } = await supabase.from("goal_assignments").insert(rows);
  if (insError) throw insError;
}

export async function createGoal(params: {
  clientId: string;
  tenantId?: string | null;
  title: string;
  metric: GoalMetric;
  target_value: number;
  period: GoalPeriod;
  column_id?: string;
  /** Vazio = equipe toda. */
  userIds: string[];
}): Promise<Goal> {
  const { data, error } = await supabase
    .from("goals")
    .insert({
      client_id: params.clientId,
      title: params.title,
      metric: params.metric,
      target_value: params.target_value,
      period: params.period,
      column_id: params.column_id || null,
      ...tenantIdField(params.tenantId),
    })
    .select()
    .single();
  if (error) throw error;

  await syncAssignments(data.id, params.clientId, params.tenantId, params.userIds);
  return mapGoal({ ...data, goal_assignments: params.userIds.length > 0 ? params.userIds.map((id) => ({ user_id: id })) : [{ user_id: null }] });
}

export async function updateGoal(
  id: string,
  updates: Partial<Pick<Goal, "title" | "metric" | "target_value" | "period" | "column_id" | "is_active">>,
  assignments?: { clientId: string; tenantId?: string | null; userIds: string[] }
): Promise<void> {
  const { error } = await supabase.from("goals").update(updates).eq("id", id);
  if (error) throw error;
  if (assignments) await syncAssignments(id, assignments.clientId, assignments.tenantId, assignments.userIds);
}

export async function toggleGoalActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from("goals").update({ is_active: isActive }).eq("id", id);
  if (error) throw error;
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase.from("goals").update({ is_active: false }).eq("id", id);
  if (error) throw error;
}

export interface GoalProgressRow {
  goal_id: string;
  user_id: string | null;
  current_value: number;
}

export async function getGoalsProgress(start: Date, end: Date): Promise<GoalProgressRow[]> {
  const { data, error } = await supabase.rpc("goals_progress", {
    p_start: start.toISOString(),
    p_end: end.toISOString(),
  });
  if (error) throw error;
  return (data ?? []) as GoalProgressRow[];
}

/**
 * Timestamps brutos da métrica no range, pra bucket client-side (sparkline,
 * histórico semanal). Mesma lógica por métrica da RPC goals_progress, mas
 * devolvendo as datas em vez de já contar.
 */
export async function listMetricTimestamps(
  metric: GoalMetric,
  start: Date,
  end: Date,
  opts: { userId?: string; columnId?: string } = {}
): Promise<string[]> {
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  if (metric === "leads_created") {
    let q = supabase.from("leads").select("created_at").gte("created_at", startIso).lt("created_at", endIso);
    if (opts.userId) q = q.eq("responsible_id", opts.userId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((r) => r.created_at as string);
  }
  if (metric === "tasks_completed") {
    let q = supabase.from("tasks").select("completed_at").eq("status", "completed")
      .gte("completed_at", startIso).lt("completed_at", endIso);
    if (opts.userId) q = q.eq("assigned_to_id", opts.userId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((r) => r.completed_at as string).filter(Boolean);
  }
  if (metric === "leads_closed") {
    if (!opts.columnId) return [];
    let q = supabase.from("leads").select("updated_at").eq("column_id", opts.columnId)
      .gte("updated_at", startIso).lt("updated_at", endIso);
    if (opts.userId) q = q.eq("responsible_id", opts.userId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((r) => r.updated_at as string);
  }

  const typeByMetric: Partial<Record<GoalMetric, string>> = {
    contacts_made: "note",
    calls_made: "call",
    meetings_done: "meeting",
  };
  const type = typeByMetric[metric];
  if (!type) return [];
  let q = supabase.from("timeline_events").select("created_at").eq("type", type)
    .gte("created_at", startIso).lt("created_at", endIso);
  if (opts.userId) q = q.eq("user_id", opts.userId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => r.created_at as string);
}
