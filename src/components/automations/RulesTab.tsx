import { useMemo, useState } from "react";
import { useAppState } from "@/contexts/AppContext";
import {
  Zap, Settings, Target, Cog, AlertTriangle,
  MoreHorizontal, Copy, Trash2, Search, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ComingSoonBadge } from "@/components/ui/coming-soon";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AutomationEditModal } from "./AutomationEditModal";
import type { Automation } from "@/types";

const triggerLabels: Record<string, string> = {
  card_entered: "Entrada no card",
  time_in_column: "Tempo na coluna",
  stage_changed: "Mudança de estágio",
};

const actionLabels: Record<string, string> = {
  add_tag: "Adicionar tag",
  remove_tag: "Remover tag",
  move_column: "Mover de coluna",
  create_task: "Criar tarefa",
  send_message: "Enviar mensagem",
  send_template: "Enviar template",
  add_ai_agent: "Adicionar agente IA",
};

export function RulesTab() {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const { 
    automations, 
    columns, 
    toggleBasicAutomation, 
    deleteBasicAutomation, 
    addBasicAutomation 
  } = useAppState();

  const editingAutomation = editingId ? automations.find(a => a.id === editingId) || null : null;

  const filtered = useMemo(
    () => automations.filter((a) => a.name.toLowerCase().includes(search.toLowerCase())),
    [search, automations]
  );

  const toggleAuto = (id: string) => {
    toggleBasicAutomation(id);
  };

  const deleteAuto = (id: string) => {
    if (confirm("Deseja realmente excluir esta automação?")) {
      deleteBasicAutomation(id);
    }
  };

  const duplicateAuto = (auto: Automation) => {
    const { id: _, ...rest } = auto;
    addBasicAutomation({
      ...rest,
      name: `${auto.name} (Cópia)`,
      active: false,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar automação..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs shadow-sm bg-card"
          />
        </div>
        <Badge variant="outline" className="text-[10px] text-muted-foreground px-2 py-0.5 border-[hsl(var(--border-strong))]">
          {filtered.length} automação{filtered.length !== 1 ? "ões" : ""}
        </Badge>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card ghost-border rounded-xl p-12 text-center border-dashed">
          <Zap className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
          <p className="text-sm text-muted-foreground font-medium">Nenhuma automação encontrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((auto) => {
            const col = columns.find((c) => c.id === auto.column_id);
            return (
              <div
                key={auto.id}
                className="bg-card ghost-border rounded-xl p-5 shadow-card hover:shadow-card-hover hover:border-[hsl(var(--border-strong))] transition-all duration-200 group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center transition-colors ${auto.active ? "bg-primary/10" : "bg-secondary"}`}>
                      <Zap className={`h-4 w-4 transition-colors ${auto.active ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{auto.name}</h3>
                      {col && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: col.color }} />
                          <span className="text-[10px] font-medium text-muted-foreground line-clamp-1">{col.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={auto.active} onCheckedChange={() => toggleAuto(auto.id)} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem className="text-xs gap-2" onClick={() => setEditingId(auto.id)}><Settings className="h-3 w-3" /> Editar</DropdownMenuItem>
                        <DropdownMenuItem className="text-xs gap-2" onClick={() => duplicateAuto(auto)}><Copy className="h-3 w-3" /> Duplicar</DropdownMenuItem>
                        <DropdownMenuItem className="text-xs gap-2 text-destructive" onClick={() => deleteAuto(auto.id)}><Trash2 className="h-3 w-3" /> Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Trigger / Actions / Exceptions */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-success/30 bg-success/5 p-3">
                    <p className="text-[10px] font-bold text-success uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Target className="h-3 w-3" /> Gatilho
                    </p>
                    <p className="text-[11px] font-medium text-foreground">{triggerLabels[auto.trigger.type]}</p>
                    {auto.trigger.type === "time_in_column" && auto.trigger.config?.hours && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {String(auto.trigger.config.hours)}h na coluna
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-[hsl(var(--border-strong))] bg-primary/5 p-3">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Cog className="h-3 w-3" /> Ações
                    </p>
                    <div className="space-y-1.5">
                      {auto.actions.length > 0 ? (
                        auto.actions.map((a, i) => (
                          <p key={i} className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
                            <span className="h-1 w-1 rounded-full bg-primary shrink-0" />
                            {actionLabels[a.type]}
                            {a.comingSoon && <ComingSoonBadge />}
                          </p>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Nenhuma ação</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                    <p className="text-[10px] font-bold text-destructive uppercase tracking-wider mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Exceções
                    </p>
                    <div className="space-y-1.5">
                      {auto.exceptions.length > 0 ? (
                        auto.exceptions.map((e, i) => (
                          <p key={i} className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
                            <span className="h-1 w-1 rounded-full bg-destructive shrink-0" />
                            Tag: {(e.config as Record<string, unknown>)?.tag as string}
                          </p>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Nenhuma exceção</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AutomationEditModal 
        automation={editingAutomation} 
        open={!!editingAutomation} 
        onClose={() => setEditingId(null)} 
      />
    </div>
  );
}
