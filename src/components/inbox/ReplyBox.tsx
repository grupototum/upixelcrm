import { useState, useRef, useEffect } from "react";
import { Plus, Send, Loader2, Sparkles, MessageCircle, Mail, MessageSquare, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CannedResponsePicker } from "./CannedResponsePicker";
import { MessageTemplatePopover } from "./MessageTemplatePopover";

interface ReplyBoxProps {
  onSend: (text: string, isPrivate: boolean, targetConversationId?: string) => Promise<void>;
  sending: boolean;
  sourceConversations: any[];
  activeConversationId?: string;
  setActiveConversationId: (id: string) => void;
  leadName?: string;
}

const channelIcons: Record<string, any> = {
  whatsapp: MessageCircle,
  email: Mail,
  instagram: MessageCircle,
  webchat: MessageSquare,
};

export function ReplyBox({ 
  onSend, 
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
    if (!message.trim() || sending) return;
    await onSend(message, isPrivate, activeConversationId);
    setMessage("");
    setShowCannedPicker(false);
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
            <button
              onClick={() => setIsPrivate(false)}
              className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full transition-all ${
                !isPrivate ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              Resposta
            </button>
            <button
              onClick={() => setIsPrivate(true)}
              className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full transition-all flex items-center gap-1 ${
                isPrivate ? "bg-amber-500 text-white shadow-sm" : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              <Lock className="h-2.5 w-2.5" /> Nota Privada
            </button>
          </div>

          {!isPrivate && sourceConversations.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-[50%]">
              {sourceConversations.map(sc => {
                const Icon = channelIcons[sc.channel] || MessageCircle;
                const isActive = activeConversationId === sc.id;
                return (
                  <button
                    key={sc.id}
                    onClick={() => setActiveConversationId(sc.id)}
                    title={sc.metadata.phone || sc.metadata.email || sc.channel}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-medium transition-all shrink-0 ${
                      isActive
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-background text-muted-foreground border-border hover:border-primary/20"
                    }`}
                  >
                    <Icon className="h-2.5 w-2.5" />
                    <span className="max-w-[80px] truncate">{sc.metadata.phone || sc.metadata.email || sc.channel}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className={`relative rounded-2xl p-1.5 shadow-sm border transition-all ${
          isPrivate 
            ? "bg-amber-100/50 border-amber-300 focus-within:border-amber-400" 
            : "bg-background border-border/50 focus-within:border-primary/50"
        }`}>
          <div className="flex items-start gap-1">
            <div className="flex flex-col pt-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-muted-foreground hover:bg-secondary shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
              {!isPrivate && <MessageTemplatePopover onSelect={body => setMessage(body)} />}
            </div>

            <Textarea
              ref={textareaRef}
              rows={isPrivate ? 3 : 1}
              className="flex-1 bg-transparent border-none focus-visible:ring-0 shadow-none py-2 text-sm min-h-[40px] resize-none"
              placeholder={isPrivate ? "Adicionar uma nota privada interna..." : `Responder via ${sourceConversations.find(s => s.id === activeConversationId)?.channel || "canal"}...`}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
            />

            <div className="flex flex-col gap-1 self-end pb-0.5 pr-0.5">
              <Button
                size="icon"
                className={`h-9 w-9 rounded-xl shrink-0 shadow-md ${isPrivate ? "bg-amber-500 hover:bg-amber-600" : "bg-primary"}`}
                disabled={!message.trim() || sending}
                onClick={handleSend}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          {/* Internal Note indicator */}
          {isPrivate && (
            <div className="absolute top-0 right-12 px-2 py-0.5 bg-amber-200 text-amber-800 text-[9px] font-bold uppercase rounded-bl-lg rounded-tr-xl border-l border-b border-amber-300 pointer-events-none">
              Visível apenas para agentes
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
