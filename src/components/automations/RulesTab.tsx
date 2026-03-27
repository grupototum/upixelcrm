import { useMemo, useState } from "react";
import { mockAutomations, mockColumns } from "@/lib/mock-data";
import {
  Zap, Settings, Target, Cog, AlertTriangle,
  MoreHorizontal, Copy, Trash2, Search, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ComingSoonBadge } from "@/components/ui/coming-soon";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

  const filtered = useMemo(
    () => mockAutomations.filter((a) => a.name.toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar automação..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
        <Badge variant="outline" className="text-xs text-muted-foreground">
          {filtered.length} automação{filtered.length !== 1 ? "ões" : ""}
        </Badge>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card ghost-border rounded-xl p-12 text-center">
          <Zap className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma automação encontrada</p>
        </div>
      ) : (
        filtered.map((auto) => {
          const col = mockColumns.find((c) => c.id === auto.column_id);
          return (
            <div
              key={auto.id}
              className="bg-card ghost-border rounded-xl p-5 shadow-card hover:shadow-card-hover hover:border-border-hover transition-all duration-200"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${auto.active ? "bg-primary/10" : "bg-secondary"}`}>
                    <Zap className={`h-4 w-4 ${auto.active ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{auto.name}</h3>
                    {auto.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{auto.description}</p>
                    )}
                    {col && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: col.color }} />
                        <span className="text-[10px] text-muted-foreground">{col.name}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={auto.active} />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem className="text-xs gap-2"><Settings className="h-3 w-3" /> Editar</DropdownMenuItem>
                      <DropdownMenuItem className="text-xs gap-2"><Copy className="h-3 w-3" /> Duplicar</DropdownMenuItem>
                      <DropdownMenuItem className="text-xs gap-2 text-destructive"><Trash2 className="h-3 w-3" /> Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Trigger / Actions / Exceptions */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-success/30 bg-success/5 p-3">
                  <p className="text-[10px] font-semibold text-success uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Target className="h-3 w-3" /> Gatilho
                  </p>
                  <p className="text-xs text-foreground">{triggerLabels[auto.trigger.type]}</p>
                  {auto.trigger.type === "time_in_column" && auto.trigger.config?.hours && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {String(auto.trigger.config.hours)}h na coluna
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                  <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Cog className="h-3 w-3" /> Ações
                  </p>
                  <div className="space-y-1">
                    {auto.actions.map((a, i) => (
                      <p key={i} className="text-xs text-foreground flex items-center gap-1.5">
                        <span className="h-1 w-1 rounded-full bg-primary shrink-0" />
                        {actionLabels[a.type]}
                        {a.comingSoon && <ComingSoonBadge />}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-[10px] font-semibold text-destructive uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Exceções
                  </p>
                  {auto.exceptions.length > 0 ? (
                    auto.exceptions.map((e, i) => (
                      <p key={i} className="text-xs text-foreground flex items-center gap-1.5">
                        <span className="h-1 w-1 rounded-full bg-destructive shrink-0" />
                        Tag: {(e.config as Record<string, unknown>)?.tag as string}
                      </p>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Nenhuma</p>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
