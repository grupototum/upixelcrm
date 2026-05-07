import { useState } from "react";
import { 
  Send, Shield, MessageCircle, Clock, CheckCircle2, AlertCircle, 
  ArrowRight, Sparkles, Smartphone, Cloud, FileText, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBroadcast, BroadcastRoute, Template } from "@/hooks/useBroadcast";
import { CreditAlert } from "./CreditAlert";

export function BroadcastModal() {
  const { credits, isInside24h, setIsInside24h, loading, templates, calculateCost, sendBroadcast } = useBroadcast();
  const [route, setRoute] = useState<BroadcastRoute>("free");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);

  const cost = calculateCost(1, route);
  const hasCredits = credits >= cost;

  const handleSend = async () => {
    const success = await sendBroadcast(1, route, templates.find(t => t.id === selectedTemplate));
    if (success) {
      setOpen(false);
      setMessage("");
      setSelectedTemplate("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-primary hover:bg-[#e04400] text-primary-foreground font-bold gap-2 shadow-lg shadow-primary/20">
          <Send className="h-3.5 w-3.5" /> NOVO DISPARO
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border border-[hsl(var(--border-strong))] animate-in zoom-in-95 duration-200">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-lg font-heading font-black flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageCircle className="h-4.5 w-4.5 text-primary" />
            </div>
            Configurar Envio
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-6">
          {/* Route Selection */}
          <div className="space-y-3">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Escolha sua Rota</Label>
            <Tabs value={route} onValueChange={(v) => setRoute(v as BroadcastRoute)} className="w-full">
              <TabsList className="grid grid-cols-2 p-1 bg-muted/40 h-14 rounded-xl border border-[hsl(var(--border-strong))]">
                <TabsTrigger value="free" className="rounded-lg gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <div className={`p-1.5 rounded-md ${route === "free" ? "bg-accent/10" : ""}`}>
                    <Smartphone className={`h-4 w-4 ${route === "free" ? "text-accent" : "text-muted-foreground"}`} />
                  </div>
                  <div className="text-left">
                    <p className="text-[11px] font-bold leading-none">Gratuita</p>
                    <p className="text-[9px] text-muted-foreground font-medium">Evolution Normal</p>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="official" className="rounded-lg gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <div className={`p-1.5 rounded-md ${route === "official" ? "bg-primary/10" : ""}`}>
                    <Cloud className={`h-4 w-4 ${route === "official" ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="text-left">
                    <p className="text-[11px] font-bold leading-none">Oficial</p>
                    <p className="text-[9px] text-muted-foreground font-medium">Cloud API / Meta</p>
                  </div>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* 24h Window Alert */}
          <div className="bg-muted/30 rounded-card p-4 flex items-center justify-between border border-[hsl(var(--border-strong))] group">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${isInside24h ? "bg-success/15" : "bg-warning/15"}`}>
                <Clock className={`h-5 w-5 ${isInside24h ? "text-success" : "text-warning"} group-hover:scale-110 transition-transform`} />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-foreground">Janela de 24 horas</p>
                <p className="text-[10px] text-muted-foreground font-medium leading-tight">
                  {isInside24h 
                    ? "Conversa aberta. O custo é GRÁTIS!" 
                    : "Janela fechada. Requer templates pagos."}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setIsInside24h(!isInside24h)}
              className="text-[9px] font-bold uppercase tracking-tighter text-primary/60 hover:text-primary transition-colors"
            >
              Simular Troca
            </button>
          </div>

          {/* Message / Template Selection */}
          <div className="space-y-4">
            {route === "official" ? (
              <div className="space-y-3">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Selecionar Template</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-[hsl(var(--border-strong))] focus:ring-primary/20">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary/60" />
                      <SelectValue placeholder="Escolha um template aprovado" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-[hsl(var(--border-strong))]">
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id} className="text-xs focus:bg-primary/5 focus:text-primary">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-[9px] ${t.category === 'UTILITY' ? 'text-success border-success/30' : 'text-primary border-[hsl(var(--border-strong))]'}`}>
                            {t.category}
                          </Badge>
                          <span className="font-bold">{t.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplate && (
                  <div className="bg-primary/5 p-4 rounded-xl border border-[hsl(var(--border-strong))] animate-in slide-in-from-top-2 duration-300">
                    <p className="text-[10px] uppercase font-black text-primary/40 tracking-widest mb-2 flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3" /> Preview do Conteúdo
                    </p>
                    <p className="text-[11px] text-foreground/80 leading-relaxed italic">
                      "{templates.find(t => t.id === selectedTemplate)?.content}"
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Sua Mensagem (Formato Livre)</Label>
                <Textarea 
                  placeholder="Olá, como posso ajudar?" 
                  className="min-h-[100px] rounded-xl bg-muted/20 border-[hsl(var(--border-strong))] focus:ring-primary/20 text-xs"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Credit Blocking / Info */}
          {!hasCredits && route === "official" && !isInside24h ? (
            <CreditAlert />
          ) : (
            <div className={`p-4 rounded-card border transition-all duration-300 ${cost > 0 ? "bg-primary/5 border-[hsl(var(--border-strong))]" : "bg-success/5 border-success/10"}`}>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Custo deste disparo</p>
                  <p className={`text-sm font-heading font-black ${cost > 0 ? "text-primary" : "text-success"}`}>
                    {cost === 0 ? "GRÁTIS (0 créditos)" : `${cost} CRÉDITO (R$ 0,50)`}
                  </p>
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Seu Saldo</p>
                   <p className="text-sm font-heading font-black text-foreground">{credits} cred</p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2">
            <Button 
              className="w-full h-14 rounded-card bg-primary hover:bg-[#e04400] text-white font-heading font-black text-base shadow-xl shadow-primary/20 group transition-all"
              onClick={handleSend}
              disabled={loading || (!hasCredits && route === "official" && !isInside24h) || (route === "official" && !selectedTemplate) || (route === "free" && !message)}
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span className="flex items-center gap-2 uppercase tracking-tighter">
                  Realizar Envio <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </Button>
            <p className="text-center text-[10px] text-muted-foreground font-medium mt-4">
              Ao enviar, você concorda com os termos de uso e políticas da Meta.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
