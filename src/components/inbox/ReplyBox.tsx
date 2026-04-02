import { useState, useRef, useEffect } from "react";
import { Plus, Send, Loader2, Sparkles, MessageCircle, Mail, MessageSquare, Lock, X, Smile, Paperclip as AttachIcon, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CannedResponsePicker } from "./CannedResponsePicker";
import { MessageTemplatePopover } from "./MessageTemplatePopover";

interface ReplyBoxProps {
  onSend: (text: string, isPrivate: boolean, targetConversationId?: string) => Promise<void>;
  onSendMedia: (file: File, targetConversationId?: string) => Promise<void>;
  sending: boolean;
  sourceConversations: any[];
  activeConversationId?: string;
  setActiveConversationId: (id: string) => void;
  leadName?: string;
}

const channelIcons: Record<string, any> = {
  whatsapp: MessageCircle,
  whatsapp_official: Shield,
  email: Mail,
  instagram: MessageCircle,
  webchat: MessageSquare,
};

export function ReplyBox({ 
  onSend, 
  onSendMedia,
  sending, 
  sourceConversations, 
  activeConversationId, 
  setActiveConversationId,
  leadName 
}: ReplyBoxProps) {
  const [message, setMessage] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [showCannedPicker, setShowCannedPicker] = useState(false);
  const [cannedSearch, setCannedSearch] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMessage(val);

    // Detect "/" for canned response picker
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
    words.pop(); // remove the "/shortcode"
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
    await onSend(message, isPrivate, activeConversationId);
    setMessage("");
    setShowCannedPicker(false);
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onSendMedia(file, activeConversationId);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
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

          {!isPrivate && sourceConversations.length >= 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-[50%] p-1 bg-secondary/20 rounded-xl">
              {sourceConversations.map(sc => {
                const Icon = channelIcons[sc.channel] || MessageCircle;
                const isActive = activeConversationId === sc.id;
                const channelLabel = sc.channel === "whatsapp_official" ? "WhatsApp Oficial" 
                                   : sc.channel === "whatsapp" ? "WhatsApp Lite"
                                   : sc.channel === "email" ? "E-mail"
                                   : sc.channel;
                
                const identifier = sc.metadata.phone || sc.metadata.email || sc.channel;

                return (
                  <button
                    key={sc.id}
                    onClick={() => setActiveConversationId(sc.id)}
                    title={`${channelLabel}: ${identifier}`}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[9px] font-bold transition-all shrink-0 ${
                      isActive
                        ? "bg-background text-primary border-primary/20 shadow-sm"
                        : "text-muted-foreground border-transparent hover:bg-background/50"
                    }`}
                  >
                    <Icon className={`h-2.5 w-2.5 ${sc.channel === "whatsapp_official" ? "text-success" : ""}`} />
                    <span className="max-w-[120px] truncate">
                      <span className="opacity-60 mr-1">[{sc.channel === "whatsapp_official" ? "OFICIAL" : "LITE"}]</span>
                      {identifier}
                    </span>
                  </button>
                );
              })}
            </div>
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
                placeholder={isPrivate ? "Adicionar uma nota privada interna..." : `Responder para ${leadName || "contato"}...`}
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
