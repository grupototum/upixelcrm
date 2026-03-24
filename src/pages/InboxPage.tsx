import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { mockThreads, mockMessages } from "@/lib/mock-data";
import { Search, Phone, Video, MoreVertical, Send, Paperclip, Mic, Play, FileText, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InboxThread } from "@/types";

export default function InboxPage() {
  const [selectedThread, setSelectedThread] = useState<InboxThread>(mockThreads[0]);
  const [message, setMessage] = useState("");

  const messages = mockMessages.filter((m) => m.thread_id === selectedThread.id);

  const channelColors: Record<string, string> = {
    whatsapp: "bg-success",
    instagram: "bg-pink-500",
    email: "bg-blue-500",
    webchat: "bg-accent",
  };

  return (
    <AppLayout title="Inbox" subtitle="Central de atendimento">
      <div className="flex h-[calc(100vh-3.5rem)] animate-fade-in">
        {/* Thread list */}
        <div className="w-80 border-r border-border flex flex-col shrink-0">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input className="w-full pl-9 pr-3 py-2 rounded-md bg-secondary text-sm text-foreground placeholder:text-muted-foreground border-0 outline-none focus:ring-1 focus:ring-primary" placeholder="Buscar conversas..." />
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {mockThreads.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedThread(t)}
                className={`w-full flex items-start gap-3 p-3 text-left hover:bg-secondary transition-colors border-b border-border ${selectedThread.id === t.id ? "bg-primary/5" : ""}`}
              >
                <div className="relative">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                    {t.lead_name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card ${channelColors[t.channel]}`} />
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
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div className="h-14 px-4 border-b border-border flex items-center justify-between shrink-0 bg-card">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                {selectedThread.lead_name.split(" ").map(n => n[0]).join("")}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{selectedThread.lead_name}</p>
                <p className="text-xs text-muted-foreground capitalize">{selectedThread.channel}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><Phone className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><Video className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><MoreVertical className="h-4 w-4" /></Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                  msg.direction === "outbound" 
                    ? "bg-primary text-primary-foreground rounded-br-md" 
                    : "bg-secondary text-foreground rounded-bl-md"
                }`}>
                  {msg.type === "audio" ? (
                    <div className="flex items-center gap-3">
                      <button className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center shrink-0">
                        <Play className="h-4 w-4" />
                      </button>
                      <div className="flex-1">
                        <div className="h-1 bg-primary-foreground/30 rounded-full w-32">
                          <div className="h-1 bg-primary-foreground rounded-full w-1/3" />
                        </div>
                        <p className="text-[10px] mt-1 opacity-70">0:15</p>
                      </div>
                      <button className="text-[10px] underline opacity-80 shrink-0 flex items-center gap-1">
                        <FileText className="h-3 w-3" /> Transcrever
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}
                  <p className={`text-[10px] mt-1 ${msg.direction === "outbound" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border bg-card">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground shrink-0"><Paperclip className="h-4 w-4" /></Button>
              <input
                className="flex-1 bg-secondary rounded-full px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
                placeholder="Digite uma mensagem..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground shrink-0"><Mic className="h-4 w-4" /></Button>
              <Button size="icon" className="h-9 w-9 bg-primary hover:bg-primary-hover text-primary-foreground rounded-full shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Lead context panel */}
        <div className="w-72 border-l border-border p-4 shrink-0 overflow-auto hidden xl:block bg-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Contexto do Lead</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
                {selectedThread.lead_name.split(" ").map(n => n[0]).join("")}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{selectedThread.lead_name}</p>
                <p className="text-xs text-muted-foreground capitalize">{selectedThread.channel}</p>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Canal</span><span className="text-foreground capitalize">{selectedThread.channel}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="text-success">Ativo</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Etapa</span><span className="text-foreground">Qualificação</span></div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Tags</p>
              <div className="flex flex-wrap gap-1">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/20 text-primary">hot</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent/20 text-accent">enterprise</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Ações Rápidas</p>
              <div className="space-y-1">
                <Button variant="outline" size="sm" className="w-full text-xs justify-start gap-2">
                  <MessageSquare className="h-3 w-3" /> Ver perfil do lead
                </Button>
                <Button variant="outline" size="sm" className="w-full text-xs justify-start gap-2">
                  <CheckSquare className="h-3 w-3" /> Criar tarefa
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}


