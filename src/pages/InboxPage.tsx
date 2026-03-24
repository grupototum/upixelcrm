import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { mockThreads, mockMessages, mockLeads, mockColumns } from "@/lib/mock-data";
import {
  Search, Phone, Video, MoreVertical, Send, Paperclip, Mic,
  Play, FileText, MessageSquare, CheckSquare, Sparkles, Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { InboxThread } from "@/types";

const channelColors: Record<string, string> = {
  whatsapp: "bg-success",
  instagram: "bg-destructive",
  email: "bg-primary",
  webchat: "bg-accent",
};

export default function InboxPage() {
  const [selectedThread, setSelectedThread] = useState<InboxThread>(mockThreads[0]);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const messages = mockMessages.filter((m) => m.thread_id === selectedThread.id);

  // Link thread to actual lead data
  const selectedLead = useMemo(
    () => mockLeads.find((l) => l.id === selectedThread.lead_id),
    [selectedThread.lead_id]
  );

  const leadColumn = useMemo(
    () => mockColumns.find((c) => c.id === selectedLead?.column_id),
    [selectedLead?.column_id]
  );

  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return mockThreads;
    const q = searchQuery.toLowerCase();
    return mockThreads.filter(
      (t) =>
        t.lead_name.toLowerCase().includes(q) ||
        t.last_message.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const initials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").slice(0, 2);

  return (
    <AppLayout title="Inbox" subtitle="Central de atendimento">
      <div className="flex h-[calc(100vh-3.5rem)] animate-fade-in">
        {/* Thread list */}
        <div className="w-80 border-r border-border flex flex-col shrink-0">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
                placeholder="Buscar conversas..."
              />
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {filteredThreads.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedThread(t)}
                className={`w-full flex items-start gap-3 p-3 text-left hover:bg-secondary transition-colors border-b border-border ${
                  selectedThread.id === t.id ? "bg-primary/5" : ""
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

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div className="h-14 px-4 border-b border-border flex items-center justify-between shrink-0 bg-card">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                {initials(selectedThread.lead_name)}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{selectedThread.lead_name}</p>
                <p className="text-xs text-muted-foreground capitalize">{selectedThread.channel}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                <Sparkles className="h-4 w-4" />
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
            {messages.map((msg) => {
              const isOutbound = msg.direction === "outbound";
              return (
                <div key={msg.id} className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                      isOutbound
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-secondary text-foreground rounded-bl-md"
                    }`}
                  >
                    {msg.type === "audio" ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <button
                            className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                              isOutbound ? "bg-primary-foreground/20" : "bg-primary/15"
                            }`}
                          >
                            <Play className={`h-4 w-4 ${isOutbound ? "text-primary-foreground" : "text-primary"}`} />
                          </button>
                          <div className="flex-1">
                            <div className={`h-1 rounded-full w-32 ${isOutbound ? "bg-primary-foreground/30" : "bg-border"}`}>
                              <div className={`h-1 rounded-full w-1/3 ${isOutbound ? "bg-primary-foreground" : "bg-primary"}`} />
                            </div>
                            <p className={`text-[10px] mt-1 ${isOutbound ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                              0:15
                            </p>
                          </div>
                        </div>
                        <button
                          className={`text-[10px] flex items-center gap-1 rounded-md px-2 py-1 transition-colors ${
                            isOutbound
                              ? "text-primary-foreground/80 hover:bg-primary-foreground/10"
                              : "text-primary hover:bg-primary/10"
                          }`}
                        >
                          <FileText className="h-3 w-3" /> Transcrever áudio
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}
                    <p
                      className={`text-[10px] mt-1 ${
                        isOutbound ? "text-primary-foreground/60" : "text-muted-foreground"
                      }`}
                    >
                      {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border bg-card">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground shrink-0">
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input
                className="flex-1 rounded-full px-4 h-9 text-sm"
                placeholder="Digite uma mensagem..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && message.trim() && setMessage("")}
              />
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground shrink-0">
                <Mic className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                className="h-9 w-9 rounded-full shrink-0"
                disabled={!message.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Lead context panel — real data */}
        <div className="w-72 border-l border-border p-4 shrink-0 overflow-auto hidden xl:block bg-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Contexto do Lead</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
                {initials(selectedThread.lead_name)}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{selectedThread.lead_name}</p>
                <p className="text-xs text-muted-foreground capitalize">{selectedThread.channel}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              {selectedLead?.phone && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Telefone</span>
                  <span className="text-foreground">{selectedLead.phone}</span>
                </div>
              )}
              {selectedLead?.email && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="text-foreground truncate ml-2 max-w-[140px]">{selectedLead.email}</span>
                </div>
              )}
              {selectedLead?.company && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Empresa</span>
                  <span className="text-foreground">{selectedLead.company}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Canal</span>
                <span className="text-foreground capitalize">{selectedThread.channel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Etapa</span>
                <span className="text-foreground">{leadColumn?.name || "—"}</span>
              </div>
              {selectedLead?.value && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor</span>
                  <span className="text-primary font-semibold">R$ {selectedLead.value.toLocaleString("pt-BR")}</span>
                </div>
              )}
              {selectedLead?.origin && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Origem</span>
                  <span className="text-foreground">{selectedLead.origin}</span>
                </div>
              )}
            </div>

            {selectedLead && selectedLead.tags.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Tags
                </p>
                <div className="flex flex-wrap gap-1">
                  {selectedLead.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/15 text-primary">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Ações Rápidas</p>
              <div className="space-y-1">
                <Button variant="outline" size="sm" className="w-full text-xs justify-start gap-2">
                  <MessageSquare className="h-3 w-3" /> Ver perfil do lead
                </Button>
                <Button variant="outline" size="sm" className="w-full text-xs justify-start gap-2">
                  <CheckSquare className="h-3 w-3" /> Criar tarefa
                </Button>
                <Button variant="outline" size="sm" className="w-full text-xs justify-start gap-2">
                  <Sparkles className="h-3 w-3" /> Sugerir resposta
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
