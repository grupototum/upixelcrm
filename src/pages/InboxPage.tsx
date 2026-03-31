import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Search, Phone, Video, MoreVertical, Send, Paperclip, Mic,
  Play, Pause, FileText, MessageSquare, CheckSquare, Sparkles, Tag,
  ArrowRight, Plus, User, Building, DollarSign, Globe, Mail,
  MessageCircle, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageTemplatePopover } from "@/components/inbox/MessageTemplatePopover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreateTaskModal } from "@/components/crm/CreateTaskModal";
import { AddTagModal } from "@/components/crm/AddTagModal";
import { CreateTagModal } from "@/components/crm/CreateTagModal";
import { useAppState } from "@/contexts/AppContext";
import { useInbox, type Conversation } from "@/hooks/useInbox";
import { supabase } from "@/integrations/supabase/client";

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

const channelIcons: Record<string, typeof MessageCircle> = {
  whatsapp: MessageCircle,
  email: Mail,
  instagram: MessageCircle,
  webchat: Globe,
};

export default function InboxPage() {
  const navigate = useNavigate();
  const { tasks, toggleTaskStatus, moveLead, columns, leads, refreshData } = useAppState();
  const inbox = useInbox(refreshData);

  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [inboxTab, setInboxTab] = useState<string>("todas");
  const [sending, setSending] = useState(false);

  // New conversation modal
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [newChannel, setNewChannel] = useState("whatsapp");
  const [newLeadId, setNewLeadId] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");

  // Modal states
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [createTagModalOpen, setCreateTagModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedConv = useMemo(
    () => inbox.conversations.find(c => c.id === inbox.selectedConversationId),
    [inbox.conversations, inbox.selectedConversationId]
  );

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [inbox.messages]);

  const filteredConversations = useMemo(() => {
    let result = inbox.conversations;
    if (inboxTab === "minhas") {
      result = result.filter(t => t.status === "open");
    } else if (inboxTab === "nao-respondidas") {
      result = result.filter(t => t.unread_count > 0);
    }
    if (channelFilter !== "all") {
      result = result.filter(t => t.channel === channelFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        (t.lead_name || "").toLowerCase().includes(q) ||
        (t.last_message || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [inbox.conversations, searchQuery, channelFilter, inboxTab]);

  const initials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    await inbox.sendMessage(message.trim());
    setMessage("");
    setSending(false);
  };

  const handleCreateConversation = async () => {
    const lead = leads.find(l => l.id === newLeadId);
    const phone = newPhone || lead?.phone || "";
    const email = newEmail || lead?.email || "";
    const name = lead?.name || phone || email || "Nova conversa";

    const id = await inbox.createConversation(newChannel, newLeadId || undefined, phone, email, name);
    if (id) {
      inbox.selectConversation(id);
      setNewConvOpen(false);
      setNewLeadId("");
      setNewPhone("");
      setNewEmail("");
    }
  };

  // Find lead data for selected conversation
  const selectedLead = useMemo(() => {
    if (!selectedConv?.lead_id) return null;
    return leads.find(l => l.id === selectedConv.lead_id) || null;
  }, [selectedConv, leads]);

  const leadColumn = useMemo(
    () => columns.find(c => c.id === selectedLead?.column_id),
    [selectedLead?.column_id, columns]
  );

  const leadTasks = useMemo(
    () => selectedLead ? tasks.filter(t => t.lead_id === selectedLead.id) : [],
    [tasks, selectedLead]
  );

  return (
    <AppLayout title="Inbox" subtitle="Central de atendimento">
      <div className="flex h-[calc(100vh-4rem)] animate-fade-in">
        {/* ─── Thread list ─── */}
        <div className="w-80 ghost-border border-r flex flex-col shrink-0">
          <div className="p-3 ghost-border border-b space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {[
                  { key: "todas", label: "Todas" },
                  { key: "minhas", label: "Minhas" },
                  { key: "nao-respondidas", label: "Não respondidas" },
                ].map(tab => (
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
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setNewConvOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
                placeholder="Buscar conversas..."
              />
            </div>
            <div className="flex gap-1.5">
              {["all", "whatsapp", "email", "instagram"].map(ch => (
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
            {inbox.loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <MessageCircle className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground text-center">Nenhuma conversa encontrada</p>
                <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={() => setNewConvOpen(true)}>
                  <Plus className="h-3 w-3 mr-1" /> Nova conversa
                </Button>
              </div>
            ) : (
              filteredConversations.map(c => (
                <button
                  key={c.id}
                  onClick={() => inbox.selectConversation(c.id)}
                  className={`w-full flex items-start gap-3 p-3 text-left hover:bg-secondary transition-colors ghost-border border-b ${
                    inbox.selectedConversationId === c.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
                  }`}
                >
                  <div className="relative">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                      {initials(c.lead_name || "?")}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card ${channelColors[c.channel] || "bg-muted"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground truncate">{c.lead_name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{c.last_message || "Sem mensagens"}</p>
                  </div>
                  {c.unread_count > 0 && (
                    <span className="h-5 min-w-[20px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1.5 shrink-0">
                      {c.unread_count}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* ─── Chat area ─── */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedConv ? (
            <>
              {/* Chat header */}
              <div className="h-14 px-4 ghost-border border-b flex items-center justify-between shrink-0 bg-card">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                    {initials(selectedConv.lead_name || "?")}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{selectedConv.lead_name}</p>
                    <div className="flex items-center gap-1.5">
                      <div className={`h-2 w-2 rounded-full ${channelColors[selectedConv.channel]}`} />
                      <p className="text-[10px] text-muted-foreground">{channelLabels[selectedConv.channel] || selectedConv.channel}</p>
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
                  <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-accent hover:text-accent" onClick={() => toast.info("IA analisando conversa...")}>
                    <Sparkles className="h-3.5 w-3.5" /> IA
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-auto p-4 space-y-3 bg-background">
                {inbox.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <MessageCircle className="h-10 w-10 text-muted-foreground/20 mb-2" />
                    <p className="text-xs text-muted-foreground">Nenhuma mensagem ainda. Envie a primeira!</p>
                  </div>
                ) : (
                  <>
                    {inbox.messages.map((msg, i) => {
                      const isOutbound = msg.direction === "outbound";
                      // Date separator
                      const prevMsg = i > 0 ? inbox.messages[i - 1] : null;
                      const msgDate = new Date(msg.created_at).toLocaleDateString("pt-BR");
                      const prevDate = prevMsg ? new Date(prevMsg.created_at).toLocaleDateString("pt-BR") : null;
                      const showDate = !prevDate || msgDate !== prevDate;

                      return (
                        <div key={msg.id}>
                          {showDate && (
                            <div className="flex items-center gap-3 py-2">
                              <div className="flex-1 h-px bg-border" />
                              <span className="text-[10px] text-muted-foreground font-medium">{msgDate}</span>
                              <div className="flex-1 h-px bg-border" />
                            </div>
                          )}
                          <div className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                              isOutbound
                                ? "bg-secondary text-foreground rounded-br-md"
                                : "bg-primary text-primary-foreground rounded-bl-md"
                            }`}>
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                              <p className={`text-[10px] mt-1.5 ${
                                isOutbound ? "text-muted-foreground" : "text-primary-foreground/60"
                              }`}>
                                {msg.sender_name && !isOutbound && <span className="font-medium">{msg.sender_name} · </span>}
                                {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input */}
              <div className="p-3 ghost-border border-t bg-card">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground shrink-0">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <MessageTemplatePopover onSelect={body => { setMessage(body); toast.info("Template inserido"); }} />
                  <Input
                    className="flex-1 rounded-full px-4 h-9 text-sm"
                    placeholder={`Enviar via ${channelLabels[selectedConv.channel] || selectedConv.channel}...`}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                  />
                  <Button
                    size="icon"
                    className="h-9 w-9 rounded-full shrink-0"
                    disabled={!message.trim() || sending}
                    onClick={handleSend}
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground font-medium">Selecione uma conversa</p>
              <p className="text-xs text-muted-foreground/60 mt-1">ou crie uma nova para começar</p>
              <Button size="sm" variant="outline" className="mt-4 text-xs" onClick={() => setNewConvOpen(true)}>
                <Plus className="h-3 w-3 mr-1" /> Nova conversa
              </Button>
            </div>
          )}
        </div>

        {/* ─── Lead context panel ─── */}
        {selectedConv && selectedLead && (
          <div className="w-72 ghost-border border-l shrink-0 overflow-auto hidden xl:block bg-card">
            <div className="p-4 ghost-border border-b">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
                  {initials(selectedLead.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{selectedLead.name}</p>
                  {selectedLead.company && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Building className="h-2.5 w-2.5" /> {selectedLead.company}
                    </p>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full text-xs gap-1.5" onClick={() => navigate(`/leads/${selectedLead.id}`)}>
                <User className="h-3 w-3" /> Ver perfil completo
              </Button>
            </div>

            <div className="p-4 ghost-border border-b space-y-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Dados</p>
              {selectedLead.phone && (
                <div className="flex items-center gap-2 text-xs">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <span className="text-foreground">{selectedLead.phone}</span>
                </div>
              )}
              {selectedLead.email && (
                <div className="flex items-center gap-2 text-xs">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span className="text-foreground truncate">{selectedLead.email}</span>
                </div>
              )}
              {leadColumn && (
                <div className="flex items-center gap-2 text-xs">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: leadColumn.color }} />
                  <span className="text-foreground">{leadColumn.name}</span>
                </div>
              )}
              {selectedLead.value && (
                <div className="flex items-center gap-2 text-xs">
                  <DollarSign className="h-3 w-3 text-muted-foreground" />
                  <span className="text-primary font-semibold">R$ {selectedLead.value.toLocaleString("pt-BR")}</span>
                </div>
              )}
            </div>

            {/* Tasks */}
            <div className="p-4 ghost-border border-b space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <CheckSquare className="h-3 w-3" /> Tarefas
                </p>
                <Button variant="ghost" size="icon" className="h-5 w-5 text-primary hover:bg-primary/10" onClick={() => setTaskModalOpen(true)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <div className="space-y-2">
                {leadTasks.length > 0 ? (
                  leadTasks.map(task => (
                    <div key={task.id} className="flex items-start gap-2">
                      <button
                        onClick={() => toggleTaskStatus(task.id)}
                        className={`mt-0.5 h-3.5 w-3.5 rounded border border-primary/30 flex items-center justify-center transition-colors ${task.status === "completed" ? "bg-primary border-primary" : "hover:border-primary"}`}
                      >
                        {task.status === "completed" && <CheckSquare className="h-2.5 w-2.5 text-primary-foreground" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[11px] leading-tight ${task.status === "completed" ? "text-muted-foreground line-through" : "text-foreground font-medium"}`}>
                          {task.title}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-muted-foreground italic text-center py-2">Sem tarefas pendentes</p>
                )}
              </div>
            </div>

            {/* Tags */}
            <div className="p-4 ghost-border border-b">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Tags
                </p>
                <Button variant="ghost" size="icon" className="h-5 w-5 text-primary hover:bg-primary/10" onClick={() => setTagModalOpen(true)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedLead.tags.length > 0 ? (
                  selectedLead.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-[10px] gap-1 px-2 py-0">{tag}</Badge>
                  ))
                ) : (
                  <p className="text-[10px] text-muted-foreground italic">Sem tags</p>
                )}
              </div>
            </div>

            {/* Quick actions */}
            <div className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Ações Rápidas</p>
              <div className="space-y-1.5">
                <Button variant="outline" size="sm" className="w-full text-xs justify-start gap-2 h-8" onClick={() => setTaskModalOpen(true)}>
                  <CheckSquare className="h-3 w-3" /> Criar tarefa
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full text-xs justify-start gap-2 h-8">
                      <ArrowRight className="h-3 w-3" /> Mover estágio
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {columns.map(col => (
                      <DropdownMenuItem
                        key={col.id}
                        className="text-xs gap-2"
                        disabled={col.id === selectedLead?.column_id}
                        onClick={() => selectedLead && moveLead(selectedLead.id, col.id)}
                      >
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: col.color }} />
                        {col.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="sm" className="w-full text-xs justify-start gap-2 h-8" onClick={() => setTagModalOpen(true)}>
                  <Plus className="h-3 w-3" /> Adicionar tag
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Conversation Modal */}
      <Dialog open={newConvOpen} onOpenChange={setNewConvOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" /> Nova Conversa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Canal</Label>
              <Select value={newChannel} onValueChange={setNewChannel}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp" className="text-xs">WhatsApp</SelectItem>
                  <SelectItem value="email" className="text-xs">E-mail</SelectItem>
                  <SelectItem value="instagram" className="text-xs">Instagram</SelectItem>
                  <SelectItem value="webchat" className="text-xs">Webchat</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Lead (opcional)</Label>
              <Select value={newLeadId} onValueChange={v => {
                setNewLeadId(v);
                const lead = leads.find(l => l.id === v);
                if (lead?.phone) setNewPhone(lead.phone);
                if (lead?.email) setNewEmail(lead.email || "");
              }}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Selecione um lead..." />
                </SelectTrigger>
                <SelectContent>
                  {leads.map(l => (
                    <SelectItem key={l.id} value={l.id} className="text-xs">{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(newChannel === "whatsapp" || newChannel === "webchat") && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Telefone</Label>
                <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+55 11 99999-0000" className="text-xs h-9" />
              </div>
            )}

            {newChannel === "email" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">E-mail</Label>
                <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@exemplo.com" className="text-xs h-9" />
              </div>
            )}

            <Button className="w-full text-xs" onClick={handleCreateConversation}>
              <MessageCircle className="h-3 w-3 mr-1" /> Iniciar Conversa
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modals */}
      {selectedLead && (
        <>
          <CreateTaskModal open={taskModalOpen} onOpenChange={setTaskModalOpen} defaultLeadId={selectedLead.id} />
          <AddTagModal open={tagModalOpen} onOpenChange={setTagModalOpen} leadId={selectedLead.id} />
          <CreateTagModal open={createTagModalOpen} onOpenChange={setCreateTagModalOpen} />
        </>
      )}
    </AppLayout>
  );
}
