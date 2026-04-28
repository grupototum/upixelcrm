import { useState } from "react";
import {
  MessageSquare, FileText, Mic, Paperclip,
  Plus, ChevronDown, ChevronRight, Clock, MoreHorizontal,
  Trash2, Edit, Loader2, Check, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSequences, type SequenceStepType, type DelayUnit, type SequenceStep, type SequenceChannel } from "@/hooks/useSequences";

const stepTypeConfig: Record<SequenceStepType, { icon: typeof MessageSquare; label: string; color: string }> = {
  text: { icon: FileText, label: "Texto", color: "text-primary" },
  audio: { icon: Mic, label: "Áudio", color: "text-accent" },
  file: { icon: Paperclip, label: "Arquivo", color: "text-success" },
};

const delayUnitLabel: Record<DelayUnit, string> = {
  minutes: "min",
  hours: "h",
  days: "dias",
};

function formatDelay(step: SequenceStep): string {
  if (step.delay_value === 0) return "Imediato";
  return `${step.delay_value} ${delayUnitLabel[step.delay_unit]}`;
}

export function SequencesTab() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newChannel, setNewChannel] = useState<SequenceChannel>("whatsapp");
  const [newDescription, setNewDescription] = useState("");
  const [editingStep, setEditingStep] = useState<SequenceStep | null>(null);
  const [creating, setCreating] = useState(false);

  const {
    sequences, loading,
    createSequence, toggleActive, deleteSequence,
    addStep, updateStep, deleteStep,
  } = useSequences();

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const created = await createSequence({
      name: newName.trim(),
      channel: newChannel,
      description: newDescription.trim() || undefined,
    });
    setCreating(false);
    if (created) {
      setShowCreate(false);
      setNewName("");
      setNewDescription("");
      setNewChannel("whatsapp");
      setExpandedId(created.id);
    }
  };

  const handleAddStep = async (seqId: string) => {
    await addStep(seqId, { type: "text", content: "Nova mensagem...", delay_value: 1, delay_unit: "hours" });
  };

  const handleSaveStep = async (step: SequenceStep) => {
    await updateStep(step.id, {
      type: step.type,
      content: step.content,
      delay_value: step.delay_value,
      delay_unit: step.delay_unit,
    });
    setEditingStep(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {sequences.length} sequência{sequences.length !== 1 ? "s" : ""} cadastrada{sequences.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" className="text-xs gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="h-3 w-3" /> Nova Sequência
        </Button>
      </div>

      {sequences.length === 0 ? (
        <div className="bg-card ghost-border rounded-xl p-12 text-center">
          <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">Nenhuma sequência criada ainda.</p>
          <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => setShowCreate(true)}>
            <Plus className="h-3 w-3" /> Criar primeira sequência
          </Button>
        </div>
      ) : (
        sequences.map((seq) => {
          const isExpanded = expandedId === seq.id;
          return (
            <div key={seq.id} className="bg-card ghost-border rounded-xl overflow-hidden shadow-card hover:shadow-card-hover hover:border-border-hover transition-all duration-200">
              <button
                onClick={() => setExpandedId(isExpanded ? null : seq.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
              >
                <div className="h-9 w-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <MessageSquare className="h-4 w-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-foreground">{seq.name}</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {seq.steps.length} etapa{seq.steps.length !== 1 ? "s" : ""} · {seq.channel === "whatsapp" ? "WhatsApp" : "E-mail"}
                    {seq.enrollment_count > 0 && ` · ${seq.enrollment_count} matriculados`}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden sm:flex items-center gap-1">
                    {(["text", "audio", "file"] as SequenceStepType[]).map((type) => {
                      const count = seq.steps.filter((s) => s.type === type).length;
                      if (count === 0) return null;
                      const cfg = stepTypeConfig[type];
                      const Icon = cfg.icon;
                      return (
                        <Badge key={type} variant="outline" className="text-[10px] gap-1 px-1.5">
                          <Icon className={`h-2.5 w-2.5 ${cfg.color}`} />
                          {count}
                        </Badge>
                      );
                    })}
                  </div>
                  <Switch
                    checked={seq.active}
                    onCheckedChange={() => toggleActive(seq.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem
                        className="text-xs gap-2 text-destructive"
                        onClick={() => {
                          if (confirm(`Excluir sequência "${seq.name}"?`)) deleteSequence(seq.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="ghost-border border-t px-4 py-3 space-y-0">
                  {seq.steps.length === 0 && (
                    <p className="text-[11px] text-muted-foreground italic py-2">
                      Nenhuma etapa. Adicione mensagens com delays para construir a cadência.
                    </p>
                  )}
                  {seq.steps.map((step, i) => {
                    const cfg = stepTypeConfig[step.type];
                    const Icon = cfg.icon;
                    const isEditing = editingStep?.id === step.id;
                    return (
                      <div key={step.id} className="flex items-start gap-3 relative group">
                        <div className="flex flex-col items-center shrink-0 pt-1">
                          <div className="h-6 w-6 rounded-full border-2 border-border bg-card flex items-center justify-center z-10">
                            <Icon className={`h-3 w-3 ${cfg.color}`} />
                          </div>
                          {i < seq.steps.length - 1 && <div className="w-px h-8 bg-border" />}
                        </div>
                        <div className="flex-1 min-w-0 pb-3">
                          {isEditing ? (
                            <div className="space-y-2 bg-muted/30 rounded-lg p-3">
                              <div className="flex items-center gap-2">
                                <Select
                                  value={editingStep.type}
                                  onValueChange={(v) => setEditingStep({ ...editingStep, type: v as SequenceStepType })}
                                >
                                  <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="text" className="text-xs">Texto</SelectItem>
                                    <SelectItem value="audio" className="text-xs">Áudio</SelectItem>
                                    <SelectItem value="file" className="text-xs">Arquivo</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Input
                                  type="number"
                                  value={editingStep.delay_value}
                                  onChange={(e) => setEditingStep({ ...editingStep, delay_value: Number(e.target.value) })}
                                  className="h-7 text-xs w-20"
                                  min={0}
                                />
                                <Select
                                  value={editingStep.delay_unit}
                                  onValueChange={(v) => setEditingStep({ ...editingStep, delay_unit: v as DelayUnit })}
                                >
                                  <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="minutes" className="text-xs">minutos</SelectItem>
                                    <SelectItem value="hours" className="text-xs">horas</SelectItem>
                                    <SelectItem value="days" className="text-xs">dias</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <Textarea
                                value={editingStep.content}
                                onChange={(e) => setEditingStep({ ...editingStep, content: e.target.value })}
                                placeholder="Conteúdo da mensagem..."
                                className="text-xs min-h-[60px]"
                              />
                              <div className="flex items-center gap-2">
                                <Button size="sm" className="h-7 text-xs gap-1" onClick={() => handleSaveStep(editingStep)}>
                                  <Check className="h-3 w-3" /> Salvar
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setEditingStep(null)}>
                                  <X className="h-3 w-3" /> Cancelar
                                </Button>
                                <div className="flex-1" />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs gap-1 text-destructive"
                                  onClick={() => {
                                    deleteStep(step.id);
                                    setEditingStep(null);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" /> Excluir etapa
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 mb-0.5">
                                <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>
                                  {cfg.label}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                  <Clock className="h-2.5 w-2.5" /> {formatDelay(step)}
                                </span>
                                <button
                                  className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => setEditingStep(step)}
                                >
                                  <Edit className="h-3 w-3 text-muted-foreground hover:text-primary" />
                                </button>
                              </div>
                              <p className="text-xs text-foreground truncate">{step.content || <span className="italic text-muted-foreground">vazio</span>}</p>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-3 pt-1">
                    <div className="flex flex-col items-center shrink-0">
                      <div className="h-6 w-6 rounded-full border-2 border-dashed border-border bg-card flex items-center justify-center">
                        <Plus className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground h-7 px-2 gap-1"
                      onClick={() => handleAddStep(seq.id)}
                    >
                      <Plus className="h-3 w-3" /> Adicionar etapa
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Sequência de Mensagens</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nome *</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Boas-vindas WhatsApp"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Canal</Label>
              <Select value={newChannel} onValueChange={(v) => setNewChannel(v as SequenceChannel)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Descrição (opcional)</Label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Para que serve esta sequência?"
                className="mt-1 text-xs min-h-[60px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || creating}>
              {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Criar Sequência"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
