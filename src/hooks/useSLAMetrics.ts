import { useCallback, useEffect, useState } from "react";
import * as metricsRepo from "@/services/metrics";
import { logger } from "@/lib/logger";

export interface SLAMetrics {
  total_conversations: number;
  resolved_conversations: number;
  open_conversations: number;
  pending_conversations: number;
  snoozed_conversations: number;
  avg_first_reply_seconds: number | null;
  median_first_reply_seconds: number | null;
  avg_resolution_seconds: number | null;
  median_resolution_seconds: number | null;
  conversations_with_reply: number;
}

export interface SLAByAgent {
  agent_id: string;
  total_conversations: number;
  resolved_conversations: number;
  avg_first_reply_seconds: number | null;
  avg_resolution_seconds: number | null;
}

export function useSLAMetrics(start?: Date, end?: Date) {
  const [metrics, setMetrics] = useState<SLAMetrics | null>(null);
  const [byAgent, setByAgent] = useState<SLAByAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const startIso = start?.toISOString() ?? null;
  const endIso = end?.toISOString() ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { overall, agents } = await metricsRepo.getSlaMetrics(startIso, endIso);

      const overallRow = Array.isArray(overall) ? (overall[0] as SLAMetrics | undefined) : null;
      setMetrics(overallRow ?? null);
      setByAgent(Array.isArray(agents) ? (agents as SLAByAgent[]) : []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("useSLAMetrics:", message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [startIso, endIso]);

  useEffect(() => {
    load();
  }, [load]);

  return { metrics, byAgent, loading, error, refresh: load };
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || Number.isNaN(seconds)) return "—";
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}
