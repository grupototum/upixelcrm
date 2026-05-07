import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Loader2, FileText, Zap, X, Check } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCannedResponses, type CannedResponse, type TemplateCategory } from "@/hooks/useCannedResponses";

interface TemplatesManagerModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface FormState {
  id?: string;
  title: string;
  content: string;
  short_code: string;
  category: TemplateCategory;
}

const emptyForm: FormState = {
  title: "",
  content: "",
  short_code: "",
  category: "template",
};

export function TemplatesManagerModal({ open, onOpenChange }: TemplatesManagerModalProps) {
  const { responses, loading, create, update, remove } = useCannedResponses();
  const [activeTab, setActiveTab] = useState<TemplateCategory>("template");
  const [editing, setEditing] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setEditing(null);
      setActiveTab("template");
    }
  }, [open]);

  const filteredItems = responses.filter((r) => r.category === activeTab);

  const startCreate = (category: TemplateCategory) => {
    setEditing({ ...emptyForm, category });
  };

  const startEdit = (item: CannedResponse) => {
    setEditing({
      id: item.id,
      title: item.title,
      content: item.content,
      short_code: item.short_code ?? "",
      category: item.category,
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.title.trim() || !editing.content.trim()) return;
    if (editing.category === "quick_reply" && !editing.short_code.trim()) {
      return;
    }

    setSaving(true);
    let ok = false;
    if (editing.id) {
      ok = await update(editing.id, {
        title: editing.title.trim(),
        content: editing.content.trim(),
        short_code: editing.short_code.trim() || null,
        category: editing.category,
      });
    } else {
      ok = await create({
        title: editing.title.trim(),
        content: editing.content.trim(),
        short_code: editing.short_code.trim() || null,
        category: editing.category,
      });
    }
    setSaving(false);
    if (ok) setEditing(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este template?")) return;
    await remove(id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Gerenciar Templates e Respostas Rápidas
          </DialogTitle>
        </DialogHeader>

        {editing ? (
          <div className="flex-1 overflow-auto space-y-3 px-1">
            <div className="bg-muted/30 rounded-lg p-3 space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold flex-1">
                  {editing.id ? "Editar" : "Novo"}{" "}
                  {editing.category === "quick_reply" ? "Resposta Rápida" : "Template"}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setEditing(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Tipo</Label>
                <Select
                  value={editing.category}
                  onValueChange={(v) =>
                    setEditing({ ...editing, category: v as TemplateCategory })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="template" className="text-xs">
                      Template (botão de modelos)
                    </SelectItem>
                    <SelectItem value="quick_reply" className="text-xs">
                      Resposta Rápida (acionada por /)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Título *</Label>
                <Input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="Ex: Saudação inicial"
                  className="h-9 text-sm"
                />
              </div>

              {editing.category === "quick_reply" && (
                <div className="space-y-2">
                  <Label className="text-xs">
                    Atalho * <span className="text-muted-foreground">(será usado como /atalho)</span>
                  </Label>
                  <Input
                    value={editing.short_code}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        short_code: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
                      })
                    }
                    placeholder="ex: ola, obrigado, preco"
                    className="h-9 text-sm font-mono"
                    maxLength={20}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs">
                  Conteúdo *{" "}
                  <span className="text-muted-foreground">
                    (use {"{{lead.name}}"} para personalizar)
                  </span>
                </Label>
                <Textarea
                  value={editing.content}
                  onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                  placeholder="Olá {{lead.name}}, tudo bem?"
                  className="text-sm min-h-[120px]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={handleSave}
                  disabled={
                    saving ||
                    !editing.title.trim() ||
                    !editing.content.trim() ||
                    (editing.category === "quick_reply" && !editing.short_code.trim())
                  }
                >
                  {saving ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                  {editing.id ? "Salvar alterações" : "Criar"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  onClick={() => setEditing(null)}
                  disabled={saving}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TemplateCategory)} className="flex-1 flex flex-col min-h-0">
            <TabsList className="bg-secondary w-full justify-start">
              <TabsTrigger value="template" className="text-xs gap-1.5">
                <FileText className="h-3 w-3" /> Templates
                <Badge variant="outline" className="text-[9px] ml-1">
                  {responses.filter((r) => r.category === "template").length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="quick_reply" className="text-xs gap-1.5">
                <Zap className="h-3 w-3" /> Respostas Rápidas
                <Badge variant="outline" className="text-[9px] ml-1">
                  {responses.filter((r) => r.category === "quick_reply").length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="flex-1 overflow-auto mt-3 space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-muted-foreground mb-3">
                    {activeTab === "quick_reply"
                      ? "Nenhuma resposta rápida cadastrada."
                      : "Nenhum template cadastrado."}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs gap-1.5"
                    onClick={() => startCreate(activeTab)}
                  >
                    <Plus className="h-3 w-3" />
                    Criar primeira{activeTab === "quick_reply" ? " resposta" : ""}
                  </Button>
                </div>
              ) : (
                <>
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-card ghost-border rounded-lg p-3 hover:border-[hsl(var(--border-strong))] transition-colors group"
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {item.short_code && (
                              <Badge variant="outline" className="text-[10px] font-mono text-primary">
                                /{item.short_code}
                              </Badge>
                            )}
                            <span className="text-xs font-semibold truncate">{item.title}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2">
                            {item.content}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => startEdit(item)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs gap-1.5 w-full mt-3"
                    onClick={() => startCreate(activeTab)}
                  >
                    <Plus className="h-3 w-3" />
                    Adicionar {activeTab === "quick_reply" ? "resposta rápida" : "template"}
                  </Button>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}

        {!editing && (
          <DialogFooter className="border-t pt-3 mt-3">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
