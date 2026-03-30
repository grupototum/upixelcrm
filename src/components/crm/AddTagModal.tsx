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
  const { leads, updateLead } = useAppState();
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
                className="rounded-xl h-11 w-11 shrink-0 bg-primary hover:bg-primary-hover shadow-lg neon-glow"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground pl-1">
              Tags Atuais ({currentTags.length})
            </Label>
            <div className="flex flex-wrap gap-2 min-h-[60px] p-4 rounded-xl border border-dashed border-border/40 bg-card/30">
              {currentTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="px-3 py-1.5 rounded-lg text-xs gap-2 bg-primary/10 border-primary/20 text-primary-foreground group"
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
