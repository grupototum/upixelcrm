import { useState } from "react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useBroadcast, Template } from "@/hooks/useBroadcast";
import { Loader2, Sparkles, MessageSquare, Info } from "lucide-react";

interface TemplateCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateCreateModal({ open, onOpenChange }: TemplateCreateModalProps) {
  const { createTemplate } = useBroadcast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "MARKETING" as Template["category"],
    content: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.content) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);
    try {
      await createTemplate(formData);
      toast.success("Modelo enviado para aprovação!");
      onOpenChange(false);
      setFormData({ name: "", category: "MARKETING", content: "" });
    } catch (error: any) {
      toast.error(`Erro ao criar modelo: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-none shadow-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl font-heading font-black flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              Novo Modelo de Mensagem
            </DialogTitle>
            <DialogDescription className="text-xs">
              Crie um modelo oficial para aprovação pela Meta.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nome do Modelo</Label>
                <Input 
                  placeholder="ex: confirmacao_pedido" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="rounded-xl bg-muted/30 border-border/40 focus:bg-white transition-all text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Categoria</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => setFormData({...formData, category: v as Template["category"]})}
                >
                  <SelectTrigger className="rounded-xl bg-muted/30 border-border/40 text-xs">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MARKETING">Marketing</SelectItem>
                    <SelectItem value="UTILITY">Utilidade</SelectItem>
                    <SelectItem value="AUTHENTICATION">Autenticação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Conteúdo da Mensagem</Label>
                <Badge variant="outline" className="text-[9px] font-bold opacity-60">Use {"{{1}}"} para variáveis</Badge>
              </div>
              <Textarea 
                placeholder="Olá {{1}}, seu pedido {{2}} foi recebido!"
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                className="min-h-[120px] rounded-2xl bg-muted/30 border-border/40 focus:bg-white transition-all text-sm resize-none"
              />
            </div>

            {/* Preview Section */}
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <MessageSquare className="h-3 w-3" /> Preview no WhatsApp
              </Label>
              <div className="bg-[#E5DDD5] p-4 rounded-2xl relative overflow-hidden flex justify-start">
                <div className="bg-white p-3 rounded-xl rounded-tl-none shadow-sm max-w-[85%] relative z-10">
                  <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">
                    {formData.content || <span className="opacity-30 italic">Seu conteúdo aparecerá aqui...</span>}
                  </p>
                  <span className="text-[9px] text-muted-foreground block text-right mt-1">10:45</span>
                </div>
              </div>
            </div>

            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 flex gap-3 items-start">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-[10px] text-muted-foreground leading-tight">
                Modelos de <strong>Marketing</strong> são ideais para ofertas, enquanto <strong>Utilidade</strong> serve para notificações de transações. A Meta leva em média 24h para aprovar.
              </p>
            </div>
          </div>

          <DialogFooter className="p-6 bg-muted/20 border-t border-border/40">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs font-bold"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="rounded-xl px-8 h-10 bg-primary hover:bg-primary-hover font-bold text-xs"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar para Aprovação"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
