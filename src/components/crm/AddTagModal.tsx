import { useState, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppState } from "@/contexts/AppContext";
import { Tag, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AddTagModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
}

export function AddTagModal({ open, onOpenChange, leadId }: AddTagModalProps) {
  const { leads, updateLead, globalTags } = useAppState();
  const [newTag, setNewTag] = useState("");
  const [loading, setLoading] = useState(false);

  const lead = leads.find(l => l.id === leadId);
  const currentTags = lead?.tags || [];

  const handleAddTag = useCallback(async (tag: string) => {
    if (!tag.trim() || currentTags.includes(tag)) return;
    setLoading(true);
    try {
      await updateLead(leadId, { tags: [...currentTags, tag.trim()] });
      setNewTag("");
    } finally {
      setLoading(false);
    }
  }, [leadId, currentTags, updateLead]);

  const handleRemoveTag = useCallback(async (tag: string) => {
    setLoading(true);
    try {
      await updateLead(leadId, { tags: currentTags.filter(t => t !== tag) });
    } finally {
      setLoading(false);
    }
  }, [leadId, currentTags, updateLead]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            Gerenciar Tags
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground pl-1">
              Nova Tag para {lead?.name}
            </Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Ex: Urgente, Proposta enviada..."
                className="rounded-xl ghost-border h-11 text-sm bg-secondary/10"
                onKeyDown={(e) => e.key === "Enter" && handleAddTag(newTag)}
              />
              <Button
                size="icon"
                onClick={() => handleAddTag(newTag)}
                disabled={!newTag.trim() || currentTags.includes(newTag) || loading}
                className="rounded-xl h-11 w-11 shrink-0 bg-primary hover:bg-[#e04400] shadow-lg"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground pl-1">
              Tags Atuais ({currentTags.length})
            </Label>
            <div className="flex flex-wrap gap-2 min-h-[60px] p-4 rounded-xl border border-dashed border-[hsl(var(--border-strong))] bg-card">
              {currentTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="px-3 py-1.5 rounded-lg text-xs gap-2 bg-primary/10 border-[hsl(var(--border-strong))] text-primary-foreground group"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    disabled={loading}
                    className="hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {currentTags.length === 0 && (
                <p className="text-[11px] text-muted-foreground italic flex items-center justify-center w-full">Nenhuma tag cadastrada</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground pl-1">
              Tags Sugeridas
            </Label>
            <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-secondary/5 min-h-[40px]">
              {globalTags.filter(t => !currentTags.includes(t)).map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleAddTag(tag)}
                  className="px-2.5 py-1 rounded-md text-[10px] font-medium bg-card border border-[hsl(var(--border-strong))] hover:bg-primary/10 hover:border-[hsl(var(--border-strong))] transition-all text-muted-foreground hover:text-primary"
                >
                  + {tag}
                </button>
              ))}
              {globalTags.filter(t => !currentTags.includes(t)).length === 0 && (
                <p className="text-[10px] text-muted-foreground italic flex items-center justify-center w-full">Sem sugestões</p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter className="mt-8">
          <Button onClick={() => onOpenChange(false)} className="rounded-xl text-xs h-11 w-full border-none bg-secondary hover:bg-secondary/80">
            Concluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
