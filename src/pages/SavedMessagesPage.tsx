import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search, MessageSquareReply } from "lucide-react";
import { toast } from "sonner";
import { useCannedResponses, type CannedResponse, type TemplateCategory } from "@/hooks/useCannedResponses";

interface EditorState {
  id?: string;
  title: string;
  short_code: string;
  content: string;
  category: TemplateCategory;
}

const emptyEditor: EditorState = {
  title: "",
  short_code: "",
  content: "",
  category: "quick_reply",
};

export default function SavedMessagesPage() {
  const { responses, loading, create, update, remove } = useCannedResponses();
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<CannedResponse | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return responses;
    const q = query.toLowerCase();
    return responses.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.short_code ?? "").toLowerCase().includes(q) ||
        r.content.toLowerCase().includes(q),
    );
  }, [responses, query]);

  function openNew() {
    setEditor({ ...emptyEditor });
  }

  function openEdit(r: CannedResponse) {
    setEditor({
      id: r.id,
      title: r.title,
      short_code: r.short_code ?? "",
      content: r.content,
      category: r.category,
    });
  }

  async function handleSave() {
    if (!editor) return;
    const title = editor.title.trim();
    const content = editor.content.trim();
    if (!title) { toast.error("Informe um título"); return; }
    if (!content) { toast.error("Informe o conteúdo da mensagem"); return; }

    setSaving(true);
    const payload = {
      title,
      content,
      short_code: editor.short_code.trim().replace(/^\/+/, "") || null,
      category: editor.category,
    };
    const ok = editor.id
      ? await update(editor.id, payload)
      : await create(payload);
    setSaving(false);
    if (ok) setEditor(null);
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    const ok = await remove(confirmDelete.id);
    if (ok) setConfirmDelete(null);
  }

  return (
    <AppLayout
      title="Mensagens Salvas"
      subtitle="Atalhos de texto pro inbox — digite '/' no chat e selecione um modelo"
    >
      <div className="p-6 max-w-5xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por título, atalho ou conteúdo…"
              className="pl-9 h-9 text-xs"
            />
          </div>
          <Button size="sm" onClick={openNew} className="gap-1 text-xs">
            <Plus className="h-3.5 w-3.5" /> Nova mensagem
          </Button>
        </div>

        {loading ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center text-sm text-muted-foreground">
            Carregando…
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center space-y-3">
            <MessageSquareReply className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              {query ? "Nada encontrado." : "Nenhuma mensagem salva ainda."}
            </p>
            {!query && (
              <Button size="sm" onClick={openNew} className="gap-1 text-xs">
                <Plus className="h-3.5 w-3.5" /> Criar primeira mensagem
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Título</th>
                  <th className="text-left px-4 py-2 font-medium">Atalho</th>
                  <th className="text-left px-4 py-2 font-medium">Categoria</th>
                  <th className="text-left px-4 py-2 font-medium">Conteúdo</th>
                  <th className="w-24 px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2 font-medium text-xs">{r.title}</td>
                    <td className="px-4 py-2">
                      {r.short_code ? (
                        <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded">/{r.short_code}</code>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {r.category === "quick_reply" ? "Resposta rápida" : "Template"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground max-w-md truncate">
                      {r.content.slice(0, 120)}{r.content.length > 120 ? "…" : ""}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setConfirmDelete(r)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Editor (criar/editar) */}
      <Dialog open={editor !== null} onOpenChange={(open) => !open && setEditor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {editor?.id ? "Editar mensagem salva" : "Nova mensagem salva"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              O atalho ficará disponível digitando "/atalho" no campo de texto do inbox.
            </DialogDescription>
          </DialogHeader>

          {editor && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Título</Label>
                <Input
                  value={editor.title}
                  onChange={(e) => setEditor({ ...editor, title: e.target.value })}
                  placeholder="Ex: Saudação inicial"
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Atalho (opcional)</Label>
                  <div className="flex items-center">
                    <span className="text-xs text-muted-foreground mr-1">/</span>
                    <Input
                      value={editor.short_code}
                      onChange={(e) => setEditor({ ...editor, short_code: e.target.value.replace(/\s+/g, "-").toLowerCase() })}
                      placeholder="ola"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Categoria</Label>
                  <Select
                    value={editor.category}
                    onValueChange={(v) => setEditor({ ...editor, category: v as TemplateCategory })}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quick_reply" className="text-xs">Resposta rápida</SelectItem>
                      <SelectItem value="template" className="text-xs">Template</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Conteúdo</Label>
                <Textarea
                  value={editor.content}
                  onChange={(e) => setEditor({ ...editor, content: e.target.value })}
                  placeholder="Mensagem completa que será inserida no chat"
                  className="text-xs min-h-[120px] resize-none"
                />
                <p className="text-[10px] text-muted-foreground">
                  Variáveis suportadas: <code className="bg-muted px-1 rounded">{`{{lead.name}}`}</code>{" "}
                  <code className="bg-muted px-1 rounded">{`{{lead.phone}}`}</code>
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditor(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <Dialog open={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Excluir mensagem?</DialogTitle>
            <DialogDescription className="text-xs">
              "{confirmDelete?.title}" será removido permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
