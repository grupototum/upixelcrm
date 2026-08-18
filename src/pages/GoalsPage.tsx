import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Target, Settings2 } from "lucide-react";
import { useGoalsProgress } from "@/hooks/useGoalsProgress";
import { usePermissions } from "@/hooks/usePermissions";
import { GoalCard } from "@/components/goals/GoalCard";
import { GoalTeamGrid } from "@/components/goals/GoalTeamGrid";
import { GoalsLeaderboard } from "@/components/goals/GoalsLeaderboard";
import { ActiveSequencesWidget } from "@/components/goals/ActiveSequencesWidget";
import type { GoalPeriod } from "@/types";

type GoalView = "mine" | "team" | "all";

export default function GoalsPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const isAdmin = hasPermission("settings.view");
  const [period, setPeriod] = useState<GoalPeriod>("monthly");
  const [view, setView] = useState<GoalView>("mine");

  const { myProgress, teamProgress, leaderboard, agentsById, isLoading } = useGoalsProgress(period);

  return (
    <AppLayout
      title="Metas"
      subtitle="Acompanhamento de metas da equipe"
      actions={isAdmin && (
        <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => navigate("/metas/configurar")}>
          <Settings2 className="h-3.5 w-3.5" /> Configurar
        </Button>
      )}
    >
      <div className="p-8 animate-fade-in space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as GoalPeriod)}>
            <TabsList>
              <TabsTrigger value="daily" className="text-xs">Hoje</TabsTrigger>
              <TabsTrigger value="weekly" className="text-xs">Semana</TabsTrigger>
              <TabsTrigger value="monthly" className="text-xs">Mês</TabsTrigger>
              <TabsTrigger value="quarterly" className="text-xs">Trimestre</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs value={view} onValueChange={(v) => setView(v as GoalView)}>
            <TabsList>
              <TabsTrigger value="mine" className="text-xs">Minha Meta</TabsTrigger>
              <TabsTrigger value="team" className="text-xs">Minha Equipe</TabsTrigger>
              {isAdmin && <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>}
            </TabsList>
          </Tabs>
        </div>

        <ActiveSequencesWidget />

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : view === "mine" ? (
          myProgress.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {myProgress.map((p) => (
                <button key={p.goal.id + (p.user_id ?? "")} onClick={() => navigate(`/metas/${p.goal.id}`)} className="text-left">
                  <GoalCard progress={p} />
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <Target className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">Nenhuma meta para este período ainda.</p>
              {isAdmin && (
                <Button size="sm" onClick={() => navigate("/metas/configurar")}>Criar meta</Button>
              )}
            </div>
          )
        ) : view === "team" ? (
          <GoalTeamGrid progress={teamProgress} agentsById={agentsById} />
        ) : (
          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Ranking geral do período
            </h3>
            <GoalsLeaderboard entries={leaderboard} />
          </div>
        )}

        {view !== "all" && (
          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Ranking da equipe
            </h3>
            <GoalsLeaderboard entries={leaderboard} />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
