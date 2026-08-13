import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { listActiveAgents } from "@/services/users";
import { METRIC_LABELS, PERIOD_LABELS } from "@/lib/goal-period";
import { useAppState } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import type { Goal, GoalMetric, GoalPeriod } from "@/types";

export interface GoalFormValues {
  title: string;
  metric: GoalMetric;
  target_value: number;
  period: GoalPeriod;
  column_id?: string;
  userIds: string[];
}

export function GoalFormDialog({
  open, onOpenChange, goal, onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = criar nova. */
  goal: Goal | null;
  onSubmit: (values: GoalFormValues) => Promise<void>;
}) {
  const { columns } = useAppState();
  const { user } = useAuth();
  const { data: agents = [] } = useQuery({
    queryKey: ["goals-form-agents", user?.client_id],
    queryFn: () => listActiveAgents(user!.client_id as string).catch(() => []),
    enabled: !!user?.client_id && open,
    staleTime: 60_000,
  });

  const [title, setTitle] = useState("");
  const [metric, setMetric] = useState<GoalMetric>("leads_created");
  const [targetValue, setTargetValue] = useState("");
  const [period, setPeriod] = useState<GoalPeriod>("monthly");
  const [columnId, setColumnId] = useState<string>("");
  const [userIds, setUserIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(goal?.title ?? "");
    setMetric(goal?.metric ?? "leads_created");
    setTargetValue(goal ? String(goal.target_value) : "");
    setPeriod(goal?.period ?? "monthly");
    setColumnId(goal?.column_id ?? "");
    setUserIds((goal?.assignments ?? []).filter((a) => a.user_id).map((a) => a.user_id as string));
  }, [open, goal]);

  const isTeamWide = userIds.length === 0;
  const needsColumn = metric === "leads_closed";

  function toggleUser(id: string, checked: boolean) {
    setUserIds((prev) => checked ? [...prev, id] : prev.filter((u) => u !== id));
  }

  async function handleSubmit() {
    const value = parseInt(targetValue, 10);
    if (!title.trim() || !value || value <= 0) return;
    if (needsColumn && !columnId) return;
    setSaving(true);
    await onSubmit({
      title: title.trim(), metric, target_value: value, period,
      column_id: needsColumn ? columnId : undefined,
      userIds,
    });
    setSaving(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{goal ? "Editar meta" : "Nova meta"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Nome da meta</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Leads do mês de João" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Métrica</Label>
            <Select value={metric} onValueChange={(v) => setMetric(v as GoalMetric)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(METRIC_LABELS) as GoalMetric[]).map((key) => (
                  <SelectItem key={key} value={key}>{METRIC_LABELS[key]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {needsColumn && (
            <div className="space-y-1">
              <Label className="text-xs">Etapa de fechamento *</Label>
              <Select value={columnId} onValueChange={setColumnId}>
                <SelectTrigger><SelectValue placeholder="Selecione a etapa" /></SelectTrigger>
                <SelectContent>
                  {columns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Valor-alvo</Label>
              <Input type="number" min={1} value={targetValue} onChange={(e) => setTargetValue(e.target.value)} placeholder="30" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Período</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as GoalPeriod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PERIOD_LABELS) as GoalPeriod[]).map((key) => (
                    <SelectItem key={key} value={key}>{PERIOD_LABELS[key]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Para quem</Label>
            <div className="flex items-center gap-2 py-1">
              <Checkbox checked={isTeamWide} onCheckedChange={(c) => c && setUserIds([])} />
              <span className="text-xs text-foreground">Toda a equipe</span>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto border border-border rounded-lg p-2">
              {agents.map((a) => (
                <label key={a.id} className="flex items-center gap-2 py-0.5 cursor-pointer">
                  <Checkbox checked={userIds.includes(a.id)} onCheckedChange={(c) => toggleUser(a.id, !!c)} />
                  <span className="text-xs text-foreground">{a.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving || !title.trim() || !targetValue || (needsColumn && !columnId)}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
