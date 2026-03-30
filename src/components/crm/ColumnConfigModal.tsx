import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ComingSoonBadge } from "@/components/ui/coming-soon";
import {
  Settings, ListChecks, Plug, Zap, ClipboardList,
  Plus, Trash2, LogIn, Clock, ArrowRightLeft,
  Tag, TagIcon, ArrowRight, CheckSquare, Send, Bot, MessageSquare,
  ShieldAlert,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PipelineColumn, Automation, AutomationTrigger, AutomationAction, AutomationException } from "@/types";
import { useAppState } from "@/contexts/AppContext";
import { toast } from "sonner";



/* ─── Trigger / Action / Exception configs ─── */
const TRIGGERS = [
  { value: "card_entered", label: "Entrada no card", icon: LogIn },
  { value: "time_in_column", label: "Tempo na coluna", icon: Clock },
  { value: "stage_changed", label: "Mudança de estágio", icon: ArrowRightLeft },
];

const ACTIONS = [
  { value: "add_tag", label: "Adicionar tag", icon: Tag },
  { value: "remove_tag", label: "Remover tag", icon: TagIcon },
  { value: "move_column", label: "Mover de coluna", icon: ArrowRight },
  { value: "create_task", label: "Criar tarefa", icon: CheckSquare },
];

const ACTIONS_COMING_SOON = [
  { value: "send_message", label: "Enviar mensagem", icon: Send },
  { value: "send_template", label: "Enviar template", icon: MessageSquare },
  { value: "add_ai_agent", label: "Adicionar agente IA", icon: Bot },
];

const EXCEPTIONS = [
  { value: "has_tag", label: "Tag presente", icon: ShieldAlert },
];

/* ─── Column Config Modal ─── */
interface ColumnConfigModalProps {
  column: PipelineColumn | null;
  open: boolean;
  onClose: () => void;
}

