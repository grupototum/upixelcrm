import { logger } from "@/lib/logger";
import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Webhook, Plus, Trash2, Edit2, ShieldAlert, Eye, EyeOff, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateSecureToken } from "@/lib/crypto";
import type { WebhookEndpoint } from "@/types";

const AVAILABLE_EVENTS = [
  { id: "lead.created", name: "Lead Criado" },
  { id: "lead.updated", name: "Lead Atualizado" },
  { id: "lead.stage_changed", name: "Mudança de Etapa" },
  { id: "message.received", name: "Mensagem Recebida" },
  { id: "task.completed", name: "Tarefa Concluída" },
];

export function WebhookSettingsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showSecretId, setShowSecretId] = useState<string | null>(null);

  // Form State
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [active, setActive] = useState(true);

  const fetchWebhooks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("webhook_endpoints").select("*").order("created_at", { ascending: false });
    if (error) {
      logger.error(error);
      toast.error("Erro ao carregar webhooks");
    } else {
      setWebhooks(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) fetchWebhooks();
  }, [open, fetchWebhooks]);

  const resetForm = () => {
    setUrl("");
    setDescription("");
    setEvents([]);
    setActive(true);
    setEditingId(null);
  };

  const handleOpenNew = () => {
    resetForm();
    setEditingId("new");
  };

  const handleEdit = (wh: WebhookEndpoint) => {
    setUrl(wh.url);
    setDescription(wh.description || "");
    setEvents([...wh.events]);
    setActive(wh.active);
    setEditingId(wh.id);
  };

  const handleSave = async () => {
    if (!url.startsWith("https://")) {
      toast.error("A URL do Webhook deve usar HTTPS.");
      return;
    }
    if (events.length === 0) {
      toast.error("Selecione ao menos um evento.");
      return;
    }

    if (editingId === "new") {
      // FIX-02: Use crypto.getRandomValues() for webhook secret generation.
      // Math.random() is not cryptographically random and makes secrets predictable.
      const secret = generateSecureToken("wh_sec_", 24);
      const { data: row, error } = await supabase.from("webhook_endpoints").insert({
        url,
        description,
        events,
        active,
        secret,
      }).select().single();

      if (error) {
        logger.error(error);
        toast.error("Erro ao criar webhook.");
        return;
      }
      setWebhooks(prev => [row, ...prev]);
      toast.success("Webhook criado com sucesso.");
    } else {
      const { error } = await supabase.from("webhook_endpoints")
        .update({ url, description, events, active })
        .eq("id", editingId);

      if (error) {
        logger.error(error);
        toast.error("Erro ao atualizar webhook.");
        return;
      }
      setWebhooks(webhooks.map(wh => wh.id === editingId ? { ...wh, url, description, events, active } : wh));
      toast.success("Webhook atualizado.");
    }
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este webhook?")) return;
    const { error } = await supabase.from("webhook_endpoints").delete().eq("id", id);
    if (error) {
      logger.error(error);
      toast.error("Erro ao remover webhook.");
      return;
    }
    setWebhooks(webhooks.filter(w => w.id !== id));
    toast.success("Webhook removido.");
  };

  const toggleEvent = (eventId: string) => {
    setEvents(prev => prev.includes(eventId) ? prev.filter(e => e !== eventId) : [...prev, eventId]);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if(!v) resetForm(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-accent" /> Gerenciar Webhooks
          </DialogTitle>
          <DialogDescription>
            Receba notificações em tempo real sobre eventos ocorridos no seu CRM.
          </DialogDescription>
        </DialogHeader>

        {editingId ? (
          <div className="space-y-4 py-2 border border-border rounded-lg bg-secondary/10 p-4">
            <div className="flex items-center justify-between mb-2 border-b border-border pb-2">
              <h3 className="text-sm font-semibold">{editingId === "new" ? "Novo Webhook Endpoint" : "Editar Endpoint"}</h3>
              <div className="flex items-center gap-2">
                <Switch checked={active} onCheckedChange={setActive} />
                <span className="text-xs text-muted-foreground">{active ? "Ativo" : "Inativo"}</span>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Endpoint URL (HTTPS obrigatório)</Label>
                <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://seudominio.com/api/webhooks" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Descrição (Opcional)</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Sincronização via Zapier" />
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <Label className="text-xs">Eventos Assinados ({events.length})</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {AVAILABLE_EVENTS.map(ev => (
                  <label key={ev.id} className="flex items-center justify-between p-2 rounded-md border border-border bg-card cursor-pointer hover:bg-card-hover">
                    <span className="text-xs font-medium text-foreground">{ev.name} <span className="text-[10px] text-muted-foreground block">{ev.id}</span></span>
                    <Switch checked={events.includes(ev.id)} onCheckedChange={() => toggleEvent(ev.id)} />
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
              <Button variant="outline" onClick={resetForm}>Cancelar</Button>
              <Button onClick={handleSave}>Salvar Webhook</Button>
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center bg-card mb-2">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Endpoints ({webhooks.length})</h3>
              <Button size="sm" variant="secondary" onClick={handleOpenNew} className="h-8 gap-1"><Plus className="h-3.5 w-3.5" /> Adicionar Endpoint</Button>
            </div>

            <div className="divide-y divide-border border border-border bg-card rounded-lg overflow-hidden max-h-80 overflow-y-auto">
              {webhooks.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground text-center">Nenhum webhook configurado no momento.</p>
              ) : (
                webhooks.map((wh) => (
                  <div key={wh.id} className={`p-4 transition-colors ${!wh.active && 'opacity-60'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={wh.active ? "border-success/30 text-success" : ""}>{wh.active ? "Ativo" : "Inativo"}</Badge>
                          <span className="text-sm font-semibold truncate max-w-sm">{wh.url}</span>
                        </div>
                        {wh.description && <p className="text-xs text-muted-foreground mt-1">{wh.description}</p>}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(wh)} className="h-8 w-8 text-muted-foreground hover:text-primary"><Edit2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(wh.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap mb-3 mt-3">
                      {wh.events.map(ev => <Badge key={ev} variant="secondary" className="text-[10px]">{ev}</Badge>)}
                    </div>

                    <div className="flex items-center gap-2 mt-2 bg-secondary/50 p-2 rounded-md">
                      <ShieldAlert className="h-4 w-4 text-warning shrink-0" />
                      <div className="flex-1">
                        <p className="text-[10px] font-semibold">Signing Secret</p>
                        <code className="text-[10px] text-muted-foreground">{showSecretId === wh.id ? wh.secret : "wh_sec_••••••••••••••••••••••••"}</code>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowSecretId(showSecretId === wh.id ? null : wh.id)}>
                        {showSecretId === wh.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
