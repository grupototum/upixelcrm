import { useQuery } from "@tanstack/react-query";
import * as metricsRepo from "@/services/metrics";
import { useAuth } from "@/contexts/AuthContext";

export interface DashboardStats {
  total_leads: number;
  leads_30d: number;
  won: number;
  lost: number;
  in_progress: number;
  new_leads: number;
  tasks_pending: number;
  tasks_overdue: number;
}

export interface DashboardPipelineCol {
  column_id: string;
  name: string;
  color: string | null;
  order: number;
  count: number;
}

export interface DashboardLeadByMonth {
  key: string;
  name: string;
  count: number;
}

export interface DashboardLeadByOrigin {
  name: string;
  count: number;
}

export interface DashboardRecentActivity {
  type: string;
  content: string;
  created_at: string;
  user_name: string | null;
}

export interface DashboardPendingTask {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  lead_name: string | null;
  lead_company: string | null;
}

export interface DashboardKpis {
  stats: DashboardStats;
  pipeline: DashboardPipelineCol[];
  leads_by_month: DashboardLeadByMonth[];
  leads_by_origin: DashboardLeadByOrigin[];
  recent_activity: DashboardRecentActivity[];
  pending_tasks: DashboardPendingTask[];
}

const EMPTY_KPIS: DashboardKpis = {
  stats: {
    total_leads: 0, leads_30d: 0,
    won: 0, lost: 0, in_progress: 0, new_leads: 0,
    tasks_pending: 0, tasks_overdue: 0,
  },
  pipeline: [],
  leads_by_month: [],
  leads_by_origin: [],
  recent_activity: [],
  pending_tasks: [],
};

/**
 * Validação leve do shape retornado pela RPC. Não usamos zod aqui pra evitar
 * dependência extra — checagem narrow garante que o app não quebre em runtime
 * se a função SQL for alterada e a forma do retorno divergir.
 */
function isDashboardKpis(value: unknown): value is DashboardKpis {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.stats === "object" && v.stats !== null &&
    Array.isArray(v.pipeline) &&
    Array.isArray(v.leads_by_month) &&
    Array.isArray(v.leads_by_origin) &&
    Array.isArray(v.recent_activity) &&
    Array.isArray(v.pending_tasks)
  );
}

/**
 * Carrega todos os KPIs do Dashboard via RPC agregada no Postgres.
 * Substitui o antigo padrão de baixar TODOS os leads no client (~8MB)
 * por uma única chamada que volta ~5KB já com tudo computado.
 */
export function useDashboardKpis() {
  const { user } = useAuth();

  return useQuery<DashboardKpis>({
    queryKey: ["dashboard-kpis", user?.id],
    queryFn: async () => {
      const data = await metricsRepo.getDashboardKpis();
      if (!isDashboardKpis(data)) {
        throw new Error("Resposta inválida da RPC dashboard_kpis. Verifique a versão da função no banco.");
      }
      return data;
    },
    enabled: !!user?.id,
    staleTime: 60_000, // 1 min — Dashboard não precisa estar no tick a tick.
    placeholderData: EMPTY_KPIS,
  });
}
