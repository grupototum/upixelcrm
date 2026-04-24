import { useState, useRef } from "react";
import { Plus, Send, Loader2, Sparkles, MessageCircle, Mail, MessageSquare, Lock, Smile, Paperclip as AttachIcon, Shield, ChevronDown, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CannedResponsePicker } from "./CannedResponsePicker";
import { MessageTemplatePopover } from "./MessageTemplatePopover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface ReplyBoxProps {
  onSend: (text: string, isPrivate: boolean, targetConversationId?: string) => Promise<void>;
  onSendMedia: (file: File, targetConversationId?: string) => Promise<void>;
  sending: boolean;
  sourceConversations: any[];
  activeConversationId?: string;
  setActiveConversationId: (id: string) => void;
  leadName?: string;
  leadPhone?: string;
  leadEmail?: string;
  onAddChannel?: (channel: string) => Promise<void>;
}

const channelConfig: Record<string, { icon: any; label: string; color: string }> = {
  whatsapp: { icon: MessageCircle, label: "WhatsApp", color: "text-emerald-500" },
  whatsapp_official: { icon: Shield, label: "WA Oficial", color: "text-emerald-600" },
  email: { icon: Mail, label: "E-mail", color: "text-blue-500" },
  instagram: { icon: Instagram, label: "Instagram", color: "text-pink-500" },
  webchat: { icon: MessageSquare, label: "Webchat", color: "text-violet-500" },
};

const allChannels = ["whatsapp", "whatsapp_official", "email", "instagram", "webchat"];

