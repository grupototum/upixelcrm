import { useEffect, useMemo, useState } from "react";
import { Clock, Timer, CheckCircle2, Inbox, Star } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useSLAMetrics, formatDuration } from "@/hooks/useSLAMetrics";
import { useCsatMetrics } from "@/hooks/useCsatMetrics";

const RANGES: { id: "7d" | "30d" | "90d"; label: string; days: number }[] = [
  { id: "7d", label: "Últimos 7 dias", days: 7 },
  { id: "30d", label: "Últimos 30 dias", days: 30 },
  { id: "90d", label: "Últimos 90 dias", days: 90 },
];

export default function SLAPage() {
  const [rangeId, setRangeId] = useState<"7d" | "30d" | "90d">("30d");

  const { start, end } = useMemo(() => {
    const r = RANGES.find(x => x.id === rangeId) ?? RANGES[1];
    const e = new Date();
    const s = new Date(e.getTime() - r.days * 24 * 60 * 60 * 1000);
    return { start: s, end: e };
  }, [rangeId]);

  const { metrics, byAgent, loading, error, refresh } = useSLAMetrics(start, end);
  const csat = useCsatMetrics(start, end);

  useEffect(() => { csat.load(); }, [csat.load]);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">SLA & Tempo de atendimento</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Tempo médio de primeira resposta e resolução por período.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={rangeId} onValueChange={(v) => setRangeId(v as "7d" | "30d" | "90d")}>
              <SelectTrigger className="w-44 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGES.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refresh()} disabled={loading}>
              Atualizar
            </Button>
          </div>
        </div>

        {error && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="py-4 text-sm text-destructive">
              Erro ao carregar métricas: {error}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={<Timer className="h-4 w-4 text-primary" />}
            label="Tempo médio 1ª resposta"
            value={loading ? "—" : formatDuration(metrics?.avg_first_reply_seconds)}
            sub={loading ? "" : `Mediana: ${formatDuration(metrics?.median_first_reply_seconds)}`}
          />
          <KpiCard
            icon={<Clock className="h-4 w-4 text-accent" />}
            label="Tempo médio de resolução"
            value={loading ? "—" : formatDuration(metrics?.avg_resolution_seconds)}
            sub={loading ? "" : `Mediana: ${formatDuration(metrics?.median_resolution_seconds)}`}
          />
          <KpiCard
            icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
            label="Conversas resolvidas"
            value={loading ? "—" : `${metrics?.resolved_conversations ?? 0}`}
            sub={loading ? "" : `de ${metrics?.total_conversations ?? 0} totais`}
          />
          <KpiCard
            icon={<Inbox className="h-4 w-4 text-amber-600" />}
            label="Conversas abertas"
            value={loading ? "—" : `${metrics?.open_conversations ?? 0}`}
            sub={loading
              ? ""
              : `${metrics?.pending_conversations ?? 0} pendentes · ${metrics?.snoozed_conversations ?? 0} adiadas`}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Por agente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-xs text-muted-foreground">Carregando…</p>
            ) : byAgent.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem dados no período selecionado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b">
                      <th className="py-2 font-bold">Agente</th>
                      <th className="py-2 font-bold text-right">Total</th>
                      <th className="py-2 font-bold text-right">Resolvidas</th>
                      <th className="py-2 font-bold text-right">Tempo 1ª resposta</th>
                      <th className="py-2 font-bold text-right">Tempo resolução</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byAgent.map(row => (
                      <tr key={row.agent_id} className="border-b last:border-0">
                        <td className="py-2 text-xs font-medium">
                          {row.agent_id === "unassigned"
                            ? <span className="text-muted-foreground">Não atribuído</span>
                            : row.agent_id}
                        </td>
                        <td className="py-2 text-xs text-right">{row.total_conversations}</td>
                        <td className="py-2 text-xs text-right">{row.resolved_conversations}</td>
                        <td className="py-2 text-xs text-right">{formatDuration(row.avg_first_reply_seconds)}</td>
                        <td className="py-2 text-xs text-right">{formatDuration(row.avg_resolution_seconds)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
        {/* CSAT */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              Satisfação do cliente (CSAT)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {csat.loading ? (
              <p className="text-xs text-muted-foreground">Carregando…</p>
            ) : csat.error ? (
              <p className="text-xs text-destructive">Erro: {csat.error}</p>
            ) : !csat.metrics || csat.metrics.total_responses === 0 ? (
              <p className="text-xs text-muted-foreground">Sem respostas CSAT no período.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold">
                    {csat.metrics.avg_rating != null
                      ? csat.metrics.avg_rating.toFixed(1)
                      : "—"}
                  </span>
                  <span className="text-sm text-muted-foreground">/ 5</span>
                  <span className="text-xs text-muted-foreground">
                    ({csat.metrics.total_responses} respostas)
                  </span>
                </div>
                <div className="space-y-1.5">
                  {([5, 4, 3, 2, 1] as const).map((star) => {
                    const key = `rating_${star}` as keyof typeof csat.metrics;
                    const count = (csat.metrics![key] as number) ?? 0;
                    const pct = csat.metrics!.total_responses > 0
                      ? Math.round((count / csat.metrics!.total_responses) * 100)
                      : 0;
                    return (
                      <div key={star} className="flex items-center gap-2 text-xs">
                        <span className="w-6 text-right text-muted-foreground">{star}★</span>
                        <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="h-2 rounded-full bg-amber-400 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-muted-foreground">{pct}%</span>
                        <span className="w-6 text-right tabular-nums">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function KpiCard({
  icon, label, value, sub,
}: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
          {icon}
          {label}
        </div>
        <p className="text-2xl font-bold mt-2">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}
