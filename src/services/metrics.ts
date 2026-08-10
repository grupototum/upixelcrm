import { supabase } from "@/integrations/supabase/client";

/**
 * RPC criada via migration manual (20260511_dashboard_kpis_rpc.sql).
 * O tipo gerado pelo supabase-codegen ainda não inclui — regerar com
 * `supabase gen types typescript` quando possível.
 */
export async function getDashboardKpis(clientId?: string): Promise<unknown> {
  // Passa o client_id do tenant atual (subdomínio) para o dashboard escopar
  // pelos dados que o usuário está de fato visualizando. Sem o param, a função
  // cai no client_id do perfil logado (comportamento antigo).
  // @ts-expect-error — função existe no banco mas não no tipo gerado
  const { data, error } = await supabase.rpc("dashboard_kpis", clientId ? { p_client_id: clientId } : {});
  if (error) throw error;
  return data;
}

export async function getCsatStats(start: Date, end: Date): Promise<unknown> {
  const { data, error } = await supabase.rpc("csat_stats", {
    p_start: start.toISOString(),
    p_end: end.toISOString(),
  });
  if (error) throw error;
  return data;
}

type RpcCaller = (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;

export async function getSlaMetrics(
  startIso: string | null,
  endIso: string | null
): Promise<{ overall: unknown; agents: unknown }> {
  const rpc = supabase.rpc as unknown as RpcCaller;
  const [overall, agents] = await Promise.all([
    rpc("sla_metrics", { p_start: startIso, p_end: endIso }),
    rpc("sla_metrics_by_agent", { p_start: startIso, p_end: endIso }),
  ]);

  if (overall.error) throw overall.error;
  if (agents.error) throw agents.error;

  return { overall: overall.data, agents: agents.data };
}
