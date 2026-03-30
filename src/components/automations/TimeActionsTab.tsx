import { useMemo, useState } from "react";
import { useAppState } from "@/contexts/AppContext";
import {
  Clock, Settings, Target, Cog, AlertTriangle,
  MoreHorizontal, Copy, Trash2, Search, Plus, Timer, MessageSquare, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AutomationEditModal } from "./AutomationEditModal";
import type { Automation } from "@/types";

const actionLabels: Record<string, string> = {
  add_tag: "Adicionar tag",
  remove_tag: "Remover tag",
  move_column: "Mover de coluna",
  create_task: "Criar tarefa",
  send_message: "Enviar mensagem",
  send_template: "Enviar template",
  add_ai_agent: "Adicionar agente IA",
};

export function TimeActionsTab() {
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

  // Filter ONLY time-based rules
  const timeAutomations = useMemo(
    () => automations.filter(a => a.trigger.type === "time_in_column"),
    [automations]
  );

  const filtered = useMemo(
    () => timeAutomations.filter((a) => a.name.toLowerCase().includes(search.toLowerCase())),
    [search, timeAutomations]
  );

  const toggleAuto = (id: string) => {
    toggleBasicAutomation(id);
  };

  const deleteAuto = (id: string) => {
    if (confirm("Deseja realmente excluir esta ação temporal?")) {
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
            placeholder="Buscar regra de tempo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs shadow-sm bg-card/50"
          />
        </div>
        <Badge variant="outline" className="text-[10px] text-muted-foreground px-2 py-0.5 border-border/50">
          {filtered.length} regr{filtered.length !== 1 ? "as" : "a"}
        </Badge>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card ghost-border rounded-xl p-12 text-center border-dashed">
          <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
          <p className="text-sm text-foreground font-medium mb-1">Nenhuma rotina temporal configurada</p>
          <p className="text-xs text-muted-foreground">Crie ações como "Enviar mensagem após 24h sem contato"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((auto) => {
            const col = columns.find((c) => c.id === auto.column_id);
            const hoursInTrigger = auto.trigger.config?.hours || 0;
            
            // Render specific icon based on the primary action
            const primaryAction = auto.actions[0]?.type;
            const ActionIcon = primaryAction === "move_column" ? ArrowRight : 
                               primaryAction === "send_message" ? MessageSquare : Timer;

            return (
              <div
                key={auto.id}
                className="bg-card ghost-border rounded-xl p-5 shadow-card hover:shadow-card-hover hover:border-accent/20 transition-all duration-200 group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center transition-colors ${auto.active ? "bg-accent/10" : "bg-secondary"}`}>
                      <ActionIcon className={`h-4 w-4 transition-colors ${auto.active ? "text-accent" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground group-hover:text-accent transition-colors">{auto.name}</h3>
                      {col ? (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: col.color }} />
                          <span className="text-[10px] font-medium text-muted-foreground line-clamp-1">{col.name}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-medium text-muted-foreground line-clamp-1 mt-0.5">Todas as colunas</span>
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

                {/* Details */}
                <div className="bg-secondary/30 rounded-lg p-3 border border-border/40">
                  <div className="flex items-center gap-2 text-[11px] mb-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground font-medium">Condição:</span>
                    <span className="text-foreground">Após {String(hoursInTrigger)}h na fase</span>
                  </div>
                  <div className="flex items-start gap-2 text-[11px]">
                    <Cog className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1">
                      {auto.actions.length > 0 ? (
                        auto.actions.map((a, i) => (
                          <span key={i} className="text-foreground font-medium">
                            {actionLabels[a.type] || a.type}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground italic">Nenhuma ação</span>
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
