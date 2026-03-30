import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Automation, AutomationTrigger, AutomationAction } from "@/types";
import { useAppState } from "@/contexts/AppContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Trash2, Zap, LogIn, Clock, ArrowRightLeft, Tag, TagIcon, ArrowRight, CheckSquare, Plus, Save } from "lucide-react";

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

  // Local state for editing — synced from prop on open/change
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [pipelineId, setPipelineId] = useState<string>("none");
  const [columnId, setColumnId] = useState<string>("none");
  const [trigger, setTrigger] = useState<AutomationTrigger>({ type: "card_entered" });
  const [actions, setActions] = useState<AutomationAction[]>([]);
  const [dirty, setDirty] = useState(false);

  // Sync local state when automation prop changes
  useEffect(() => {
    if (automation) {
      setName(automation.name);
      setActive(automation.active);
      setPipelineId(automation.pipeline_id || "none");
      setColumnId(automation.column_id || "none");
      setTrigger({ ...automation.trigger });
      setActions(automation.actions.map(a => ({ ...a })));
      setDirty(false);
    }
  }, [automation]);

  if (!automation) return null;

  const markDirty = () => setDirty(true);

  const handleSave = async () => {
    await updateBasicAutomation(automation.id, {
      name,
      active,
      pipeline_id: pipelineId === "none" ? undefined : pipelineId,
      column_id: columnId === "none" ? undefined : columnId,
      trigger,
      actions,
    });
    setDirty(false);
  };

  const handleClose = () => {
    if (dirty) {
      handleSave();
    }
    onClose();
  };

  const updateAction = (idx: number, newAction: AutomationAction) => {
    const updated = [...actions];
    updated[idx] = newAction;
    setActions(updated);
    markDirty();
  };

  const removeAction = (idx: number) => {
    setActions(actions.filter((_, i) => i !== idx));
    markDirty();
  };

  const addAction = () => {
    setActions([...actions, { type: "add_tag", config: {} }]);
    markDirty();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Editar Automação
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Nome da automação</Label>
              <Input
                value={name}
                onChange={(e) => { setName(e.target.value); markDirty(); }}
                className="mt-1"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs">Ativa</Label>
              <Switch
                checked={active}
                onCheckedChange={(checked) => { setActive(checked); markDirty(); }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Funil Alvo</Label>
                <Select value={pipelineId} onValueChange={(val) => { setPipelineId(val); setColumnId("none"); markDirty(); }}>
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
                <Select value={columnId} onValueChange={(val) => { setColumnId(val); markDirty(); }}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Qualquer Coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Qualquer Coluna</SelectItem>
                    {columns
                      .filter(c => pipelineId === "none" || c.pipeline_id === pipelineId)
                      .map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Trigger & Actions */}
          <div className="border-t pt-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-4">Gatilho e Ações</p>
            <div className="space-y-4">
              {/* Gatilho */}
              <div className="border border-success/30 bg-success/5 rounded-xl p-3">
                <Label className="text-[10px] text-success uppercase font-bold flex items-center gap-1 mb-2">
                  <Zap className="h-3 w-3" /> Gatilho
                </Label>
                <Select
                  value={trigger.type}
                  onValueChange={(type) => { setTrigger({ type: type as AutomationTrigger["type"] }); markDirty(); }}
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

                {trigger.type === "time_in_column" && (
                  <div className="mt-2">
                    <Label className="text-[10px]">Horas na coluna</Label>
                    <Input
                      type="number"
                      value={(trigger.config?.hours as number) ?? 24}
                      onChange={(e) => { setTrigger({ ...trigger, config: { hours: Number(e.target.value) } }); markDirty(); }}
                      className="h-7 text-xs mt-1 w-24"
                      min={1}
                    />
                  </div>
                )}
              </div>

              {/* Ações */}
              <div className="space-y-2">
                <Label className="text-[10px] text-primary uppercase font-bold flex items-center gap-1">
                  <Plus className="h-3 w-3" /> Ações ({actions.length})
                </Label>

                {actions.map((action, idx) => (
                  <div key={idx} className="border border-primary/30 bg-primary/5 rounded-xl p-3 flex gap-2 items-start">
                    <div className="flex-1 space-y-2">
                      <Select
                        value={action.type}
                        onValueChange={(type) => updateAction(idx, { ...action, type: type as AutomationAction["type"], config: {} })}
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

                      {(action.type === "add_tag" || action.type === "remove_tag") && (
                        <Input
                          value={(action.config?.tag as string) || ""}
                          onChange={(e) => updateAction(idx, { ...action, config: { tag: e.target.value } })}
                          placeholder={action.type === "add_tag" ? "Tag para adicionar" : "Tag para remover"}
                          className="h-7 text-xs"
                        />
                      )}

                      {action.type === "move_column" && (
                        <Select
                          value={(action.config?.column as string) || ""}
                          onValueChange={(val) => updateAction(idx, { ...action, config: { column: val } })}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="Coluna destino" />
                          </SelectTrigger>
                          <SelectContent>
                            {columns
                              .filter(c => pipelineId === "none" || c.pipeline_id === pipelineId)
                              .map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}

                      {action.type === "create_task" && (
                        <Input
                          value={(action.config?.title as string) || ""}
                          onChange={(e) => updateAction(idx, { ...action, config: { title: e.target.value } })}
                          placeholder="Título da tarefa"
                          className="h-7 text-xs"
                        />
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => removeAction(idx)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-[10px] h-7 border-dashed"
                  onClick={addAction}
                >
                  <Plus className="h-3 w-3 mr-1" /> Adicionar Ação
                </Button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">Cancelar</Button>
            <Button size="sm" onClick={handleSave} disabled={!dirty} className="text-xs gap-1">
              <Save className="h-3 w-3" /> Salvar Alterações
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
