import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppState } from "@/contexts/AppContext";
import { Tag, Plus, X, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CreateTagModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTagModal({ open, onOpenChange }: CreateTagModalProps) {
  const { globalTags, addGlobalTag, deleteGlobalTag } = useAppState();
  const [tagName, setTagName] = useState("");

  const handleCreate = async () => {
    if (!tagName.trim()) return;
    await addGlobalTag(tagName);
    setTagName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-card ghost-border bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Tag className="h-5 w-5 text-primary" />
            </div>
            Gerenciador de Tags
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Criar Nova Tag</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  placeholder="Ex: VIP, Black Friday..."
                  className="pl-10 rounded-card ghost-border bg-secondary/10 h-12 text-sm focus:ring-primary"
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={!tagName.trim()}
                className="rounded-card h-12 px-6 bg-primary hover:bg-[#e04400] shadow-lg"
              >
                <Plus className="h-5 w-5 mr-2" /> Criar
              </Button>
            </div>
          </div>

          <Separator className="bg-border/20" />

          <div className="space-y-4">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Tags Disponíveis ({globalTags.length})</Label>
            <div className="flex flex-wrap gap-2 p-4 rounded-card border border-dashed border-[hsl(var(--border-strong))] bg-card min-h-[100px] overflow-y-auto max-h-[200px]">
              {globalTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="px-4 py-2 rounded-xl text-xs gap-3 bg-secondary/30 border-none group hover:bg-destructive/10 transition-all cursor-default"
                >
                  <span className="font-medium text-foreground">{tag}</span>
                  <button
                    onClick={() => deleteGlobalTag(tag)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </Badge>
              ))}
              {globalTags.length === 0 && (
                <div className="flex flex-col items-center justify-center w-full py-4 text-muted-foreground opacity-50">
                  <Tag className="h-8 w-8 mb-2 stroke-1" />
                  <p className="text-[10px] italic">Nenhuma tag cadastrada ainda</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-center">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-card h-11 w-full text-xs font-bold hover:bg-secondary/50 transition-all">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Separator({ className }: { className?: string }) {
  return <div className={`h-[1px] w-full ${className}`} />;
}
