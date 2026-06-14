import { useState, FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Instagram, Plus, Trash2, Pencil, MessageCircle, AtSign, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { untypedFrom } from "@/lib/supabase-untyped";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";

type TriggerType = "comment" | "story_mention" | "mention";
type MatchMode = "exact" | "contains" | "starts_with" | "any";
type ReplyType = "dm" | "public_comment_reply";

interface Rule {
  id: string;
  client_id: string;
  name: string;
  trigger_type: TriggerType;
  keyword: string | null;
  match_mode: MatchMode;
  reply_type: ReplyType;
  reply_text: string;
  per_user_cooldown_hours: number;
  active: boolean;
  created_at: string;
}

const triggerLabel: Record<TriggerType, string> = {
  comment: "Comentário em post",
  story_mention: "Menção em story",
  mention: "Menção em post/comentário",
};

const triggerIcon: Record<TriggerType, typeof MessageCircle> = {
  comment: MessageCircle,
  story_mention: BookOpen,
  mention: AtSign,
};

const matchModeLabel: Record<MatchMode, string> = {
  contains: "Contém",
  exact: "Igual exato",
  starts_with: "Começa com",
  any: "Qualquer texto",
};

const replyTypeLabel: Record<ReplyType, string> = {
  dm: "DM privada",
  public_comment_reply: "Resposta pública no comentário",
};

interface FormState {
  name: string;
  trigger_type: TriggerType;
  keyword: string;
  match_mode: MatchMode;
  reply_type: ReplyType;
  reply_text: string;
  per_user_cooldown_hours: number;
  active: boolean;
}

const DEFAULT_FORM: FormState = {
  name: "",
  trigger_type: "comment",
  keyword: "",
  match_mode: "contains",
  reply_type: "dm",
  reply_text: "",
  per_user_cooldown_hours: 24,
  active: true,
};

export function InstagramFunnelsTab() {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const clientId = tenant?.id ?? user?.client_id ?? null;
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState<Rule | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  const { data: rules = [], isLoading } = useQuery<Rule[]>({
    queryKey: ["instagram-rules", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await untypedFrom("instagram_auto_replies")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Rule[];
    },
    enabled: !!clientId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error("Tenant não identificado.");
      if (!form.name.trim()) throw new Error("Nome obrigatório.");
      if (!form.reply_text.trim()) throw new Error("Resposta obrigatória.");
      const payload = {
        client_id: clientId,
        tenant_id: tenant?.id ?? null,
        name: form.name.trim(),
        trigger_type: form.trigger_type,
        keyword: form.trigger_type === "comment" && form.match_mode !== "any"
          ? form.keyword.trim() || null
          : null,
        match_mode: form.trigger_type === "comment" ? form.match_mode : "any",
        reply_type: form.reply_type,
        reply_text: form.reply_text.trim(),
        per_user_cooldown_hours: form.per_user_cooldown_hours,
        active: form.active,
      };
      if (editing) {
        const { error } = await untypedFrom("instagram_auto_replies")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await untypedFrom("instagram_auto_replies").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Regra atualizada." : "Regra criada.");
      setDialogOpen(false);
      setEditing(null);
      setForm(DEFAULT_FORM);
      queryClient.invalidateQueries({ queryKey: ["instagram-rules", clientId] });
    },
    onError: (err: any) => toast.error(err?.message ?? "Erro ao salvar regra"),
  });

  const toggleActive = async (rule: Rule) => {
    const { error } = await untypedFrom("instagram_auto_replies")
      .update({ active: !rule.active })
      .eq("id", rule.id);
    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["instagram-rules", clientId] });
  };

  const deleteRule = async (rule: Rule) => {
    if (!confirm(`Excluir a regra "${rule.name}"?`)) return;
    const { error } = await untypedFrom("instagram_auto_replies").delete().eq("id", rule.id);
    if (error) {
      toast.error("Erro ao excluir");
      return;
    }
    toast.success("Regra excluída");
    queryClient.invalidateQueries({ queryKey: ["instagram-rules", clientId] });
  };

  const openCreate = () => {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setDialogOpen(true);
  };

  const openEdit = (rule: Rule) => {
    setEditing(rule);
    setForm({
      name: rule.name,
      trigger_type: rule.trigger_type,
      keyword: rule.keyword ?? "",
      match_mode: rule.match_mode,
      reply_type: rule.reply_type,
      reply_text: rule.reply_text,
      per_user_cooldown_hours: rule.per_user_cooldown_hours,
      active: rule.active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Instagram className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Funis Instagram</h3>
            <p className="text-xs text-muted-foreground">
              Respostas automáticas em comentários, menções e replies de story.
            </p>
          </div>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1">
          <Plus className="h-3.5 w-3.5" /> Nova regra
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando regras…</div>
      ) : rules.length === 0 ? (
        <div className="bg-card ghost-border rounded-xl p-10 text-center space-y-2">
          <p className="text-sm font-semibold">Nenhum funil ativo</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Crie sua primeira regra: responda quem comenta uma palavra-chave nos seus posts, agradeça menções em story, ou tague @ menções no feed.
          </p>
          <Button onClick={openCreate} size="sm" variant="outline" className="mt-3 gap-1">
            <Plus className="h-3.5 w-3.5" /> Criar primeira regra
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => {
            const Icon = triggerIcon[rule.trigger_type];
            return (
              <div key={rule.id} className="bg-card ghost-border rounded-xl p-4 flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-foreground/70" />
                </div>
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-foreground">{rule.name}</h4>
                    {!rule.active && (
                      <Badge variant="outline" className="text-[10px]">Inativa</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <strong>Quando:</strong> {triggerLabel[rule.trigger_type]}
                    {rule.trigger_type === "comment" && rule.keyword
                      ? ` (${matchModeLabel[rule.match_mode]} “${rule.keyword}”)`
                      : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Ação:</strong> {replyTypeLabel[rule.reply_type]} — {" "}
                    <span className="italic">“{rule.reply_text.slice(0, 80)}{rule.reply_text.length > 80 ? "…" : ""}”</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={rule.active} onCheckedChange={() => toggleActive(rule)} />
                  <Button variant="ghost" size="icon" onClick={() => openEdit(rule)} aria-label="Editar regra">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteRule(rule)} aria-label="Excluir regra">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-5">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar regra" : "Nova regra Instagram"}</DialogTitle>
              <DialogDescription>
                Defina o gatilho e o que o bot vai responder automaticamente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1">
              <Label htmlFor="rule-name" className="text-xs uppercase tracking-wider text-muted-foreground">Nome</Label>
              <Input
                id="rule-name" autoFocus
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Auto-DM quem comenta 'INFO'"
                maxLength={80}
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Gatilho</Label>
              <Select
                value={form.trigger_type}
                onValueChange={(v) => setForm({ ...form, trigger_type: v as TriggerType })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="comment">Comentário em post</SelectItem>
                  <SelectItem value="story_mention">Menção em story</SelectItem>
                  <SelectItem value="mention">Menção em post/comentário</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.trigger_type === "comment" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Modo</Label>
                    <Select
                      value={form.match_mode}
                      onValueChange={(v) => setForm({ ...form, match_mode: v as MatchMode })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contains">Contém</SelectItem>
                        <SelectItem value="exact">Igual exato</SelectItem>
                        <SelectItem value="starts_with">Começa com</SelectItem>
                        <SelectItem value="any">Qualquer texto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="rule-keyword" className="text-xs uppercase tracking-wider text-muted-foreground">Palavra-chave</Label>
                    <Input
                      id="rule-keyword"
                      value={form.keyword}
                      onChange={(e) => setForm({ ...form, keyword: e.target.value })}
                      placeholder={form.match_mode === "any" ? "(não usado)" : "ex: INFO"}
                      disabled={form.match_mode === "any"}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Ação</Label>
              <Select
                value={form.reply_type}
                onValueChange={(v) => setForm({ ...form, reply_type: v as ReplyType })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dm">DM privada para quem disparou</SelectItem>
                  {form.trigger_type === "comment" && (
                    <SelectItem value="public_comment_reply">Resposta pública no comentário</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {form.reply_type === "dm" && form.trigger_type === "comment" && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Meta permite DM por comentário só por 7 dias e 1× por comentário.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="rule-reply" className="text-xs uppercase tracking-wider text-muted-foreground">Texto da resposta</Label>
              <Textarea
                id="rule-reply"
                value={form.reply_text}
                onChange={(e) => setForm({ ...form, reply_text: e.target.value })}
                placeholder="Olá! Obrigado pelo interesse 🎯 Clica aqui pra saber mais: ..."
                rows={4}
                maxLength={1000}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3 items-end">
              <div className="space-y-1">
                <Label htmlFor="rule-cooldown" className="text-xs uppercase tracking-wider text-muted-foreground">
                  Cooldown por usuário (h)
                </Label>
                <Input
                  id="rule-cooldown"
                  type="number"
                  min={0}
                  max={720}
                  value={form.per_user_cooldown_hours}
                  onChange={(e) => setForm({ ...form, per_user_cooldown_hours: Math.max(0, parseInt(e.target.value) || 0) })}
                />
                <p className="text-[10px] text-muted-foreground">0 = ilimitado. Evita responder o mesmo user várias vezes.</p>
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Switch
                  id="rule-active"
                  checked={form.active}
                  onCheckedChange={(v) => setForm({ ...form, active: v })}
                />
                <Label htmlFor="rule-active" className="text-xs cursor-pointer">Ativa</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} disabled={saveMutation.isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending || !form.name.trim() || !form.reply_text.trim()}>
                {saveMutation.isPending ? "Salvando..." : editing ? "Salvar" : "Criar regra"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