export function ReplyBox({
  onSend,
  onSendMedia,
  sending,
  sourceConversations,
  activeConversationId,
  setActiveConversationId,
  leadName,
  leadPhone,
  leadEmail,
  onAddChannel,
}: ReplyBoxProps) {
  const [message, setMessage] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [showCannedPicker, setShowCannedPicker] = useState(false);
  const [cannedSearch, setCannedSearch] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const activeSource = sourceConversations.find(sc => sc.id === activeConversationId);
  const firstConversation = sourceConversations.length > 0 ? sourceConversations[0] : null;
  const activeChannel = activeSource?.channel || firstConversation?.channel || "whatsapp";
  const activeConfig = channelConfig[activeChannel] || channelConfig.whatsapp;
  const ActiveIcon = activeConfig.icon;

  // Channels not yet in source_conversations
  const existingChannels = sourceConversations.map(sc => sc.channel);
  const availableNewChannels = allChannels.filter(ch => !existingChannels.includes(ch));

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMessage(val);
    const lastWord = val.split(" ").pop() || "";
    if (lastWord.startsWith("/")) {
      setShowCannedPicker(true);
      setCannedSearch(lastWord.slice(1));
    } else {
      setShowCannedPicker(false);
    }
  };

  const handleSelectCanned = (content: string) => {
    const words = message.split(" ");
    words.pop();
    const newMessage = [...words, content].join(" ").trim();
    setMessage(newMessage);
    setShowCannedPicker(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !showCannedPicker) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape") {
      setShowCannedPicker(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    if (!isPrivate && !activeConversationId) {
      toast.error("Selecione um canal para enviar a mensagem.");
      return;
    }
    await onSend(message, isPrivate, activeConversationId);
    setMessage("");
    setShowCannedPicker(false);
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!activeConversationId) {
      toast.error("Selecione um canal para enviar a mídia.");
      return;
    }

    try {
      await onSendMedia(file, activeConversationId);
    } catch (err) {
      toast.error("Erro ao enviar mídia. Tente novamente.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddChannel = async (channel: string) => {
    if (onAddChannel) {
      await onAddChannel(channel);
    }
  };

  return (
    <div className={`p-4 border-t transition-colors duration-200 ${isPrivate ? "bg-amber-50/50 border-amber-200" : "bg-card/50"}`}>
      <div className="max-w-4xl mx-auto space-y-3 relative">
        
        {showCannedPicker && (
          <CannedResponsePicker 
            searchQuery={cannedSearch} 
            onSelect={handleSelectCanned} 
            onClose={() => setShowCannedPicker(false)} 
          />
        )}

        {/* Header: Mode & Channel Selector */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            {/* Reply / Private Note toggle */}
            <div className="flex items-center gap-1.5 p-1 bg-secondary/30 rounded-2xl border border-border/20">
              <button
                onClick={() => setIsPrivate(false)}
                className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-xl transition-all duration-200 ${
                  !isPrivate ? "bg-background text-primary shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Resposta
              </button>
              <button
                onClick={() => setIsPrivate(true)}
                className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-xl transition-all duration-200 flex items-center gap-1.5 ${
                  isPrivate ? "bg-amber-500 text-white shadow-md" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Lock className="h-2.5 w-2.5" /> Nota Privada
              </button>
            </div>
          </div>

          {/* Channel Selector Dropdown */}
          {!isPrivate && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/30 border border-border/20 hover:bg-secondary/50 transition-all text-[10px] font-bold uppercase tracking-wider">
                  <ActiveIcon className={`h-3.5 w-3.5 ${activeConfig.color}`} />
                  <span className="text-foreground">{activeConfig.label}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                  Canais conectados
                </DropdownMenuLabel>
                {sourceConversations.map(sc => {
                  const config = channelConfig[sc.channel] || channelConfig.whatsapp;
                  const Icon = config.icon;
                  const identifier = sc.metadata?.phone || sc.metadata?.email || sc.channel;
                  const isActive = sc.id === activeConversationId;
                  return (
                    <DropdownMenuItem
                      key={sc.id}
                      onSelect={() => setActiveConversationId(sc.id)}
                      className={`flex items-center gap-2.5 text-xs cursor-pointer ${isActive ? "bg-primary/10 text-primary font-bold" : ""}`}
                    >
                      <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold">{config.label}</span>
                        <span className="text-muted-foreground ml-1.5 text-[10px]">{identifier}</span>
                      </div>
                      {isActive && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    </DropdownMenuItem>
                  );
                })}

                {/* Add new channel */}
                {availableNewChannels.length > 0 && onAddChannel && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                      Adicionar canal
                    </DropdownMenuLabel>
                    {availableNewChannels.map(ch => {
                      const config = channelConfig[ch];
                      const Icon = config.icon;
                      // Only show channels that make sense for this lead
                      const canAdd = (ch === "email" && leadEmail) || 
                                     ((ch === "whatsapp" || ch === "whatsapp_official") && leadPhone) ||
                                     ch === "webchat" || ch === "instagram";
                      if (!canAdd) return null;
                      return (
                        <DropdownMenuItem
                          key={ch}
                          onSelect={() => handleAddChannel(ch)}
                          className="flex items-center gap-2.5 text-xs cursor-pointer"
                        >
                          <Plus className="h-3 w-3 text-muted-foreground" />
                          <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                          <span>{config.label}</span>
                        </DropdownMenuItem>
                      );
                    })}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Input Area */}
        <div className={`relative rounded-3xl p-2 shadow-xl border transition-all duration-300 ${
          isPrivate 
            ? "bg-amber-50 border-amber-200 focus-within:border-amber-400 focus-within:ring-4 focus-within:ring-amber-500/10" 
            : "bg-background border-border/40 focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/10"
        }`}>
          <div className="flex items-end gap-2 px-1">
            <div className="flex items-center gap-1 pb-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:bg-secondary shrink-0 hover:text-primary transition-colors">
                <Plus className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full text-muted-foreground hover:bg-secondary shrink-0 hover:text-primary transition-colors"
                onClick={handleFileClick}
              >
                <AttachIcon className="h-4 w-4" />
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:bg-secondary shrink-0 hover:text-primary transition-colors">
                <Smile className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 min-h-[44px] flex flex-col justify-center">
              <Textarea
                ref={textareaRef}
                rows={1}
                className="w-full bg-transparent border-none focus-visible:ring-0 shadow-none py-2.5 text-sm min-h-[40px] max-h-[200px] resize-none overflow-y-auto custom-scrollbar"
                placeholder={isPrivate ? "Adicionar uma nota privada interna..." : `Responder via ${activeConfig.label} para ${leadName || "contato"}...`}
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
              />
            </div>

            <div className="flex items-center gap-2 pb-1 pr-1">
              {!isPrivate && (
                <div className="h-8 border-l border-border/50 mx-1" />
              )}
              {!isPrivate && <MessageTemplatePopover onSelect={body => setMessage(body)} />}
              
              <Button
                size="icon"
                className={`h-9 w-9 rounded-full shrink-0 shadow-lg transition-all active:scale-95 ${isPrivate ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20" : "bg-primary shadow-primary/20 hover:bg-primary-hover"}`}
                disabled={!message.trim() || sending}
                onClick={handleSend}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          {/* Internal Note indicator */}
          {isPrivate && (
            <div className="absolute -top-2.5 right-6 px-3 py-0.5 bg-amber-500 text-white text-[9px] font-bold uppercase rounded-full shadow-lg border border-amber-400 flex items-center gap-1">
              <Lock className="h-2 w-2" /> Agentes apenas
            </div>
          )}
        </div>

        {/* Tip */}
        <div className="flex items-center justify-between px-2">
          <p className="text-[10px] text-muted-foreground italic">
            Dica: Digite <span className="font-bold text-primary">/</span> para usar respostas rápidas.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-accent hover:text-accent hover:bg-accent/10 font-bold" onClick={() => toast.info("IA analisando histórico...")}>
              <Sparkles className="h-3 w-3" /> USAR IA
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
