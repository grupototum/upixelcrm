import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Automation, PipelineColumn, AutomationTrigger, AutomationAction } from "@/types";
import { useAppState } from "@/contexts/AppContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Trash2, Zap, LogIn, Clock, ArrowRightLeft, Tag, TagIcon, ArrowRight, CheckSquare, Send, MessageSquare, Bot, ShieldAlert, Plus } from "lucide-react";

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

interface AutomationEditModalProps {
  automation: Automation | null;
  open: boolean;
  onClose: () => void;
}

export function AutomationEditModal({ automation, open, onClose }: AutomationEditModalProps) {
  const { updateBasicAutomation, columns, pipelines } = useAppState();

  if (!automation) return null;

  const handleUpdate = (data: Partial<Automation>) => {
    updateBasicAutomation(automation.id, data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Editar Automação: {automation.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Nome da automação</Label>
              <Input 
                value={automation.name} 
                onChange={(e) => handleUpdate({ name: e.target.value })} 
                className="mt-1"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs">Ativa</Label>
              <Switch 
                checked={automation.active} 
                onCheckedChange={(checked) => handleUpdate({ active: checked })} 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Funil Alvo</Label>
                <Select
                  value={automation.pipeline_id || "none"}
                  onValueChange={(val) => handleUpdate({ pipeline_id: val === "none" ? undefined : val })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Global (Todos)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Global (Todos)</SelectItem>
                    {pipelines.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Coluna Alvo</Label>
                <Select
                  value={automation.column_id || "none"}
                  onValueChange={(val) => handleUpdate({ column_id: val === "none" ? undefined : val })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Qualquer Coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Qualquer Coluna</SelectItem>
                    {columns
                      .filter(c => !automation.pipeline_id || c.pipeline_id === automation.pipeline_id)
                      .map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
             <p className="text-xs font-semibold uppercase text-muted-foreground mb-4">Gatilho e Ações</p>
             <div className="space-y-4">
                {/* Gatilho */}
                <div className="border border-success/30 bg-success/5 rounded-xl p-3">
                  <Label className="text-[10px] text-success uppercase font-bold flex items-center gap-1 mb-2">
                    <Zap className="h-3 w-3" /> Gatilho
                  </Label>
                  <Select
                    value={automation.trigger.type}
                    onValueChange={(type) => handleUpdate({ trigger: { type: type as AutomationTrigger["type"] } })}
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
                </div>

                {/* Ações */}
                <div className="space-y-2">
                  <Label className="text-[10px] text-primary uppercase font-bold flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Ações
                  </Label>
                  {automation.actions.map((action, idx) => (
                    <div key={idx} className="border border-primary/30 bg-primary/5 rounded-xl p-3 flex gap-2 items-start">
                      <div className="flex-1 space-y-2">
                        <Select
                          value={action.type}
                          onValueChange={(type) => {
                            const newActions = [...automation.actions];
                            newActions[idx] = { ...action, type: type as AutomationAction["type"] };
                            handleUpdate({ actions: newActions });
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ACTIONS.map(a => (
                              <SelectItem key={a.value} value={a.value} className="text-xs">
                                <span className="flex items-center gap-2"><a.icon className="h-3 w-3" /> {a.label}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {action.type === "add_tag" && (
                          <Input 
                            value={(action.config?.tag as string) || ""} 
                            onChange={(e) => {
                              const newActions = [...automation.actions];
                              newActions[idx] = { ...action, config: { tag: e.target.value } };
                              handleUpdate({ actions: newActions });
                            }} 
                            placeholder="Tag" 
                            className="h-7 text-xs" 
                          />
                        )}

                        {action.type === "move_column" && (
                          <Select
                            value={action.config?.column || ""}
                            onValueChange={(val) => {
                                const newActions = [...automation.actions];
                                newActions[idx] = { ...action, config: { column: val } };
                                handleUpdate({ actions: newActions });
                            }}
                          >
                            <SelectTrigger className="h-7 text-xs">
                                <SelectValue placeholder="Coluna destino" />
                            </SelectTrigger>
                            <SelectContent>
                                {columns.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          handleUpdate({ actions: automation.actions.filter((_, i) => i !== idx) });
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-[10px] h-7 border-dashed"
                    onClick={() => handleUpdate({ actions: [...automation.actions, { type: "add_tag", config: {} }] })}
                  >
                    Adicionar Ação
                  </Button>
                </div>
             </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
