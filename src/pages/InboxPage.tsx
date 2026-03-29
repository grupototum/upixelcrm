import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { mockThreads, mockMessages, mockLeads, mockColumns } from "@/lib/mock-data";
import {
  Search, Phone, Video, MoreVertical, Send, Paperclip, Mic,
  Play, Pause, FileText, MessageSquare, CheckSquare, Sparkles, Tag,
  ArrowRight, Plus, User, Building, DollarSign, Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageTemplatePopover } from "@/components/inbox/MessageTemplatePopover";
import { whatsappService } from "@/services/whatsapp.service";
import type { InboxThread } from "@/types";

const channelColors: Record<string, string> = {
  whatsapp: "bg-success",
  instagram: "bg-destructive",
  email: "bg-primary",
  webchat: "bg-accent",
};

const channelLabels: Record<string, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  email: "E-mail",
  webchat: "Webchat",
};

export default function InboxPage() {
  const navigate = useNavigate();
  const [selectedThread, setSelectedThread] = useState<InboxThread>(mockThreads[0]);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [inboxTab, setInboxTab] = useState<string>("todas");

  const messages = mockMessages.filter((m) => m.thread_id === selectedThread.id);

  const selectedLead = useMemo(
    () => mockLeads.find((l) => l.id === selectedThread.lead_id),
    [selectedThread.lead_id]
  );

  const leadColumn = useMemo(
    () => mockColumns.find((c) => c.id === selectedLead?.column_id),
    [selectedLead?.column_id]
  );

  const filteredThreads = useMemo(() => {
    let result = mockThreads;
    // Inbox tab filter
    if (inboxTab === "minhas") {
      result = result.filter((t) => t.status === "open");
    } else if (inboxTab === "nao-respondidas") {
      result = result.filter((t) => t.unread_count > 0);
    }
    if (channelFilter !== "all") {
      result = result.filter((t) => t.channel === channelFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.lead_name.toLowerCase().includes(q) ||
          t.last_message.toLowerCase().includes(q)
      );
    }
    return result;
  }, [searchQuery, channelFilter, inboxTab]);

  const initials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").slice(0, 2);

  const handleSend = async () => {
    if (!message.trim()) return;

    const textToSend = message;
    setMessage(""); // Otimista local
    
    toast("Enviando WhatsApp...", { duration: 500 });
    
    // Serviço real / genérico chamando a API de WhatsApp
    const result = await whatsappService.sendMessage({
      to: selectedLead?.phone || "5511000000000",
      message: textToSend
    });
    
    if (result.success || result) {
      toast.success("Mensagem enviada ao backend do WhatsApp!");
    } else {
      toast.error("Erro interno ao rotear a mensagem.");
    }
  };

  return (
    <AppLayout title="Inbox" subtitle="Central de atendimento">
      <div className="flex h-[calc(100vh-4rem)] animate-fade-in">
        {/* ─── Thread list ─── */}
        <div className="w-80 ghost-border border-r flex flex-col shrink-0">
          <div className="p-3 ghost-border border-b space-y-2">
            {/* Inbox tabs */}
            <div className="flex gap-1">
              {[
                { key: "todas", label: "Todas" },
                { key: "minhas", label: "Minhas" },
                { key: "nao-respondidas", label: "Não respondidas" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setInboxTab(tab.key)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                    inboxTab === tab.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
                placeholder="Buscar conversas..."
              />
            </div>
            {/* Channel filter pills */}
            <div className="flex gap-1.5">
              {["all", "whatsapp", "instagram", "email"].map((ch) => (
                <button
                  key={ch}
                  onClick={() => setChannelFilter(ch)}
                  className={`px-2 py-1 rounded-full text-[10px] font-medium transition-colors ${
                    channelFilter === ch
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {ch === "all" ? "Todos" : channelLabels[ch]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {filteredThreads.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedThread(t)}
                className={`w-full flex items-start gap-3 p-3 text-left hover:bg-secondary transition-colors ghost-border border-b ${
                  selectedThread.id === t.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
                }`}
              >
                <div className="relative">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                    {initials(t.lead_name)}
                  </div>
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card ${channelColors[t.channel] || "bg-muted"}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-foreground truncate">{t.lead_name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(t.last_message_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{t.last_message}</p>
                </div>
                {t.unread_count > 0 && (
                  <span className="h-5 min-w-[20px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1.5 shrink-0">
                    {t.unread_count}
                  </span>
                )}
              </button>
            ))}
            {filteredThreads.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhuma conversa encontrada</p>
            )}
          </div>
        </div>

        {/* ─── Chat area ─── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div className="h-14 px-4 ghost-border border-b flex items-center justify-between shrink-0 bg-card">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                {initials(selectedThread.lead_name)}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{selectedThread.lead_name}</p>
                <div className="flex items-center gap-1.5">
                  <div className={`h-2 w-2 rounded-full ${channelColors[selectedThread.channel]}`} />
                  <p className="text-[10px] text-muted-foreground">{channelLabels[selectedThread.channel]}</p>
                  {leadColumn && (
                    <>
                      <span className="text-muted-foreground/40">·</span>
                      <p className="text-[10px] text-muted-foreground">{leadColumn.name}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-accent hover:text-accent">
                <Sparkles className="h-3.5 w-3.5" /> IA
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                <Phone className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                <Video className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-auto p-4 space-y-3 bg-background">
            {/* Date separator */}
            <div className="flex items-center gap-3 py-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] text-muted-foreground font-medium">Hoje</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {messages.map((msg) => {
              const isOutbound = msg.direction === "outbound";
              return (
                <div key={msg.id} className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                      isOutbound
                        ? "bg-secondary text-foreground rounded-br-md"
                        : "bg-primary text-primary-foreground rounded-bl-md"
                    }`}
                  >
                    {msg.type === "audio" ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setPlayingAudio(playingAudio === msg.id ? null : msg.id)}
                            className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                              isOutbound ? "bg-primary/15 hover:bg-primary/25" : "bg-primary-foreground/20 hover:bg-primary-foreground/30"
                            }`}
                          >
                            {playingAudio === msg.id ? (
                              <Pause className={`h-4 w-4 ${isOutbound ? "text-primary" : "text-primary-foreground"}`} />
                            ) : (
                              <Play className={`h-4 w-4 ${isOutbound ? "text-primary" : "text-primary-foreground"}`} />
                            )}
                          </button>
                          <div className="flex-1">
                            {/* Waveform bars */}
                            <div className="flex items-end gap-0.5 h-5">
                              {Array.from({ length: 20 }).map((_, i) => (
                                <div
                                  key={i}
                                  className={`w-1 rounded-full transition-colors ${
                                    isOutbound ? "bg-muted-foreground/30" : "bg-primary-foreground/40"
                                  } ${i < 7 && playingAudio === msg.id ? (isOutbound ? "bg-primary" : "bg-primary-foreground") : ""}`}
                                  style={{ height: `${Math.random() * 14 + 4}px` }}
                                />
                              ))}
                            </div>
                            <p className={`text-[10px] mt-1 ${isOutbound ? "text-muted-foreground" : "text-primary-foreground/60"}`}>
                              0:15
                            </p>
                          </div>
                        </div>
                        <button
                          className={`text-[10px] flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium transition-colors ${
                            isOutbound
                              ? "text-primary hover:bg-primary/10 border border-primary/20"
                              : "text-primary-foreground/90 hover:bg-primary-foreground/10 border border-primary-foreground/20"
                          }`}
                        >
                          <FileText className="h-3 w-3" /> Transcrever áudio
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    )}
                    <p
                      className={`text-[10px] mt-1.5 ${
                        isOutbound ? "text-muted-foreground" : "text-primary-foreground/60"
                      }`}
                    >
                      {msg.sender_name && !isOutbound && <span className="font-medium">{msg.sender_name} · </span>}
                      {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI suggestion bar */}
          <div className="px-4 py-2 ghost-border border-t bg-accent/5 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-accent shrink-0" />
            <p className="text-[10px] text-muted-foreground flex-1">Sugestão IA: "Olá Maria! Sim, atendemos empresas de todos os tamanhos..."</p>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] text-accent hover:text-accent px-2">
              Usar
            </Button>
          </div>

          {/* Input */}
          <div className="p-3 ghost-border border-t bg-card">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground shrink-0">
                <Paperclip className="h-4 w-4" />
              </Button>
              <MessageTemplatePopover onSelect={(body) => { setMessage(body); toast.info("Template inserido"); }} />
              <Input
                className="flex-1 rounded-full px-4 h-9 text-sm"
                placeholder="Digite uma mensagem..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground shrink-0">
                <Mic className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                className="h-9 w-9 rounded-full shrink-0"
                disabled={!message.trim()}
                onClick={handleSend}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* ─── Lead context panel ─── */}
        <div className="w-72 ghost-border border-l shrink-0 overflow-auto hidden xl:block bg-card">
          {/* Lead header */}
          <div className="p-4 ghost-border border-b">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
                {initials(selectedThread.lead_name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{selectedThread.lead_name}</p>
                {selectedLead?.company && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Building className="h-2.5 w-2.5" /> {selectedLead.company}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs gap-1.5"
              onClick={() => navigate(`/leads/${selectedThread.lead_id}`)}
            >
              <User className="h-3 w-3" /> Ver perfil completo
            </Button>
          </div>

          {/* Lead data */}
          <div className="p-4 ghost-border border-b space-y-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Dados</p>
            {selectedLead?.phone && (
              <div className="flex items-center gap-2 text-xs">
                <Phone className="h-3 w-3 text-muted-foreground" />
                <span className="text-foreground">{selectedLead.phone}</span>
              </div>
            )}
            {selectedLead?.email && (
              <div className="flex items-center gap-2 text-xs">
                <MessageSquare className="h-3 w-3 text-muted-foreground" />
                <span className="text-foreground truncate">{selectedLead.email}</span>
              </div>
            )}
            {leadColumn && (
              <div className="flex items-center gap-2 text-xs">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: leadColumn.color }} />
                <span className="text-foreground">{leadColumn.name}</span>
              </div>
            )}
            {selectedLead?.value && (
              <div className="flex items-center gap-2 text-xs">
                <DollarSign className="h-3 w-3 text-muted-foreground" />
                <span className="text-primary font-semibold">R$ {selectedLead.value.toLocaleString("pt-BR")}</span>
              </div>
            )}
            {selectedLead?.origin && (
              <div className="flex items-center gap-2 text-xs">
                <Globe className="h-3 w-3 text-muted-foreground" />
                <span className="text-foreground">{selectedLead.origin}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {selectedLead && selectedLead.tags.length > 0 && (
            <div className="p-4 ghost-border border-b">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                <Tag className="h-3 w-3" /> Tags
              </p>
              <div className="flex flex-wrap gap-1">
                {selectedLead.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px] gap-1">
                    <Tag className="h-2.5 w-2.5" /> {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Ações Rápidas</p>
            <div className="space-y-1.5">
              <Button variant="outline" size="sm" className="w-full text-xs justify-start gap-2 h-8" onClick={() => toast.success("Tarefa criada para " + selectedThread.lead_name)}>
                <CheckSquare className="h-3 w-3" /> Criar tarefa
              </Button>
              <Button variant="outline" size="sm" className="w-full text-xs justify-start gap-2 h-8" onClick={() => toast.success("Lead movido para próximo estágio")}>
                <ArrowRight className="h-3 w-3" /> Mover estágio
              </Button>
              <Button variant="outline" size="sm" className="w-full text-xs justify-start gap-2 h-8" onClick={() => toast.success("Tag adicionada ao lead")}>
                <Plus className="h-3 w-3" /> Adicionar tag
              </Button>
              <Button variant="outline" size="sm" className="w-full text-xs justify-start gap-2 h-8" onClick={() => { setMessage("Olá! Obrigado pelo contato. Como posso ajudar?"); toast.info("Sugestão inserida"); }}>
                <Sparkles className="h-3 w-3" /> Sugerir resposta
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
