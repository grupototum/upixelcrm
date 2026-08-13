import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import * as goalsRepo from "@/services/goals";
import { useGoalsProgress } from "@/hooks/useGoalsProgress";
import { GoalProgressRing } from "@/components/goals/GoalProgressRing";
import { GoalHistoryChart } from "@/components/goals/GoalHistoryChart";
import { METRIC_LABELS, PERIOD_LABELS, getPeriodRange } from "@/lib/goal-period";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { resolveClientId } from "@/lib/tenant-utils";

const PAST_OFFSETS = [-1, -2, -3];

export default function GoalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { user } = useAuth();
  const clientId = resolveClientId(tenant?.id, user?.client_id);

  const { data: allGoals = [] } = useQuery({
    queryKey: ["goals", clientId],
    queryFn: () => goalsRepo.getGoals(clientId as string),
    enabled: !!clientId,
  });
  const goal = allGoals.find((g) => g.id === id);

  const { myProgress, teamProgress, agentsById } = useGoalsProgress(goal?.period ?? "monthly");
  const progress = useMemo(
    () => myProgress.find((p) => p.goal.id === id) ?? teamProgress.find((p) => p.goal.id === id),
    [myProgress, teamProgress, id]
  );

  // Períodos anteriores — 1 chamada de RPC por offset, filtrada pro mesmo
  // goal+assignment. Aproximado: leads_closed usa a coluna ATUAL do lead.
  const pastPeriods = useMemo(() => {
    if (!goal) return [];
    return PAST_OFFSETS.map((offset) => ({ offset, range: getPeriodRange(goal.period, offset) }));
  }, [goal]);

  const pastResults = useQuery({
    queryKey: ["goal-history-periods", id, progress?.user_id, pastPeriods.map((p) => p.range.start.toISOString())],
    queryFn: async () => {
      const rows = await Promise.all(pastPeriods.map((p) => goalsRepo.getGoalsProgress(p.range.start, p.range.end)));
      return pastPeriods.map((p, i) => {
        const row = rows[i].find((r) => r.goal_id === id && r.user_id === (progress?.user_id ?? null));
        const current = row?.current_value ?? 0;
        return { ...p, current, percentage: goal ? Math.round((current / goal.target_value) * 100) : 0 };
      });
    },
    enabled: !!goal && pastPeriods.length > 0,
  });

  if (!goal || !progress) {
    return (
      <AppLayout title="Meta" breadcrumbLabel="Detalhe">
        <div className="p-8">
          <Button variant="ghost" size="sm" className="gap-1.5 mb-4" onClick={() => navigate("/metas")}>
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar às Metas
          </Button>
          <p className="text-sm text-muted-foreground">Meta não encontrada ou sem progresso neste período.</p>
        </div>
      </AppLayout>
    );
  }

  const assigneeName = progress.user_id ? agentsById[progress.user_id]?.name : "Toda a equipe";

  return (
    <AppLayout title={goal.title} breadcrumbLabel={goal.title}>
      <div className="p-8 max-w-3xl mx-auto animate-fade-in space-y-6">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate("/metas")}>
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar às Metas
        </Button>

        <div className="bg-card border border-border rounded-lg p-6 flex items-center gap-6">
          <GoalProgressRing percentage={progress.percentage} trend={progress.trend} size={96} strokeWidth={9} />
          <div>
            <h2 className="text-lg font-bold text-foreground">{METRIC_LABELS[goal.metric]} — {PERIOD_LABELS[goal.period]}</h2>
            <p className="text-sm text-muted-foreground mt-1">{progress.current_value} / {goal.target_value}</p>
            <p className="text-xs text-muted-foreground mt-2">Para quem: {assigneeName}</p>
            <p className="text-xs font-medium text-foreground mt-1">{progress.pace_message}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Histórico do período</h3>
          <GoalHistoryChart progress={progress} />
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Períodos anteriores</h3>
          {goal.metric === "leads_closed" && (
            <p className="text-[10px] text-muted-foreground mb-2">Aproximado: usa a etapa atual do lead, não a etapa no momento do fechamento.</p>
          )}
          <div className="space-y-2">
            {(pastResults.data ?? []).map(({ offset, current, percentage }) => (
              <div key={offset} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{Math.abs(offset)} {PERIOD_LABELS[goal.period].toLowerCase()}(s) atrás</span>
                <span className="font-medium text-foreground">{current}/{goal.target_value} ({percentage}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
