import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Search, Phone, MoreVertical,
  MessageSquare, CheckSquare, Tag,
  ArrowRight, Plus, User, Building, Globe, Mail,
  MessageCircle, Loader2, ExternalLink, Lock, Tags,
  Check, CheckCheck, Clock,
  File, Download, Maximize2, Activity, X,
  MapPin, UserSquare2, ChevronLeft, ChevronRight, PlayCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
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
import { ConversationActions } from "@/components/inbox/ConversationActions";
import { LabelSelector } from "@/components/inbox/LabelSelector";
import { ReplyBox } from "@/components/inbox/ReplyBox";
import { PriorityBadge } from "@/components/inbox/PriorityBadge";
import { ConversationStatusBadge } from "@/components/inbox/ConversationStatusBadge";
import { useAppState } from "@/contexts/AppContext";
import { useInbox } from "@/hooks/useInbox";

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

export default function InboxPage() { // force HMR reset
  const navigate = useNavigate();
  const { tasks, toggleTaskStatus, moveLead, columns, leads, refreshData } = useAppState();
  const inbox = useInbox(refreshData);

  
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [inboxTab, setInboxTab] = useState<string>("todas");
  const [sending, setSending] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // New conversation modal
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [newChannel, setNewChannel] = useState("whatsapp");
  const [newLeadId, setNewLeadId] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");

  // Modal states
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState<string | null>(null);
  const [mediaViewer, setMediaViewer] = useState<{ url: string; type: string; id?: string; metadata?: Record<string, any> } | null>(null);
  
  // Gallery navigation for Media Viewer
  const allMedia = useMemo(() => 
    inbox.messages.filter(m => ["image", "video", "sticker", "file", "document"].includes(m.type)), 
    [inbox.messages]
  );
  
  const currentMediaIndex = useMemo(() => 
    mediaViewer ? allMedia.findIndex(m => m.id === mediaViewer.id) : -1,
    [mediaViewer, allMedia]
  );

  const navigateMedia = (dir: "prev" | "next") => {
    if (currentMediaIndex === -1) return;
    const nextIdx = dir === "next" ? currentMediaIndex + 1 : currentMediaIndex - 1;
    if (nextIdx >= 0 && nextIdx < allMedia.length) {
      const m = allMedia[nextIdx];
      setMediaViewer({ url: m.content, type: m.type, id: m.id, metadata: m.metadata as Record<string, any> });
    }
  };
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [createTagModalOpen, setCreateTagModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedLeadGroup = useMemo(
    () => inbox.conversations.find(c => c.lead_id === inbox.selectedLeadId),
    [inbox.conversations, inbox.selectedLeadId]
  );

  // Default to the first source conversation if none selected
  useEffect(() => {
    if (selectedLeadGroup && !activeConversationId) {
      setActiveConversationId(selectedLeadGroup.source_conversations[0]?.id || null);
    }
  }, [selectedLeadGroup, activeConversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [inbox.messages]);

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return "agora";
    if (diff < 3600000) return `há ${Math.floor(diff / 60000)}min`;
    if (diff < 86400000) return `há ${Math.floor(diff / 3600000)}h`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d atrás`;
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };

  const filteredConversations = useMemo(() => {
    let result = inbox.conversations;
    
    // Status-based Tab Filtering (Chatwoot style)
    if (inboxTab === "abertas") {
      result = result.filter(t => t.status === "open");
    } else if (inboxTab === "resolvidas") {
      result = result.filter(t => t.status === "resolved");
    } else if (inboxTab === "adiadas") {
      result = result.filter(t => t.status === "snoozed");
    }

    if (channelFilter !== "all") {
      result = result.filter(t => t.channels.includes(channelFilter));
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

  const handleCreateConversation = async () => {
    const lead = leads.find(l => l.id === newLeadId);
    const phone = newPhone || lead?.phone || "";
    const email = newEmail || lead?.email || "";
    const name = lead?.name || phone || email || "Nova conversa";

    const id = await inbox.createConversation(newChannel, newLeadId || undefined, phone, email, name);
    if (id) {
      // The hook will auto-select the lead
      setNewConvOpen(false);
      setNewLeadId("");
      setNewPhone("");
      setNewEmail("");
    }
  };

  // Find lead data for selected conversation
  const selectedLead = useMemo(() => {
    if (!selectedLeadGroup?.lead_id) return null;
    return leads.find(l => l.id === selectedLeadGroup.lead_id) || null;
  }, [selectedLeadGroup, leads]);

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
              <div className="flex gap-1 p-1 bg-secondary/50 rounded-lg">
                {[
                  { key: "abertas", label: "Abertas" },
                  { key: "resolvidas", label: "Resolvidas" },
                  { key: "adiadas", label: "Adiadas" },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setInboxTab(tab.key)}
                    className={`px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all ${
                      inboxTab === tab.key
                        ? "bg-background text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
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
                  key={c.lead_id}
                  onClick={() => {
                    inbox.selectLead(c.lead_id);
                    setActiveConversationId(c.source_conversations[0]?.id || null);
                  }}
                  className={`w-full flex items-start gap-3 p-3 text-left hover:bg-secondary transition-all duration-200 border-b border-border/50 relative ${
                    inbox.selectedLeadId === c.lead_id ? "bg-primary/5 shadow-[inset_3px_0_0_0_#9b87f5]" : ""
                  }`}
                >
                  <div className="relative">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-xs font-semibold text-primary shadow-sm relative overflow-visible">
                      {initials(c.lead_name || "?")}
                      {/* Status indicator */}
                      <div className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background shadow-sm ${c.unread_count > 0 ? "bg-success" : "bg-muted-foreground/40"}`} />
                    </div>
                    <div className="absolute -bottom-1 -left-1 flex -space-x-1">
                      {c.channels.slice(0, 2).map((ch, idx) => {
                        const Icon = channelIcons[ch] || MessageCircle;
                        return (
                          <div key={idx} className={`h-4 w-4 rounded-full border-2 border-background flex items-center justify-center ${channelColors[ch] || "bg-muted shadow-sm"}`}>
                            <Icon className="h-2 w-2 text-white" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className={`text-[13px] font-bold truncate ${c.unread_count > 0 ? "text-foreground" : "text-foreground/80"}`}>{c.lead_name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0 font-medium">{formatTime(c.last_message_at)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {c.last_message && c.unread_count === 0 && (
                        <CheckCheck className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                      )}
                      <p className={`text-[11px] truncate leading-tight ${c.unread_count > 0 ? "text-foreground font-bold" : "text-muted-foreground"}`}>
                        {c.last_message || "Sem mensagens"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <ConversationStatusBadge status={c.status} />
                      <PriorityBadge priority={c.priority} />
                      {c.channels.map(ch => {
                         const Icon = channelIcons[ch] || MessageCircle;
                         return <Icon key={ch} className="h-2.5 w-2.5 text-muted-foreground/60" />;
                      })}
                    </div>
                  </div>
                  {c.unread_count > 0 && (
                    <div className="flex flex-col items-end gap-2 self-center">
                      <div className="h-5 min-w-[20px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1.5 shadow-md animate-in zoom-in duration-300">
                        {c.unread_count}
                      </div>
                      <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* ─── Chat area ─── */}
        <div className="flex-1 flex flex-col min-w-0 bg-background relative">
          {selectedLeadGroup ? (
            <>
              {/* Chat header */}
              <div className="px-4 py-2.5 ghost-border border-b flex items-center justify-between shrink-0 bg-card/50 backdrop-blur-sm z-10">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative group cursor-pointer shrink-0" onClick={() => setShowSidebar(!showSidebar)}>
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-xs font-semibold text-primary shadow-sm group-hover:shadow-md transition-all">
                      {initials(selectedLeadGroup.lead_name || "?")}
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-background flex items-center justify-center overflow-hidden">
                      {(() => {
                        const Icon = channelIcons[selectedLeadGroup.channels[0]] || MessageCircle;
                        return <Icon className={`h-full w-full p-0.5 text-white ${channelColors[selectedLeadGroup.channels[0]]}`} />;
                      })()}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{selectedLeadGroup.lead_name}</p>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-success/10 border border-success/20 shrink-0">
                        <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                        <span className="text-[9px] font-bold text-success uppercase">Online</span>
                      </div>
                      <ConversationStatusBadge status={selectedLeadGroup.status} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-[10px] text-muted-foreground">
                        {selectedLeadGroup.channels.map(ch => channelLabels[ch]).join(" & ")}
                      </p>
                      {leadColumn && (
                        <>
                          <span className="text-muted-foreground/40 text-[10px]">·</span>
                          <p className="text-[10px] font-medium text-primary">{leadColumn.name}</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 p-1 bg-secondary/30 rounded-xl border border-border/20">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-[10px] font-bold gap-1.5 hover:bg-green-500/10 hover:text-green-600 transition-colors rounded-lg"
                      onClick={() => inbox.updateStatus(inbox.selectedLeadId!, "resolved")}
                    >
                      <CheckSquare className="h-3 w-3" /> Resolver
                    </Button>
                    <div className="w-px h-4 bg-border/50" />
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-[10px] font-bold gap-1.5 hover:bg-primary/10 hover:text-primary transition-colors rounded-lg"
                      onClick={() => inbox.updateStatus(inbox.selectedLeadId!, "snoozed")}
                    >
                      <Clock className="h-3 w-3" /> Adiar
                    </Button>
                  </div>
                  <ConversationActions 
                    conversation={selectedLeadGroup} 
                    onRefresh={() => inbox.refresh()} 
                    onUpdateStatus={inbox.updateStatus}
                    onUpdatePriority={inbox.updatePriority}
                    onAssignToAgent={inbox.assignToAgent}
                    onUpdateLabels={inbox.updateLabels}
                  />
                </div>
              </div>

              {/* Messages timeline */}
              <div className="flex-1 overflow-auto p-4 space-y-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent">
                {inbox.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                      <MessageSquare className="h-8 w-8 text-muted-foreground/20" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Nenhuma mensagem ainda</p>
                    <p className="text-xs text-muted-foreground mt-1">Inicie a conversa enviando uma mensagem abaixo</p>
                  </div>
                ) : (
                  <>
                    {inbox.messages.map((msg, i) => {
                      const isOutbound = msg.direction === "outbound";
                      const prevMsg = i > 0 ? inbox.messages[i - 1] : null;
                      const nextMsg = i < inbox.messages.length - 1 ? inbox.messages[i + 1] : null;
                      
                      const msgDate = new Date(msg.created_at).toLocaleDateString("pt-BR");
                      const prevDate = prevMsg ? new Date(prevMsg.created_at).toLocaleDateString("pt-BR") : null;
                      const showDate = !prevDate || msgDate !== prevDate;
                      
                      const isConsecutivePrev = prevMsg && prevMsg.direction === msg.direction && 
                        (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 60000) &&
                        prevMsg.is_private === msg.is_private;
                      
                      const isConsecutiveNext = nextMsg && nextMsg.direction === msg.direction && 
                        (new Date(nextMsg.created_at).getTime() - new Date(msg.created_at).getTime() < 60000) &&
                        nextMsg.is_private === msg.is_private;

                      const ChannelIcon = channelIcons[msg.channel || ""] || MessageCircle;
                      
                      // Chat scope bubble styling
                      let borderRadius = "rounded-2xl";
                      if (isOutbound) {
                        if (!isConsecutivePrev && !isConsecutiveNext) borderRadius = "rounded-2xl rounded-br-none";
                        else if (!isConsecutivePrev && isConsecutiveNext) borderRadius = "rounded-2xl rounded-br-none";
                        else if (isConsecutivePrev && isConsecutiveNext) borderRadius = "rounded-2xl rounded-tr-sm rounded-br-sm";
                        else if (isConsecutivePrev && !isConsecutiveNext) borderRadius = "rounded-2xl rounded-tr-sm";
                      } else {
                        if (!isConsecutivePrev && !isConsecutiveNext) borderRadius = "rounded-2xl rounded-bl-none";
                        else if (!isConsecutivePrev && isConsecutiveNext) borderRadius = "rounded-2xl rounded-bl-none";
                        else if (isConsecutivePrev && isConsecutiveNext) borderRadius = "rounded-2xl rounded-tl-sm rounded-bl-sm";
                        else if (isConsecutivePrev && !isConsecutiveNext) borderRadius = "rounded-2xl rounded-tl-sm";
                      }

                      return (
                        <div key={msg.id} className={showDate ? "pt-2" : ""}>
                          {showDate && (
                            <div className="flex items-center gap-4 my-6">
                              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest bg-background px-2">{msgDate}</span>
                              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                            </div>
                          )}
                          <div className={`flex items-end gap-2 ${isConsecutivePrev ? "mt-0.5" : "mt-4"} ${isOutbound ? "justify-end" : "justify-start"}`}>
                            {!isOutbound && !isConsecutivePrev && (
                              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mb-1">
                                {initials(selectedLeadGroup.lead_name || "?")}
                              </div>
                            )}
                            {isOutbound && isConsecutivePrev && <div className="w-6" />}
                            
                            <div className={`relative group max-w-[70%]`}>
                              {msg.is_private && !isConsecutivePrev && (
                                <div className="flex items-center gap-1 px-2 mb-1">
                                  <Lock className="h-2.5 w-2.5 text-amber-600" />
                                  <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wider">Nota Privada</span>
                                </div>
                              )}
                              <div className={`px-4 py-2.5 text-sm leading-relaxed shadow-sm transition-all duration-200 ${borderRadius} ${
                                msg.is_private
                                  ? "bg-amber-100 border border-amber-200 text-amber-900"
                                  : isOutbound
                                    ? "bg-muted border border-border text-foreground"
                                    : "bg-primary text-primary-foreground font-medium"
                              }`}>
                                {msg.type === "image" && (
                                  <div className="relative group/media mb-1 -mx-2 -mt-1 overflow-hidden rounded-lg cursor-pointer" onClick={() => setMediaViewer({ url: msg.content, type: "image", id: msg.id, metadata: msg.metadata as Record<string, any> })}>
                                    <img src={msg.content} alt="Imagem" className="max-w-full h-auto object-cover max-h-64 rounded-lg hover:scale-105 transition-transform duration-500" />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center">
                                      <Maximize2 className="h-6 w-6 text-white" />
                                    </div>
                                  </div>
                                )}

                                {msg.type === "sticker" && (
                                  <div className="flex justify-center p-1 -mx-2 -mt-1 cursor-pointer" onClick={() => setMediaViewer({ url: msg.content, type: "image", id: msg.id, metadata: msg.metadata as Record<string, any> })}>
                                    <img src={msg.content} alt="Sticker" className="w-32 h-32 object-contain hover:scale-110 transition-transform" />
                                  </div>
                                )}

                                {msg.type === "video" && (() => {
                                  const videoUrl = msg.content;
                                  const hasValidUrl = videoUrl && !videoUrl.startsWith("[") && !videoUrl.includes(".enc");
                                  return (
                                    <div className="relative group/media mb-1 -mx-2 -mt-1 overflow-hidden rounded-lg cursor-pointer" onClick={() => setMediaViewer({ url: videoUrl, type: "video", id: msg.id, metadata: msg.metadata as Record<string, any> })}>
                                      {hasValidUrl ? (
                                        <video src={videoUrl} preload="metadata" muted playsInline className="max-w-full h-auto max-h-64 rounded-lg bg-black" onLoadedMetadata={(e) => {
                                          const v = e.target as HTMLVideoElement;
                                          v.currentTime = 1;
                                        }} />
                                      ) : (
                                        <div className="w-full h-40 bg-black rounded-lg flex items-center justify-center">
                                          <span className="text-white/50 text-xs">Vídeo</span>
                                        </div>
                                      )}
                                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <div className="h-14 w-14 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                                          <PlayCircle className="h-8 w-8 text-white drop-shadow-lg" />
                                        </div>
                                      </div>
                                      {msg.metadata?.seconds && (
                                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                                          {Math.floor(Number(msg.metadata.seconds) / 60)}:{String(Number(msg.metadata.seconds) % 60).padStart(2, '0')}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}

                                {msg.type === "location" && (
                                  <a 
                                    href={`https://www.google.com/maps/search/?api=1&query=${msg.metadata?.latitude || ''},${msg.metadata?.longitude || ''}`}
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl border border-border/50 hover:bg-secondary/50 transition-all group"
                                  >
                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                      <MapPin className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[11px] font-bold truncate">{msg.metadata?.name || "Localização"}</p>
                                      <p className="text-[9px] text-muted-foreground uppercase truncate">{msg.metadata?.address || "Ver no Google Maps"}</p>
                                    </div>
                                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                  </a>
                                )}

                                {msg.type === "contact" && (
                                  <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl border border-border/50 group/contact">
                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover/contact:bg-primary group-hover/contact:text-white transition-colors">
                                      <UserSquare2 className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[11px] font-bold truncate">{msg.metadata?.sender_name || msg.sender_name || "Contato"}</p>
                                      <p className="text-[9px] text-muted-foreground uppercase truncate">VCard / Contato</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => toast.info("Função de salvar contato em breve")}>
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}

                                {msg.type === "audio" && (() => {
                                  const audioId = `audio-${msg.id}`;
                                  const duration = msg.metadata?.seconds ? Number(msg.metadata.seconds) : 0;
                                  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
                                  return (
                                    <div className="space-y-2 py-1">
                                      <div className={`flex items-center gap-3 p-2.5 rounded-2xl min-w-[220px] ${!isOutbound ? 'bg-white/15' : 'bg-secondary/60 border border-border/50'}`}>
                                        <button
                                          className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-all shadow-md ${!isOutbound ? 'bg-white/25 hover:bg-white/35 text-white' : 'bg-primary/15 hover:bg-primary/25 text-primary'}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const audio = document.getElementById(audioId) as HTMLAudioElement;
                                            if (audio) { if (audio.paused) { audio.play(); } else { audio.pause(); } }
                                          }}
                                        >
                                          <PlayCircle className="h-5 w-5" />
                                        </button>
                                        <div className="flex-1 min-w-0 space-y-1.5">
                                          <div className={`h-1.5 rounded-full overflow-hidden ${!isOutbound ? 'bg-white/20' : 'bg-border'}`}>
                                            <div className="h-full w-0 rounded-full bg-current transition-all" id={`progress-${msg.id}`} />
                                          </div>
                                          <div className="flex items-center justify-between">
                                            <span className={`text-[9px] font-bold ${isOutbound ? 'text-white/60' : 'text-muted-foreground'}`} id={`time-${msg.id}`}>0:00</span>
                                            <span className={`text-[9px] font-bold ${isOutbound ? 'text-white/60' : 'text-muted-foreground'}`}>{duration ? formatTime(duration) : '--:--'}</span>
                                          </div>
                                        </div>
                                        <audio
                                          id={audioId}
                                          src={msg.content}
                                          preload="metadata"
                                          onTimeUpdate={(e) => {
                                            const a = e.target as HTMLAudioElement;
                                            const pct = a.duration ? (a.currentTime / a.duration) * 100 : 0;
                                            const bar = document.getElementById(`progress-${msg.id}`);
                                            const timeEl = document.getElementById(`time-${msg.id}`);
                                            if (bar) bar.style.width = `${pct}%`;
                                            if (timeEl) timeEl.textContent = formatTime(a.currentTime);
                                          }}
                                          onEnded={() => {
                                            const bar = document.getElementById(`progress-${msg.id}`);
                                            if (bar) bar.style.width = '0%';
                                          }}
                                          className="hidden"
                                        />
                                      </div>
                                      {!msg.metadata?.transcript && (
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="h-7 text-[10px] gap-1.5 font-bold hover:bg-primary/10 hover:text-primary"
                                          onClick={async () => {
                                            setIsTranscribing(msg.id);
                                            await inbox.transcribeAudio(msg.id);
                                            setIsTranscribing(null);
                                          }}
                                          disabled={isTranscribing === msg.id}
                                        >
                                          {isTranscribing === msg.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Activity className="h-3 w-3" />}
                                          {isTranscribing === msg.id ? "TRANSCREVENDO..." : "TRANSCREVER ÁUDIO"}
                                        </Button>
                                      )}
                                      {msg.metadata?.transcript && (
                                        <div className={`mt-1 p-2.5 rounded-xl italic text-[11px] leading-snug ${isOutbound ? 'bg-white/10 text-white/80' : 'bg-primary/5 border border-primary/10 text-foreground/80'}`}>
                                          "{msg.metadata.transcript}"
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}

                                {(msg.type === "file" || msg.type === "document") && (
                                  <div className="flex items-center gap-3 p-2 bg-secondary/30 rounded-xl border border-border/50 group/file">
                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover/file:bg-primary group-hover/file:text-white transition-colors">
                                      <File className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[11px] font-bold truncate">{msg.metadata?.filename || "Documento"}</p>
                                      <p className="text-[9px] text-muted-foreground uppercase">{msg.metadata?.size || "Ver arquivo"}</p>
                                    </div>
                                    <a href={msg.content} download target="_blank" rel="noopener noreferrer" className="h-8 w-8 rounded-lg bg-background flex items-center justify-center text-muted-foreground hover:text-primary hover:shadow-sm transition-all">
                                      <Download className="h-4 w-4" />
                                    </a>
                                  </div>
                                )}

                                {(msg.type === "text" || !msg.type) && msg.content}
                                
                                <div className={`flex items-center justify-end gap-1.5 mt-1 opacity-70`}>
                                  <span className="text-[9px] font-medium">
                                    {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                  {isOutbound && !msg.is_private && (
                                    <div className="flex items-center ml-0.5">
                                      {msg.metadata?.status === "read" ? (
                                        <CheckCheck className="h-3 w-3 text-white" />
                                      ) : msg.metadata?.status === "delivered" ? (
                                        <CheckCheck className="h-3 w-3 opacity-60" />
                                      ) : (
                                        <Check className="h-3 w-3 opacity-60" />
                                      )}
                                    </div>
                                  )}
                                  {!isOutbound && !msg.is_private && <ChannelIcon className="h-2.5 w-2.5 opacity-60" />}
                                </div>
                              </div>
                            </div>

                            {isOutbound && !isConsecutivePrev && (
                              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mb-1 ${
                                msg.is_private ? "bg-amber-500 text-white" : "bg-secondary text-muted-foreground"
                              }`}>
                                VC
                              </div>
                            )}
                            {!isOutbound && isConsecutivePrev && <div className="w-6" />}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              <ReplyBox
                onSend={async (text, isPrivate, targetId) => {
                  setSending(true);
                  try {
                    await inbox.sendMessage(text, targetId, isPrivate);
                  } finally {
                    setSending(false);
                  }
                }}
                onSendMedia={async (file, targetId) => {
                  setSending(true);
                  try {
                    await inbox.sendWhatsAppMedia(inbox.selectedLeadId!, file, targetId);
                  } finally {
                    setSending(false);
                  }
                }}
                sending={sending}
                sourceConversations={selectedLeadGroup.source_conversations}
                activeConversationId={activeConversationId || undefined}
                setActiveConversationId={id => setActiveConversationId(id)}
                leadName={selectedLeadGroup.lead_name}
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent">
              <div className="h-20 w-20 rounded-3xl bg-secondary flex items-center justify-center mb-6 animate-pulse">
                <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Sua Inbox</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs text-center">Selecione um lead ao lado para visualizar o histórico de mensagens e responder.</p>
              <Button size="sm" variant="outline" className="mt-6 text-xs shadow-sm rounded-xl px-4" onClick={() => setNewConvOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5 text-primary" /> Nova conversa
              </Button>
            </div>
          )}
        </div>

        {/* ─── Lead context panel (Retractable) ─── */}
        <div 
          className={`ghost-border border-l bg-card overflow-hidden transition-all duration-300 ease-in-out flex flex-col shrink-0 ${
            showSidebar && selectedLeadGroup ? "w-80 opacity-100" : "w-0 opacity-0 border-none"
          }`}
        >
          {selectedLeadGroup && (
            <div className="w-80 flex flex-col h-full">
              <div className="p-5 ghost-border border-b bg-gradient-to-b from-primary/5 to-transparent">
                <div className="flex flex-col items-center text-center mb-4">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-xl font-bold text-primary-foreground shadow-lg mb-3 transform rotate-3 hover:rotate-0 transition-transform">
                    {initials(selectedLead?.name || selectedLeadGroup.lead_name)}
                  </div>
                  <h3 className="text-sm font-bold text-foreground line-clamp-1">{selectedLead?.name || selectedLeadGroup.lead_name}</h3>
                  {selectedLead?.company && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Building className="h-2.5 w-2.5" /> {selectedLead.company}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
                    <ConversationStatusBadge status={selectedLeadGroup.status} />
                    <PriorityBadge priority={selectedLeadGroup.priority} />
                    {selectedLead?.value && (
                      <span className="text-[9px] font-bold bg-success/15 text-success border border-success/20 px-2 py-0.5 rounded-full shadow-sm">
                        R$ {selectedLead.value.toLocaleString("pt-BR")}
                      </span>
                    )}
                  </div>
                </div>
                {selectedLead ? (
                  <Button variant="outline" size="sm" className="w-full text-[11px] gap-2 h-8 rounded-xl border-border/50 hover:bg-primary/5 hover:text-primary transition-all" onClick={() => navigate(`/leads/${selectedLead.id}`)}>
                    <User className="h-3.5 w-3.5" /> Ver perfil completo
                  </Button>
                ) : (
                  <div className="text-[10px] text-muted-foreground text-center py-2 px-4 bg-muted/30 rounded-xl">
                    Contato ainda não vinculado a um Lead no CRM.
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-auto no-scrollbar">
                <div className="p-5 space-y-6">
                  {/* Pipeline Stage */}
                  {selectedLead && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                        <ArrowRight className="h-3 w-3" /> Estágio no Funil
                      </p>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="w-full flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-background hover:border-primary/30 transition-all group">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-2 w-2 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: leadColumn?.color || "#9b87f5" }} />
                              <span className="text-xs font-semibold text-foreground truncate">{leadColumn?.name || "Sem estágio"}</span>
                            </div>
                            <MoreVertical className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-64 p-1.5 rounded-xl border-border/50 shadow-xl">
                          {columns.map(col => (
                            <DropdownMenuItem
                              key={col.id}
                              className={`text-xs gap-2.5 p-2.5 rounded-lg transition-colors ${col.id === selectedLead.column_id ? "bg-primary/10 text-primary font-bold" : "hover:bg-secondary"}`}
                              disabled={col.id === selectedLead.column_id}
                              onClick={() => moveLead(selectedLead.id, col.id)}
                            >
                              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: col.color }} />
                              {col.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}

                  {/* Contact Details */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Contato</p>
                    <div className="space-y-2">
                      {selectedLeadGroup.lead_phone && (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 border border-transparent hover:border-border/50 transition-all group">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[11px] text-foreground font-medium truncate">{selectedLeadGroup.lead_phone}</span>
                          </div>
                          <MessageCircle className="h-3 w-3 text-success opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )}
                      {selectedLeadGroup.lead_email && (
                        <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 border border-transparent hover:border-border/50 transition-all group">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[11px] text-foreground font-medium truncate">{selectedLeadGroup.lead_email}</span>
                          </div>
                          <ExternalLink className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Lead Analytics (Inspired by Chatwoot) */}
                  <div className="space-y-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                       <Activity className="h-3.5 w-3.5" /> Estatísticas do Lead
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 bg-secondary/20 rounded-xl border border-border/50">
                        <p className="text-[9px] text-muted-foreground uppercase font-bold">Mensagens</p>
                        <p className="text-lg font-heading font-bold text-primary">{inbox.messages.length}</p>
                      </div>
                      <div className="p-3 bg-secondary/20 rounded-xl border border-border/50">
                        <p className="text-[9px] text-muted-foreground uppercase font-bold">Canais</p>
                        <p className="text-lg font-heading font-bold text-primary">{selectedLeadGroup.channels.length}</p>
                      </div>
                    </div>
                    <div className="space-y-2.5 px-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">Primeiro Contato</span>
                        <span className="font-bold text-foreground/80">{inbox.messages.length > 0 ? new Date(inbox.messages[0].created_at).toLocaleDateString("pt-BR") : "N/A"}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">Última Interação</span>
                        <span className="font-bold text-foreground/80">{selectedLeadGroup.last_message_at ? new Date(selectedLeadGroup.last_message_at).toLocaleDateString("pt-BR") : "N/A"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tasks */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                        <CheckSquare className="h-3 w-3" /> Tarefas Próximas
                      </p>
                      <button onClick={() => setTaskModalOpen(true)} className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {leadTasks.length > 0 ? (
                        leadTasks.slice(0, 3).map(task => (
                          <div key={task.id} className="group flex items-start gap-3 p-2.5 rounded-xl border border-border/30 bg-background hover:bg-secondary/20 transition-all">
                            <button
                              onClick={() => toggleTaskStatus(task.id)}
                              className={`mt-0.5 h-4 w-4 rounded-lg border-2 flex items-center justify-center transition-all ${
                                task.status === "completed" 
                                  ? "bg-success border-success text-white shadow-sm" 
                                  : "border-border group-hover:border-primary/50"
                              }`}
                            >
                              {task.status === "completed" && <Plus className="h-3 w-3 rotate-45" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`text-[11px] leading-tight font-semibold ${task.status === "completed" ? "text-muted-foreground line-through decoration-muted-foreground/30" : "text-foreground"}`}>
                                {task.title}
                              </p>
                              {task.due_date && (
                                <p className="text-[9px] text-muted-foreground mt-1 font-medium">Prazo: {new Date(task.due_date).toLocaleDateString("pt-BR")}</p>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 rounded-xl border border-dashed border-border/50">
                          <CheckSquare className="h-5 w-5 text-muted-foreground/20 mx-auto mb-1" />
                          <p className="text-[10px] text-muted-foreground italic">Foco total! Nenhuma tarefa pendente.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Labels (Chatwoot style) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                         <Tags className="h-3 w-3" /> Etiquetas de Conversa
                      </p>
                      <LabelSelector 
                        conversationId={selectedLeadGroup.source_conversations[0]?.id}
                        selectedLabels={selectedLeadGroup.labels || []}
                        onLabelsChange={() => inbox.refresh()}
                        onUpdateLabels={inbox.updateLabels}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedLeadGroup.labels && selectedLeadGroup.labels.length > 0 ? (
                        selectedLeadGroup.labels.map(label => (
                          <span 
                            key={label.id} 
                            style={{ backgroundColor: label.color + '20', color: label.color, borderColor: label.color + '40' }}
                            className="text-[9px] font-bold border rounded-lg px-2 py-0.5 shadow-sm"
                          >
                            {label.name}
                          </span>
                        ))
                      ) : (
                        <p className="text-[10px] text-muted-foreground italic pl-1">Sem etiquetas vinculadas...</p>
                      )}
                    </div>
                  </div>

                  {/* Tags (Lead focus) */}
                  {selectedLead && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                           <Tag className="h-3 w-3" /> Tags do Lead
                        </p>
                        <button onClick={() => setTagModalOpen(true)} className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedLead.tags.length > 0 ? (
                          selectedLead.tags.map(tag => (
                            <span key={tag} className="text-[9px] font-bold bg-primary/5 text-primary border border-primary/20 rounded-lg px-2 py-0.5 shadow-sm">{tag}</span>
                          ))
                        ) : (
                          <p className="text-[10px] text-muted-foreground italic pl-1">Organize seu lead com tags...</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="p-5 ghost-border border-t bg-secondary/10 space-y-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs font-bold gap-2 h-10 rounded-xl border-border/50 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all shadow-sm"
                  onClick={() => navigate(`/clients?search=${selectedLeadGroup.lead_name}`)}
                >
                  <ExternalLink className="h-3.5 w-3.5" /> VER NO CRM
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-xs font-bold gap-2 h-10 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive transition-all"
                  onClick={() => toast.success("Conversa arquivada")}
                >
                  <Search className="h-3.5 w-3.5 rotate-45" /> Arquivar Chat
                </Button>
              </div>
            </div>
          )}
        </div>
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
      {/* Media Viewer Lightbox */}
      {mediaViewer && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-[101]">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                {mediaViewer.type === "image" ? <Maximize2 className="h-5 w-5" /> : <PlayCircle className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-white text-sm font-bold uppercase tracking-wider">{mediaViewer.type}</p>
                <p className="text-white/40 text-[10px]">{currentMediaIndex + 1} de {allMedia.length} arquivos</p>
                {mediaViewer.metadata?.caption && (
                  <p className="text-white/60 text-[10px] truncate max-w-[200px] italic mt-0.5">"{mediaViewer.metadata.caption}"</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-10 text-[10px] font-bold gap-2 text-white hover:bg-white/10"
                onClick={() => window.open(mediaViewer.url, '_blank')}
              >
                <ExternalLink className="h-3.5 w-3.5" /> ABRIR ORIGINAL
              </Button>
              <div className="w-px h-6 bg-white/10 mx-2" />
              <a 
                href={mediaViewer.url} 
                download 
                className="h-12 px-6 rounded-xl bg-white/10 hover:bg-white/20 transition-all flex items-center gap-2 text-white text-sm font-bold shadow-xl backdrop-blur-sm border border-white/5"
              >
                <Download className="h-5 w-5" /> BAIXAR
              </a>
              <button 
                onClick={() => setMediaViewer(null)}
                className="h-12 w-12 rounded-xl bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center text-white shadow-xl backdrop-blur-sm border border-white/5"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
          
          <div className="relative group/gallery w-full h-full flex items-center justify-center">
            {/* Gallery Navigation */}
            {currentMediaIndex > 0 && (
              <button 
                onClick={() => navigateMedia("prev")}
                className="absolute left-6 h-14 w-14 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all border border-white/10 backdrop-blur-sm group-hover/gallery:translate-x-0 -translate-x-4 opacity-0 group-hover/gallery:opacity-100"
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
            )}
            
            {currentMediaIndex < allMedia.length - 1 && (
              <button 
                onClick={() => navigateMedia("next")}
                className="absolute right-6 h-14 w-14 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all border border-white/10 backdrop-blur-sm group-hover/gallery:translate-x-0 translate-x-4 opacity-0 group-hover/gallery:opacity-100"
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            )}

            <div className="max-w-[90vw] max-h-[75vh] overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/10 bg-black/40 flex items-center justify-center">
              {mediaViewer.type === "image" || mediaViewer.type === "sticker" ? (
                <div className="relative group/img">
                  <img src={mediaViewer.url} alt="Full view" className="max-w-full max-h-full object-contain" onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "https://placehold.co/600x400?text=Erro+ao+carregar+imagem";
                  }} />
                  {mediaViewer.metadata?.caption && (
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-white text-center">
                      <p className="text-sm font-medium">{mediaViewer.metadata.caption}</p>
                    </div>
                  )}
                </div>
              ) : mediaViewer.type === "video" ? (
                <div className="relative">
                  <video src={mediaViewer.url} controls autoPlay className="max-w-full max-h-full" />
                  {mediaViewer.metadata?.caption && (
                    <div className="absolute bottom-12 left-0 right-0 p-4 bg-black/40 text-white text-center">
                      <p className="text-xs font-medium">{mediaViewer.metadata.caption}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-20 bg-secondary/20 flex flex-col items-center gap-6">
                  <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <File className="h-12 w-12" />
                  </div>
                  <div className="text-center">
                    <p className="text-white text-xl font-bold">Arquivo de Documento</p>
                    <p className="text-white/40 text-sm mt-1">Este formato não pode ser visualizado diretamente aqui.</p>
                  </div>
                  <Button className="font-bold px-8 gap-2" onClick={() => window.open(mediaViewer.url, '_blank')}>
                    <ExternalLink className="h-4 w-4" /> VER NO NAVEGADOR
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
