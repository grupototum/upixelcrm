import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Activity, MessagesSquare, CheckCircle2, XCircle, Pause, Loader2, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppState } from "@/contexts/AppContext";
import { useAutomationRuns, type RunStatus } from "@/hooks/useAutomationRuns";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig: Record<RunStatus, { label: string; color: string; icon: typeof Activity }> = {
  running: { label: "Em execução", color: "border-[hsl(var(--border-strong))] text-primary", icon: Activity },
  waiting: { label: "Aguardando resposta", color: "border-cyan-500/40 text-cyan-600", icon: MessagesSquare },
  completed: { label: "Concluído", color: "border-success/40 text-success", icon: CheckCircle2 },
  failed: { label: "Falhou", color: "border-destructive/40 text-destructive", icon: XCircle },
  paused: { label: "Pausado", color: "border-warning/40 text-warning", icon: Pause },
};

export default function AutomationRunsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { complexAutomations } = useAppState();
  const { runs, loading, refresh, cancelRun } = useAutomationRuns(id ?? null);

  const auto = complexAutomations.find((a) => a.id === id);

  return (
    <div className="w-full h-screen flex flex-col bg-background overflow-hidden">
      <header className="h-16 shrink-0 bg-card border-b border-border px-4 flex items-center justify-between z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/automations?tab=complex")}
            className="text-muted-foreground hover:bg-secondary"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-sm font-semibold text-foreground">Execuções: {auto?.name ?? "..."}</h1>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {runs.length} run{runs.length !== 1 ? "s" : ""} carregado{runs.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={() => navigate(`/automations/builder/${id}`)}>
            Editar Fluxo
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6">
          {loading && runs.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : runs.length === 0 ? (
            <div className="text-center py-20">
              <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-1">Nenhuma execução registrada</p>
              <p className="text-xs text-muted-foreground">
                Quando um lead disparar essa automação, ela aparecerá aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {runs.map((run) => {
                const cfg = statusConfig[run.status] ?? statusConfig.running;
                const Icon = cfg.icon;
                const isActive = run.status === "running" || run.status === "waiting";

                return (
                  <div
                    key={run.id}
                    className="bg-card ghost-border rounded-lg p-4 hover:border-[hsl(var(--border-strong))] transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-9 w-9 rounded-full bg-secondary/40 flex items-center justify-center shrink-0">
                        <Icon className={`h-4 w-4 ${cfg.color.split(" ")[1]}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <button
                            onClick={() => navigate(`/leads/${run.lead_id}`)}
                            className="text-sm font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1"
                          >
                            {run.lead_name || "Lead sem nome"}
                            <ExternalLink className="h-2.5 w-2.5" />
                          </button>
                          <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>
                            {cfg.label}
                          </Badge>
                          {run.trigger_event && (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              {run.trigger_event}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                          {run.lead_phone && <span>📞 {run.lead_phone}</span>}
                          <span>
                            Iniciado{" "}
                            {formatDistanceToNow(new Date(run.started_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                          <span>
                            {run.steps_executed} passo{run.steps_executed !== 1 ? "s" : ""} executado{run.steps_executed !== 1 ? "s" : ""}
                          </span>
                          {run.current_node_id && run.status !== "completed" && (
                            <span className="font-mono">
                              Nó: {run.current_node_id.substring(0, 8)}...
                            </span>
                          )}
                        </div>

                        {run.error && (
                          <p className="text-[11px] text-destructive mt-1.5 bg-destructive/10 rounded p-1.5">
                            ⚠ {run.error}
                          </p>
                        )}
                      </div>

                      {isActive && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[10px] gap-1 text-muted-foreground hover:text-destructive"
                          onClick={() => cancelRun(run.id)}
                          title="Pausar este run"
                        >
                          <X className="h-3 w-3" /> Cancelar
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
