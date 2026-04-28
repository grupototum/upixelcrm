import { useState, useMemo, useEffect } from "react";
import {
  Send, MessageCircle, Clock, Calendar, Users, Search,
  Check, ArrowRight, Smartphone, Cloud, FileText, Sparkles,
  Filter, ChevronDown, X, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBroadcast, BroadcastRoute, Template, BroadcastLead } from "@/hooks/useBroadcast";
import { useAppState } from "@/contexts/AppContext";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { isValidUuid } from "@/lib/tenant-utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Step = "audience" | "channel" | "message" | "schedule" | "review";

export function BroadcastConfigModal() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const { credits, templates, calculateCost, sendBroadcastToLeads } = useBroadcast();
  const { leads, columns, pipelines } = useAppState();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("audience");

  // Step 1: Audience
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filterColumn, setFilterColumn] = useState<string>("all");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [filterOrigin, setFilterOrigin] = useState<string>("all");

  // Step 2: Channel
  const [route, setRoute] = useState<BroadcastRoute>("free");
  const [campaignName, setCampaignName] = useState("");

  // Step 3: Message
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [message, setMessage] = useState("");

  // Step 4: Schedule
  const [sendNow, setSendNow] = useState(true);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [delayMin, setDelayMin] = useState(3);
  const [delayMax, setDelayMax] = useState(8);

  // Loading
  const [submitting, setSubmitting] = useState(false);

  const clientId = tenant?.id ?? user?.client_id;

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("audience");
        setSelectedLeadIds([]);
        setSearch("");
        setFilterColumn("all");
        setFilterTag("all");
        setFilterOrigin("all");
        setRoute("free");
        setCampaignName("");
        setSelectedTemplate("");
        setMessage("");
        setSendNow(true);
        setScheduledDate("");
        setScheduledTime("");
        setDelayMin(3);
        setDelayMax(8);
      }, 200);
    }
  }, [open]);

  // Available origins/tags
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    leads.forEach(l => l.tags?.forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [leads]);

  const availableOrigins = useMemo(() => {
    const set = new Set<string>();
    leads.forEach(l => { if (l.origin) set.add(l.origin); });
    return Array.from(set).sort();
  }, [leads]);

  // Filtered leads with phone (only those that can receive)
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      if (!l.phone) return false;
      if (filterColumn !== "all" && l.column_id !== filterColumn) return false;
      if (filterTag !== "all" && !l.tags?.includes(filterTag)) return false;
      if (filterOrigin !== "all" && l.origin !== filterOrigin) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!l.name.toLowerCase().includes(q) &&
            !l.phone.toLowerCase().includes(q) &&
            !(l.email?.toLowerCase().includes(q) ?? false)) {
          return false;
        }
      }
      return true;
    });
  }, [leads, search, filterColumn, filterTag, filterOrigin]);

  const selectedLeadsForSend: BroadcastLead[] = useMemo(() => {
    return leads
      .filter(l => selectedLeadIds.includes(l.id) && l.phone)
      .map(l => ({
        id: l.id,
        name: l.name,
        phone: l.phone!,
        email: l.email,
        company: l.company,
      }));
  }, [leads, selectedLeadIds]);

  const cost = calculateCost(
    selectedLeadIds.length,
    route,
    templates.find(t => t.id === selectedTemplate)?.category
  );

  const toggleAll = () => {
    if (selectedLeadIds.length === filteredLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map(l => l.id));
    }
  };

  const toggleLead = (leadId: string) => {
    setSelectedLeadIds(prev =>
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    );
  };

  // Step navigation
  const canGoNext = () => {
    if (step === "audience") return selectedLeadIds.length > 0;
    if (step === "channel") return campaignName.trim().length > 0;
    if (step === "message") {
      if (route === "official") return !!selectedTemplate;
      return message.trim().length > 0;
    }
    if (step === "schedule") {
      if (sendNow) return true;
      return !!scheduledDate && !!scheduledTime;
    }
    return true;
  };

  const goNext = () => {
    const order: Step[] = ["audience", "channel", "message", "schedule", "review"];
    const idx = order.indexOf(step);
    if (idx < order.length - 1) setStep(order[idx + 1]);
  };

  const goBack = () => {
    const order: Step[] = ["audience", "channel", "message", "schedule", "review"];
    const idx = order.indexOf(step);
    if (idx > 0) setStep(order[idx - 1]);
  };

  const handleSubmit = async () => {
    if (!clientId) {
      toast.error("Sessão inválida");
      return;
    }
    if (selectedLeadsForSend.length === 0) {
      toast.error("Nenhum destinatário com telefone válido");
      return;
    }

    setSubmitting(true);
    try {
      const campaignId = crypto.randomUUID();
      const template = templates.find(t => t.id === selectedTemplate);
      const messageText = route === "official" ? (template?.content ?? "") : message;

      const scheduledAt = sendNow
        ? null
        : new Date(`${scheduledDate}T${scheduledTime}`).toISOString();

      // Save campaign master record
      const { error: campaignError } = await (supabase.from("broadcast_campaigns") as any).insert({
        id: campaignId,
        client_id: clientId,
        tenant_id: isValidUuid(tenant?.id) ? tenant.id : null,
        name: campaignName,
        channel: "whatsapp",
        route,
        message_content: messageText,
        template_id: template?.id ?? null,
        lead_ids: selectedLeadsForSend.map(l => l.id).filter(Boolean),
        total_recipients: selectedLeadsForSend.length,
        scheduled_at: scheduledAt,
        delay_min_seconds: delayMin,
        delay_max_seconds: delayMax,
        status: scheduledAt ? "scheduled" : "sending",
        created_by: user?.id ?? null,
      });

      if (campaignError) {
        toast.error("Erro ao criar campanha: " + campaignError.message);
        return;
      }

      if (scheduledAt) {
        toast.success(`Campanha agendada para ${new Date(scheduledAt).toLocaleString("pt-BR")}`);
        setOpen(false);
        return;
      }

      // Send now
      const result = await sendBroadcastToLeads(
        selectedLeadsForSend,
        route,
        messageText,
        template,
        {
          campaignId,
          campaignName,
          delayMs: { minMs: delayMin * 1000, maxMs: delayMax * 1000 },
        }
      );

      // Update campaign status
      await (supabase.from("broadcast_campaigns") as any)
        .update({
          status: "completed",
          sent_count: result.sent,
          failed_count: result.failed,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId);

      setOpen(false);
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const stepLabels: Record<Step, string> = {
    audience: "1. Destinatários",
    channel: "2. Canal",
    message: "3. Mensagem",
    schedule: "4. Agendamento",
    review: "5. Revisar",
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-primary hover:bg-primary-hover text-primary-foreground font-bold gap-2 shadow-lg shadow-primary/20">
          <Send className="h-3.5 w-3.5" /> NOVO DISPARO
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[640px] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-lg font-heading font-black flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-primary" />
            </div>
            {stepLabels[step]}
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="px-6 pb-2">
          <div className="flex items-center gap-1">
            {(["audience", "channel", "message", "schedule", "review"] as Step[]).map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  ["audience", "channel", "message", "schedule", "review"].indexOf(step) >= i
                    ? "bg-primary"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="px-6 pb-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Step 1: Audience */}
          {step === "audience" && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Selecione os leads que receberão a mensagem. Apenas leads com telefone aparecem aqui.
              </p>

              {/* Filters */}
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nome, telefone ou email..."
                    className="h-9 pl-9 text-xs"
                  />
                </div>
                <Select value={filterColumn} onValueChange={setFilterColumn}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas etapas</SelectItem>
                    {columns.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterTag} onValueChange={setFilterTag}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas tags</SelectItem>
                    {availableTags.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterOrigin} onValueChange={setFilterOrigin}>
                  <SelectTrigger className="h-9 text-xs col-span-2">
                    <SelectValue placeholder="Origem" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas origens</SelectItem>
                    {availableOrigins.map(o => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Selection Summary */}
              <div className="flex items-center justify-between bg-primary/5 px-3 py-2 rounded-lg">
                <p className="text-xs">
                  <span className="font-bold">{selectedLeadIds.length}</span> selecionados de{" "}
                  <span className="font-bold">{filteredLeads.length}</span> disponíveis
                </p>
                <Button size="sm" variant="ghost" onClick={toggleAll} className="h-7 text-xs">
                  {selectedLeadIds.length === filteredLeads.length ? "Desmarcar tudo" : "Selecionar todos"}
                </Button>
              </div>

              {/* Leads List */}
              <div className="border rounded-lg max-h-64 overflow-y-auto divide-y">
                {filteredLeads.length === 0 ? (
                  <p className="p-4 text-xs text-center text-muted-foreground">Nenhum lead encontrado.</p>
                ) : (
                  filteredLeads.map(lead => (
                    <div
                      key={lead.id}
                      onClick={() => toggleLead(lead.id)}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <Checkbox checked={selectedLeadIds.includes(lead.id)} onCheckedChange={() => toggleLead(lead.id)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{lead.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {lead.phone} {lead.origin && `· ${lead.origin}`}
                        </p>
                      </div>
                      {lead.tags && lead.tags.length > 0 && (
                        <Badge variant="outline" className="text-[9px]">{lead.tags[0]}</Badge>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Step 2: Channel */}
          {step === "channel" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Nome da Campanha</Label>
                <Input
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Ex: Black Friday 2026"
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Rota / Canal</Label>
                <Tabs value={route} onValueChange={(v) => setRoute(v as BroadcastRoute)}>
                  <TabsList className="grid grid-cols-2 p-1 bg-muted/40 h-14 rounded-xl">
                    <TabsTrigger value="free" className="rounded-lg gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      <Smartphone className={`h-4 w-4 ${route === "free" ? "text-accent" : "text-muted-foreground"}`} />
                      <div className="text-left">
                        <p className="text-[11px] font-bold leading-none">Evolution</p>
                        <p className="text-[9px] text-muted-foreground">WhatsApp Web</p>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="official" className="rounded-lg gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      <Cloud className={`h-4 w-4 ${route === "official" ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="text-left">
                        <p className="text-[11px] font-bold leading-none">Oficial</p>
                        <p className="text-[9px] text-muted-foreground">Cloud API/Meta</p>
                      </div>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="bg-muted/20 rounded-xl p-3 text-[11px] text-muted-foreground">
                <p className="font-semibold text-foreground mb-1">{route === "free" ? "Evolution (Gratuito)" : "WhatsApp Cloud (Pago)"}</p>
                {route === "free" ? (
                  <p>Envia via instância pessoal conectada. Sem custo, mas pode ser bloqueado pelo WhatsApp se enviar muitos.</p>
                ) : (
                  <p>API oficial Meta. Requer template aprovado. Custo por mensagem: MARKETING (1.24cr), UTILITY (0.70cr), AUTH (0.60cr).</p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Message */}
          {step === "message" && (
            <div className="space-y-4">
              {route === "official" ? (
                <div className="space-y-3">
                  <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Selecionar Template Aprovado</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <SelectValue placeholder="Escolha um template" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {templates.length === 0 ? (
                        <p className="p-4 text-xs text-muted-foreground">Nenhum template disponível</p>
                      ) : templates.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px]">{t.category}</Badge>
                            {t.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTemplate && (
                    <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                      <p className="text-[10px] uppercase font-black text-primary/40 tracking-widest mb-2">
                        <Sparkles className="h-3 w-3 inline mr-1" /> Preview
                      </p>
                      <p className="text-xs text-foreground/80 italic">
                        "{templates.find(t => t.id === selectedTemplate)?.content}"
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Mensagem Livre</Label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Olá {{nome}}, temos uma novidade para você..."
                    className="min-h-[140px] rounded-xl text-sm"
                  />
                  <div className="flex flex-wrap gap-1">
                    <button onClick={() => setMessage(m => m + "{{nome}}")} className="text-[10px] px-2 py-1 rounded-full bg-secondary hover:bg-secondary/80">
                      + nome
                    </button>
                    <button onClick={() => setMessage(m => m + "{{empresa}}")} className="text-[10px] px-2 py-1 rounded-full bg-secondary hover:bg-secondary/80">
                      + empresa
                    </button>
                    <button onClick={() => setMessage(m => m + "{{email}}")} className="text-[10px] px-2 py-1 rounded-full bg-secondary hover:bg-secondary/80">
                      + email
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Use variáveis para personalizar: <code>{`{{nome}}`}</code>, <code>{`{{empresa}}`}</code>, <code>{`{{email}}`}</code>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Schedule */}
          {step === "schedule" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Quando Enviar?</Label>
                <Tabs value={sendNow ? "now" : "scheduled"} onValueChange={(v) => setSendNow(v === "now")}>
                  <TabsList className="grid grid-cols-2 p-1 bg-muted/40 h-14 rounded-xl">
                    <TabsTrigger value="now" className="rounded-lg gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      <Send className={`h-4 w-4 ${sendNow ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="text-left">
                        <p className="text-[11px] font-bold leading-none">Imediato</p>
                        <p className="text-[9px] text-muted-foreground">Enviar agora</p>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="scheduled" className="rounded-lg gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      <Calendar className={`h-4 w-4 ${!sendNow ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="text-left">
                        <p className="text-[11px] font-bold leading-none">Agendado</p>
                        <p className="text-[9px] text-muted-foreground">Data/hora futura</p>
                      </div>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {!sendNow && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Data</Label>
                    <Input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="h-10 rounded-xl text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Horário</Label>
                    <Input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="h-10 rounded-xl text-xs"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-3 border-t">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Intervalo Entre Envios</Label>
                <p className="text-[10px] text-muted-foreground">
                  Tempo aleatório entre cada mensagem (anti-banimento)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Mín. (segundos)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={300}
                      value={delayMin}
                      onChange={(e) => setDelayMin(Math.max(1, Number(e.target.value)))}
                      className="h-10 rounded-xl text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Máx. (segundos)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={300}
                      value={delayMax}
                      onChange={(e) => setDelayMax(Math.max(delayMin, Number(e.target.value)))}
                      className="h-10 rounded-xl text-xs"
                    />
                  </div>
                </div>
                <div className="bg-warning/5 border border-warning/20 rounded-lg p-2 flex gap-2">
                  <AlertCircle className="h-4 w-4 text-warning shrink-0" />
                  <p className="text-[10px] text-muted-foreground">
                    Recomendamos no mínimo 3-8s para evitar bloqueio. Para volumes &gt; 100 leads, use 10-30s.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {step === "review" && (
            <div className="space-y-4">
              <div className="bg-primary/5 rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Campanha</span>
                  <span className="font-bold">{campaignName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Destinatários</span>
                  <span className="font-bold">{selectedLeadIds.length} leads</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Canal</span>
                  <span className="font-bold">{route === "free" ? "Evolution" : "WhatsApp Oficial"}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Quando</span>
                  <span className="font-bold">
                    {sendNow ? "Imediato" : `${scheduledDate} ${scheduledTime}`}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Intervalo</span>
                  <span className="font-bold">{delayMin}-{delayMax}s</span>
                </div>
                <div className="flex justify-between text-xs pt-3 border-t border-primary/10">
                  <span className="text-muted-foreground">Custo Total</span>
                  <span className={`font-black ${cost > 0 ? "text-primary" : "text-success"}`}>
                    {cost === 0 ? "GRÁTIS" : `${cost.toFixed(2)} créditos`}
                  </span>
                </div>
              </div>

              <div className="bg-muted/20 rounded-xl p-3">
                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Preview</p>
                <p className="text-xs italic text-foreground/80">
                  "{route === "official"
                    ? templates.find(t => t.id === selectedTemplate)?.content
                    : message}"
                </p>
              </div>

              {cost > credits && (
                <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 flex gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                  <p className="text-xs text-destructive">
                    Saldo insuficiente. Você tem {credits} créditos, precisa de {cost.toFixed(2)}.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/10 flex justify-between items-center">
          <Button variant="ghost" onClick={goBack} disabled={step === "audience" || submitting} className="text-xs">
            ← Voltar
          </Button>
          {step !== "review" ? (
            <Button onClick={goNext} disabled={!canGoNext()} className="bg-primary hover:bg-primary-hover text-xs gap-1">
              Próximo <ArrowRight className="h-3 w-3" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting || (cost > credits && route === "official")}
              className="bg-primary hover:bg-primary-hover text-xs gap-1"
            >
              {submitting ? (
                <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="h-3 w-3" />
                  {sendNow ? "Disparar Agora" : "Agendar Disparo"}
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
