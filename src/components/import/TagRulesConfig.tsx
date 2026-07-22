import { useState } from "react";
import { Plus, Trash2, Wand2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  type TagRule, type TagRuleField, TAG_RULE_FIELD_LABELS, saveTagRules,
} from "@/utils/tagRules";

interface TagRulesConfigProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rules: TagRule[];
  onChange: (rules: TagRule[]) => void;
  clientId: string;
}

const FIELDS: TagRuleField[] = ["city", "company", "position", "origin", "name", "email"];

/**
 * F11 — Configuração de regras de tag automáticas.
 * "Se <campo> contém <texto> → adicionar tag <tag>". Persistidas por tenant
 * em localStorage. Aplicadas ANTES de inserir os leads na importação.
 */
export function TagRulesConfig({ open, onOpenChange, rules, onChange, clientId }: TagRulesConfigProps) {
  const [field, setField] = useState<TagRuleField>("city");
  const [contains, setContains] = useState("");
  const [tag, setTag] = useState("");

  const persist = (next: TagRule[]) => {
    onChange(next);
    if (clientId) saveTagRules(clientId, next);
  };

  const addRule = () => {
    const c = contains.trim();
    const t = tag.trim();
    if (!c || !t) {
      toast.error("Preencha o texto e a tag da regra.");
      return;
    }
    const rule: TagRule = { id: crypto.randomUUID(), field, contains: c, tag: t };
    persist([...rules, rule]);
    setContains("");
    setTag("");
  };

  const removeRule = (id: string) => persist(rules.filter((r) => r.id !== id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" /> Regras de tag automáticas
          </DialogTitle>
          <DialogDescription className="text-xs">
            Aplicadas automaticamente aos leads durante a importação. Ex.: se a
            <strong> Cidade</strong> contém "São Paulo" → adicionar tag "SP".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Regras existentes */}
          {rules.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-1">Nenhuma regra criada ainda.</p>
          ) : (
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {rules.map((r) => (
                <div key={r.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 text-xs">
                  <span className="text-muted-foreground shrink-0">Se</span>
                  <Badge variant="outline" className="text-[10px]">{TAG_RULE_FIELD_LABELS[r.field]}</Badge>
                  <span className="text-muted-foreground shrink-0">contém</span>
                  <span className="font-medium truncate">"{r.contains}"</span>
                  <span className="text-muted-foreground shrink-0">→</span>
                  <Badge className="text-[10px] shrink-0">{r.tag}</Badge>
                  <button
                    onClick={() => removeRule(r.id)}
                    className="ml-auto text-muted-foreground hover:text-destructive shrink-0"
                    aria-label="Remover regra"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Nova regra */}
          <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-end pt-2 border-t border-border">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Campo</Label>
              <Select value={field} onValueChange={(v) => setField(v as TagRuleField)}>
                <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FIELDS.map((f) => (
                    <SelectItem key={f} value={f} className="text-xs">{TAG_RULE_FIELD_LABELS[f]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Contém</Label>
              <Input value={contains} onChange={(e) => setContains(e.target.value)} placeholder="texto" className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Tag</Label>
              <Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="tag" className="h-8 text-xs" />
            </div>
            <Button size="sm" className="h-8 text-xs gap-1" onClick={addRule}>
              <Plus className="h-3 w-3" /> Add
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button size="sm" variant="outline" className="text-xs" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
