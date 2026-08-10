import { useState, useCallback } from "react";
import * as metricsRepo from "@/services/metrics";
import { logger } from "@/lib/logger";

export interface CsatMetrics {
  avg_rating: number | null;
  total_responses: number;
  rating_1: number;
  rating_2: number;
  rating_3: number;
  rating_4: number;
  rating_5: number;
}

export function useCsatMetrics(start?: Date, end?: Date) {
  const [metrics, setMetrics] = useState<CsatMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!start || !end) return;
    setLoading(true);
    setError(null);

    let data: unknown;
    try {
      data = await metricsRepo.getCsatStats(start, end);
    } catch (rpcError: any) {
      logger.error("useCsatMetrics: rpc failed", rpcError);
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (row) {
      setMetrics({
        avg_rating: row.avg_rating != null ? Number(row.avg_rating) : null,
        total_responses: Number(row.total_responses ?? 0),
        rating_1: Number(row.rating_1 ?? 0),
        rating_2: Number(row.rating_2 ?? 0),
        rating_3: Number(row.rating_3 ?? 0),
        rating_4: Number(row.rating_4 ?? 0),
        rating_5: Number(row.rating_5 ?? 0),
      });
    }
    setLoading(false);
  }, [start, end]);

  return { metrics, loading, error, load };
}
