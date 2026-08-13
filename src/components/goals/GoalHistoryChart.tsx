import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import * as goalsRepo from "@/services/goals";
import type { GoalProgress } from "@/types";

const BUCKETS = 6;
const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
  color: "hsl(var(--foreground))",
};

/**
 * Progresso real acumulado (verde) vs ritmo ideal (cinza tracejado) — PRD §3.6.
 * Ritmo ideal = reta de 0 até target_value, linear ao longo do período.
 */
export function GoalHistoryChart({ progress }: { progress: GoalProgress }) {
  const { goal, period_start, period_end } = progress;

  const { data: timestamps = [] } = useQuery({
    queryKey: ["goal-history", goal.id, progress.user_id, period_start, period_end],
    queryFn: () => goalsRepo.listMetricTimestamps(
      goal.metric, new Date(period_start), new Date(period_end),
      { userId: progress.user_id, columnId: goal.column_id }
    ),
  });

  const chartData = useMemo(() => {
    const startMs = new Date(period_start).getTime();
    const endMs = new Date(period_end).getTime();
    const span = Math.max(endMs - startMs, 1);
    const buckets = new Array(BUCKETS).fill(0);
    for (const ts of timestamps) {
      const t = new Date(ts).getTime();
      const idx = Math.min(Math.max(Math.floor(((t - startMs) / span) * BUCKETS), 0), BUCKETS - 1);
      buckets[idx]++;
    }
    let running = 0;
    return buckets.map((count, i) => {
      running += count;
      const bucketEndMs = startMs + span * ((i + 1) / BUCKETS);
      return {
        label: new Date(bucketEndMs).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        real: running,
        ideal: Math.round(goal.target_value * ((i + 1) / BUCKETS)),
      };
    });
  }, [timestamps, period_start, period_end, goal.target_value]);

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="real" name="Real" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="ideal" name="Ritmo ideal" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
