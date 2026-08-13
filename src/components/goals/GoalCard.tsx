import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GoalProgressRing } from "./GoalProgressRing";
import { GoalSparkline } from "./GoalSparkline";
import * as goalsRepo from "@/services/goals";
import { METRIC_LABELS, PERIOD_LABELS } from "@/lib/goal-period";
import type { GoalProgress, GoalTrend } from "@/types";

const TREND_LABEL: Record<GoalTrend, string> = {
  achieved: "Meta atingida!",
  on_track: "No ritmo ↑",
  at_risk: "Atenção ↓",
  behind: "Atrasado ↓",
};

const TREND_BADGE_CLASS: Record<GoalTrend, string> = {
  achieved: "bg-success/15 text-success border-none",
  on_track: "bg-success/10 text-success border-none",
  at_risk: "bg-warning/10 text-warning border-none",
  behind: "bg-destructive/10 text-destructive border-none",
};

const BUCKETS = 7;

/** Divide o range em 7 baldes iguais e conta timestamps acumulados por balde. */
function bucketCumulative(timestamps: string[], start: string, end: string): number[] {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  const span = Math.max(endMs - startMs, 1);
  const counts = new Array(BUCKETS).fill(0);
  for (const ts of timestamps) {
    const t = new Date(ts).getTime();
    const idx = Math.min(Math.floor(((t - startMs) / span) * BUCKETS), BUCKETS - 1);
    if (idx >= 0) counts[idx]++;
  }
  let running = 0;
  return counts.map((c) => (running += c));
}

function useGoalSparkline(progress: GoalProgress) {
  return useQuery({
    queryKey: ["goal-sparkline", progress.goal.id, progress.user_id, progress.period_start, progress.period_end],
    queryFn: async () => {
      const timestamps = await goalsRepo.listMetricTimestamps(
        progress.goal.metric, new Date(progress.period_start), new Date(progress.period_end),
        { userId: progress.user_id, columnId: progress.goal.column_id }
      );
      return bucketCumulative(timestamps, progress.period_start, progress.period_end);
    },
    staleTime: 60_000,
  });
}

export function GoalCard({ progress }: { progress: GoalProgress }) {
  const { goal, current_value, percentage, trend, pace_message } = progress;
  const { data: sparkline } = useGoalSparkline(progress);

  const celebrationKey = `goal-celebrated-${goal.id}`;
  const [celebrating, setCelebrating] = useState(false);
  useEffect(() => {
    if (trend !== "achieved") return;
    if (sessionStorage.getItem(celebrationKey)) return;
    sessionStorage.setItem(celebrationKey, "1");
    setCelebrating(true);
    const t = setTimeout(() => setCelebrating(false), 2000);
    return () => clearTimeout(t);
  }, [trend, celebrationKey]);

  return (
    <div className="bg-card ghost-border rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden">
      {celebrating && (
        <div className="absolute inset-0 bg-success/10 flex items-center justify-center z-10 animate-in fade-in zoom-in-95 duration-500">
          <Badge className="bg-success text-success-foreground gap-1 text-xs px-3 py-1">
            <Sparkles className="h-3.5 w-3.5" /> Meta atingida! 🎉
          </Badge>
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground truncate">{goal.title}</h3>
          <p className="text-[11px] text-muted-foreground">{METRIC_LABELS[goal.metric]} · {PERIOD_LABELS[goal.period]}</p>
        </div>
        <GoalProgressRing percentage={percentage} trend={trend} size={52} strokeWidth={5} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-lg font-extrabold text-foreground">
          {current_value} <span className="text-xs font-normal text-muted-foreground">/ {goal.target_value}</span>
        </span>
        <Badge className={`text-[10px] ${TREND_BADGE_CLASS[trend]}`}>{TREND_LABEL[trend]}</Badge>
      </div>
      {sparkline && sparkline.some((v) => v > 0) && <GoalSparkline points={sparkline} />}
      <p className="text-[11px] text-muted-foreground">{pace_message}</p>
    </div>
  );
}
