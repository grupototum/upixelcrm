import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { isValidUuid } from "@/lib/tenant-utils";

export type RunStatus = "running" | "waiting" | "completed" | "failed" | "paused";

export interface AutomationRun {
  id: string;
  client_id: string;
  tenant_id: string | null;
  automation_id: string;
  lead_id: string;
  current_node_id: string | null;
  status: RunStatus;
  context: Record<string, unknown>;
  trigger_event: string | null;
  started_at: string;
  finished_at: string | null;
  error: string | null;
  steps_executed: number;
  updated_at: string;
}

export interface AutomationStats {
  automation_id: string;
  running_count: number;
  waiting_count: number;
  completed_count: number;
  failed_count: number;
  paused_count: number;
  total_runs: number;
  last_run_at: string | null;
}

/**
 * Lista runs de uma automação específica.
 */
export function useAutomationRuns(automationId: string | null) {
  const [runs, setRuns] = useState<(AutomationRun & { lead_name?: string; lead_phone?: string })[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRuns = useCallback(async () => {
    if (!automationId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("automation_runs")
      .select("*, leads:lead_id(name, phone)")
      .eq("automation_id", automationId)
      .order("started_at", { ascending: false })
      .limit(200);
    if (error) {
      console.error("Failed to load runs:", error);
      setLoading(false);
      return;
    }
    const enriched = (data ?? []).map((r: any) => ({
      ...r,
      lead_name: r.leads?.name,
      lead_phone: r.leads?.phone,
    }));
    setRuns(enriched);
    setLoading(false);
  }, [automationId]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const cancelRun = useCallback(async (runId: string) => {
    const { error } = await supabase
      .from("automation_runs")
      .update({ status: "paused", finished_at: new Date().toISOString() })
      .eq("id", runId);
    if (error) {
      toast.error("Erro ao cancelar run: " + error.message);
      return false;
    }
    setRuns((prev) =>
      prev.map((r) => (r.id === runId ? { ...r, status: "paused", finished_at: new Date().toISOString() } : r))
    );
    toast.success("Run pausado.");
    return true;
  }, []);

  return { runs, loading, refresh: fetchRuns, cancelRun };
}

/**
 * Estatísticas agregadas de todas as automações do cliente.
 */
export function useAutomationStats() {
  const [stats, setStats] = useState<Record<string, AutomationStats>>({});
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const { tenant } = useTenant();
  const clientId = user?.client_id ?? tenant?.id;

  const fetchStats = useCallback(async () => {
    if (!clientId || !isValidUuid(clientId)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("automation_runs_summary")
      .select("*")
      .eq("client_id", clientId);

    if (error) {
      console.error("Failed to load stats:", error);
      setLoading(false);
      return;
    }

    const map: Record<string, AutomationStats> = {};
    for (const row of data ?? []) {
      map[(row as any).automation_id] = row as AutomationStats;
    }
    setStats(map);
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refresh: fetchStats };
}