export function ColumnConfigModal({ column, open, onClose }: ColumnConfigModalProps) {
  const { 
    updateColumn, 
    deleteColumn, 
    automations, 
    addBasicAutomation, 
    updateBasicAutomation, 
    deleteBasicAutomation,
    columns: allColumns,
    currentPipelineId
  } = useAppState();
  const navigate = useNavigate();

  const [columnName, setColumnName] = useState(column?.name ?? "");
  const [columnColor, setColumnColor] = useState(column?.color ?? "#3b82f6");

  // Filter automations for this specific column
  const columnRules = useMemo(() => 
    automations.filter(a => a.column_id === column?.id),
    [automations, column?.id]
  );

  // Sync internal state when column changes
  useEffect(() => {
    if (column) {
      setColumnName(column.name);
      setColumnColor(column.color ?? "#3b82f6");
    }
  }, [column]);

  if (!column) return null;

  const handleSaveGeneral = async () => {
    await updateColumn(column.id, { name: columnName, color: columnColor });
  };

  const handleDeleteColumn = async () => {
    if (confirm("Deseja realmente excluir esta coluna? Todos os leads nela serão mantidos, mas a coluna sumirá.")) {
      await deleteColumn(column.id);
      onClose();
    }
  };

  const handleAddRule = async () => {
    await addBasicAutomation({
      name: "Nova automação " + column.name,
      column_id: column.id,
      pipeline_id: currentPipelineId,
      trigger: { type: "card_entered" },
      actions: [],
      active: true
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: columnColor }} />
            Configuração: {column.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="px-6 pb-6 pt-4">
          <TabsList className="w-full grid grid-cols-5 h-9">
            <TabsTrigger value="general" className="text-xs gap-1"><Settings className="h-3 w-3" /> Geral</TabsTrigger>
            <TabsTrigger value="cadence" className="text-xs gap-1"><ListChecks className="h-3 w-3" /> Cadência</TabsTrigger>
            <TabsTrigger value="integrations" className="text-xs gap-1"><Plug className="h-3 w-3" /> Integrações</TabsTrigger>
            <TabsTrigger value="automations" className="text-xs gap-1"><Zap className="h-3 w-3" /> Automações</TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs gap-1"><ClipboardList className="h-3 w-3" /> Tarefas</TabsTrigger>
          </TabsList>

          {/* ─── General ─── */}
          <TabsContent value="general" className="mt-4 space-y-4">
            <div>
              <Label className="text-xs">Nome da coluna</Label>
              <Input value={columnName} onChange={(e) => setColumnName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Cor</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={columnColor} onChange={(e) => setColumnColor(e.target.value)} className="h-9 w-12 rounded ghost-border cursor-pointer" />
                <span className="text-xs text-muted-foreground">{columnColor}</span>
              </div>
            </div>
            <div className="flex justify-between">
              <Button size="sm" variant="destructive" className="text-xs gap-1" onClick={handleDeleteColumn}>
                <Trash2 className="h-3 w-3" /> Excluir Coluna
              </Button>
              <Button size="sm" className="text-xs" onClick={handleSaveGeneral}>Salvar Alterações</Button>
            </div>
          </TabsContent>

          {/* ─── Cadence ─── */}
          <TabsContent value="cadence" className="mt-4">
            <div className="flex flex-col items-center justify-center py-8 text-center bg-secondary/20 rounded-xl border border-dashed border-border/50">
              <ListChecks className="h-8 w-8 text-muted-foreground mb-3 opacity-20" />
              <p className="text-sm text-muted-foreground mb-4">A cadência permite automatizar o <br/> fluxo de mensagens e sequências.</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs gap-1.5"
                onClick={() => {
                  navigate("/automations", { state: { tab: "sequences" } });
                  onClose();
                }}
              >
                Configurar Mensagens e Sequências <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </TabsContent>

          {/* ─── Integrations ─── */}
          <TabsContent value="integrations" className="mt-4">
            <div className="flex flex-col items-center justify-center py-8 text-center bg-secondary/20 rounded-xl border border-dashed border-border/50">
              <Plug className="h-8 w-8 text-muted-foreground mb-3 opacity-20" />
              <p className="text-sm text-muted-foreground mb-4">Conecte o seu funil com outras <br/> ferramentas e APIs.</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs gap-1.5"
                onClick={() => {
                  navigate("/integrations");
                  onClose();
                }}
              >
                Ir para Integrações <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="automations" className="mt-4 space-y-4">
            {columnRules.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed rounded-xl border-border/50">
                <Zap className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-20" />
                <p className="text-sm text-muted-foreground mb-3 font-medium">Nenhuma automação nesta coluna</p>
                <Button variant="outline" size="sm" onClick={handleAddRule} className="text-[10px] h-7">
                  Configurar Primeira Regra
                </Button>
              </div>
            )}

            <div className="space-y-4">
              {columnRules.map((rule) => (
                <AutomationRuleCard
                  key={rule.id}
                  rule={rule}
                  columns={allColumns.filter(c => c.pipeline_id === currentPipelineId)}
                  onUpdate={(updated) => updateBasicAutomation(rule.id, updated)}
                  onDelete={() => deleteBasicAutomation(rule.id)}
                />
              ))}
            </div>

            {columnRules.length > 0 && (
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs gap-1 border-primary/20 text-primary hover:bg-primary/5"
                  onClick={handleAddRule}
                >
                  <Plus className="h-3 w-3" /> Nova automação
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-[10px] text-muted-foreground gap-1 h-7"
                  onClick={() => {
                    navigate("/automations", { state: { tab: "rules" } });
                    onClose();
                  }}
                >
                  Ver todas as automações <ArrowRight className="h-2 w-2" />
                </Button>
              </div>
            )}
          </TabsContent>

          {/* ─── Manual Tasks ─── */}
          <TabsContent value="tasks" className="mt-4">
            <div className="flex flex-col items-center justify-center py-8 text-center bg-secondary/20 rounded-xl border border-dashed border-border/50">
              <ClipboardList className="h-8 w-8 text-muted-foreground mb-3 opacity-20" />
              <p className="text-sm text-muted-foreground mb-4">Gerencie as tarefas pendentes <br/> deste funil de vendas.</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs gap-1.5"
                onClick={() => {
                  navigate("/tasks");
                  onClose();
                }}
              >
                Gerenciar Tarefas <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

interface AutomationRuleCardProps {
  rule: Automation;
  columns: PipelineColumn[];
  onUpdate: (r: Partial<Automation>) => void;
  onDelete: () => void;
}

function AutomationRuleCard({
  rule,
  columns,
  onUpdate,
  onDelete,
}: AutomationRuleCardProps) {
  return (
    <div className="ghost-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-secondary/50">
        <div className="flex items-center gap-3">
          <Switch checked={rule.active} onCheckedChange={(active) => onUpdate({ ...rule, active })} />
          <Input
            value={rule.name}
            onChange={(e) => onUpdate({ ...rule, name: e.target.value })}
            className="h-7 w-48 text-xs font-medium border-none bg-transparent p-0 focus-visible:ring-0"
          />
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {/* Trigger */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-success mb-2 flex items-center gap-1">
            <Zap className="h-3 w-3" /> Gatilho
          </p>
          <div className="border border-success/30 bg-success/5 rounded-xl p-3">
            <Select
              value={rule.trigger.type}
              onValueChange={(type) => onUpdate({ ...rule, trigger: { type } })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGERS.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-xs">
                    <span className="flex items-center gap-2"><t.icon className="h-3 w-3" /> {t.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {rule.trigger.type === "time_in_column" && (
              <div className="mt-2">
                <Label className="text-[10px]">Horas na coluna</Label>
                <Input
                  type="number"
                  value={rule.trigger.config?.hours ?? 24}
                  onChange={(e) =>
                    onUpdate({ ...rule, trigger: { ...rule.trigger, config: { hours: Number(e.target.value) } } })
                  }
                  className="h-7 text-xs mt-1 w-24"
                  min={1}
                />
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-2 flex items-center gap-1">
            <ArrowRight className="h-3 w-3" /> Ações
          </p>
          <div className="space-y-2">
            {rule.actions.map((action, aIdx) => (
              <div key={action.id} className="border border-primary/30 bg-primary/5 rounded-xl p-3 flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <Select
                    value={action.type}
                    onValueChange={(type) => {
                      const updated = [...rule.actions];
                      updated[aIdx] = { ...action, type };
                      onUpdate({ ...rule, actions: updated });
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIONS.map((a) => (
                        <SelectItem key={a.value} value={a.value} className="text-xs">
                          <span className="flex items-center gap-2"><a.icon className="h-3 w-3" /> {a.label}</span>
                        </SelectItem>
                      ))}
                      {ACTIONS_COMING_SOON.map((a) => (
                        <SelectItem key={a.value} value={a.value} className="text-xs opacity-50" disabled>
                          <span className="flex items-center gap-2"><a.icon className="h-3 w-3" /> {a.label} (em breve)</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {(action.type === "add_tag" || action.type === "remove_tag") && (
                    <Input
                      value={action.config?.tag ?? ""}
                      onChange={(e) => {
                        const updated = [...rule.actions];
                        updated[aIdx] = { ...action, config: { tag: e.target.value } };
                        onUpdate({ ...rule, actions: updated });
                      }}
                      placeholder="Nome da tag"
                      className="h-7 text-xs"
                    />
                  )}

                  {action.type === "move_column" && (
                    <Select
                      value={action.config?.column ?? ""}
                      onValueChange={(column) => {
                        const updated = [...rule.actions];
                        updated[aIdx] = { ...action, config: { column } };
                        onUpdate({ ...rule, actions: updated });
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Selecionar coluna" />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {action.type === "create_task" && (
                    <Input
                      value={action.config?.title ?? ""}
                      onChange={(e) => {
                        const updated = [...rule.actions];
                        updated[aIdx] = { ...action, config: { title: e.target.value } };
                        onUpdate({ ...rule, actions: updated });
                      }}
                      placeholder="Título da tarefa"
                      className="h-7 text-xs"
                    />
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => {
                    const updated = rule.actions.filter((_, i) => i !== aIdx);
                    onUpdate({ ...rule, actions: updated });
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1 text-primary hover:text-primary"
              onClick={() =>
                onUpdate({
                  actions: [...rule.actions, { id: `a-${Date.now()}`, type: "add_tag", config: {} }],
                })
              }
            >
              <Plus className="h-3 w-3" /> Adicionar ação
            </Button>
          </div>
        </div>

        {/* Exceptions */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-destructive mb-2 flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" /> Exceções
          </p>
          <div className="space-y-2">
            {rule.exceptions.map((exc, eIdx) => (
              <div key={exc.id} className="border border-destructive/30 bg-destructive/5 rounded-xl p-3 flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <Select
                    value={exc.type}
                    onValueChange={(type) => {
                      const updated = [...rule.exceptions];
                      updated[eIdx] = { ...exc, type };
                      onUpdate({ ...rule, exceptions: updated });
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXCEPTIONS.map((e) => (
                        <SelectItem key={e.value} value={e.value} className="text-xs">
                          <span className="flex items-center gap-2"><e.icon className="h-3 w-3" /> {e.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {exc.type === "has_tag" && (
                    <Input
                      value={exc.config?.tag ?? ""}
                      onChange={(e) => {
                        const updated = [...rule.exceptions];
                        updated[eIdx] = { ...exc, config: { tag: e.target.value } };
                        onUpdate({ ...rule, exceptions: updated });
                      }}
                      placeholder="Tag de exceção"
                      className="h-7 text-xs"
                    />
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => {
                    const updated = rule.exceptions.filter((_, i) => i !== eIdx);
                    onUpdate({ ...rule, exceptions: updated });
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1 text-destructive hover:text-destructive"
              onClick={() =>
                onUpdate({
                  exceptions: [...rule.exceptions, { id: `e-${Date.now()}`, type: "has_tag", config: {} }],
                })
              }
            >
              <Plus className="h-3 w-3" /> Adicionar exceção
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
