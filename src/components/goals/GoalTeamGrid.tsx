import { useMemo } from "react";
import { METRIC_LABELS, trendFor } from "@/lib/goal-period";
import type { GoalProgress } from "@/types";

const STATUS_DOT: Record<string, string> = {
  achieved: "bg-success", on_track: "bg-success", at_risk: "bg-warning", behind: "bg-destructive",
};
const STATUS_LABEL: Record<string, string> = {
  achieved: "Meta atingida", on_track: "No ritmo", at_risk: "Atenção", behind: "Atrasado",
};

/** Grid de cards por pessoa — visão "Minha Equipe" (PRD §3.2). */
export function GoalTeamGrid({
  progress, agentsById,
}: {
  progress: GoalProgress[];
  agentsById: Record<string, { id: string; name: string }>;
}) {
  const byUser = useMemo(() => {
    const map = new Map<string, { name: string; items: GoalProgress[] }>();
    for (const p of progress) {
      if (!p.user_id) continue;
      const entry = map.get(p.user_id) ?? { name: agentsById[p.user_id]?.name ?? "?", items: [] };
      entry.items.push(p);
      map.set(p.user_id, entry);
    }
    return Array.from(map.entries());
  }, [progress, agentsById]);

  if (byUser.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-6">Nenhuma meta individual atribuída ainda.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {byUser.map(([userId, { name, items }]) => {
        const avg = Math.round(items.reduce((s, i) => s + i.percentage, 0) / items.length);
        const status = trendFor(avg);
        return (
          <div key={userId} className="bg-card ghost-border rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-medium text-primary shrink-0">
                {name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-foreground truncate">{name}</span>
            </div>
            <div className="space-y-1">
              {items.map((p) => (
                <div key={p.goal.id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{METRIC_LABELS[p.goal.metric]}</span>
                  <span className="font-semibold text-foreground">{p.percentage}%</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5 pt-1 border-t border-border/60">
              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
              <span className="text-[11px] text-muted-foreground">{STATUS_LABEL[status]}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
