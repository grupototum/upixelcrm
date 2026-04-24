import { useState } from "react";
import { Plus, X, Tag, Trash2, Edit3, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { useTags } from "@/hooks/useTags";
import type { TagMeta } from "@/types";

const PRESET_COLORS = [
  "#6366f1", // indigo
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#d946ef", // fuchsia
  "#64748b", // slate
];

export function TagsManager() {
  const { tags, loading, createTag, updateTag, deleteTag } = useTags();
  const [open, setOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagMeta | null>(null);

  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [category, setCategory] = useState("general");

  const resetForm = () => {
    setName("");
    setColor(PRESET_COLORS[0]);
    setCategory("general");
    setEditingTag(null);
  };

  const handleOpenEdit = (tag: TagMeta) => {
    setEditingTag(tag);
    setName(tag.name);
    setColor(tag.color);
    setCategory(tag.category || "general");
    setOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    if (editingTag) {
      await updateTag(editingTag.id, {
        name: name.trim(),
        color,
        category,
      });
    } else {
      await createTag({
        name: name.trim(),
        color,
        category,
      });
    }
    setOpen(false);
    resetForm();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Gerenciar Tags</h3>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 gap-1.5 text-xs">
              <Plus className="h-3 w-3" /> Nova Tag
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[350px]">
            <DialogHeader>
              <DialogTitle>{editingTag ? "Editar Tag" : "Nova Tag"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs">Nome da Tag *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: VIP" className="h-9" />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs">Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Geral</SelectItem>
                    <SelectItem value="status">Status / Situação</SelectItem>
                    <SelectItem value="priority">Prioridade</SelectItem>
                    <SelectItem value="source">Origem</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Cor</Label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-transform ${color === c ? "scale-110 border-foreground" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border flex justify-center">
                <Badge variant="outline" className="gap-1.5 px-3 py-1 text-sm font-medium" style={{ borderColor: color, color: color, backgroundColor: `${color}15` }}>
                  <Tag className="h-3.5 w-3.5" />
                  {name || "Preview"}
                </Badge>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={!name.trim()}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden flex flex-col">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-xs">Carregando tags...</div>
        ) : tags.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-xs">Nenhuma tag criada.</div>
        ) : (
          <div className="divide-y divide-border">
            {tags.map((tag) => (
              <div key={tag.id} className="p-3 flex items-center justify-between hover:bg-muted/20 transition-colors group">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="gap-1 px-2 py-0.5 text-xs font-medium" style={{ borderColor: tag.color, color: tag.color, backgroundColor: `${tag.color}10` }}>
                    <Tag className="h-3 w-3" />
                    {tag.name}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{tag.category}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEdit(tag)}>
                    <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                    if (confirm(`Tem certeza que deseja excluir a tag "${tag.name}"? Ela será removida de todos os leads.`)) {
                      deleteTag(tag.id);
                    }
                  }}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
