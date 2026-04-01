import { useState, useEffect } from "react";
import { 
  CreditCard, CheckCircle2, Loader2, AlertCircle, 
  ArrowRight, QrCode, Copy, ExternalLink, Info, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface RechargeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PACKS = [
  { amount: 50, credits: 100, label: "Iniciante", popular: false },
  { amount: 100, credits: 200, label: "Mais Popular", popular: true },
  { amount: 250, credits: 500, label: "Profissional", popular: false },
  { amount: 500, credits: 1100, label: "Enterprise (+10%)", popular: false },
];

export function RechargeModal({ open, onOpenChange }: RechargeModalProps) {
  const [step, setStep] = useState<"select" | "payment" | "success">("select");
  const [selectedPack, setSelectedPack] = useState(PACKS[1]);
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const handleGeneratePayment = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("asaas-payment", {
        body: { 
          amount: selectedPack.amount, 
          creditsToIndicate: selectedPack.credits 
        }
      });

      if (error) throw error;
      setPaymentData(data);
      setStep("payment");
    } catch (error: any) {
      console.error(error);
      toast.error(`Erro ao gerar pagamento: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyPixCode = () => {
    if (paymentData?.pix?.payload) {
      navigator.clipboard.writeText(paymentData.pix.payload);
      setCopied(true);
      toast.success("Código Pix copiado!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Simulation: Check for payment success (Polling or just a manual check button)
  const checkPayment = async () => {
    toast.info("Verificando pagamento...");
    // Ideally, polling or real-time subscription to recharge_intents
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if(!o) setStep("select"); }}>
      <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-heading font-black flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            Recarregar Créditos
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-8">
          {step === "select" && (
            <div className="space-y-6">
              <div className="bg-muted/30 p-4 rounded-xl border border-border/20 flex gap-3">
                <Info className="h-5 w-5 text-primary shrink-0" />
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Os créditos são utilizados para disparos fora da janela de 24h na rota Oficial. 
                  <strong className="text-foreground ml-1">1 crédito = 1 mensagem enviada.</strong>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {PACKS.map((pack) => (
                  <button
                    key={pack.amount}
                    onClick={() => setSelectedPack(pack)}
                    className={`relative p-4 rounded-2xl border-2 transition-all text-left space-y-1 ${
                      selectedPack.amount === pack.amount 
                      ? "border-primary bg-primary/5 shadow-md" 
                      : "border-border/40 hover:border-border shadow-sm"
                    }`}
                  >
                    {pack.popular && (
                      <Badge className="absolute -top-2 -right-1 bg-primary text-[8px] uppercase tracking-tighter">Popular</Badge>
                    )}
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">{pack.label}</p>
                    <p className="text-lg font-heading font-black">{pack.credits} <span className="text-[10px] opacity-60">cred</span></p>
                    <p className="text-xs font-bold text-primary">R$ {pack.amount},00</p>
                  </button>
                ))}
              </div>

              <Button 
                onClick={handleGeneratePayment}
                className="w-full h-14 rounded-2xl bg-primary hover:bg-primary-hover text-white font-heading font-black text-base shadow-xl shadow-primary/20 group"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  <span className="flex items-center gap-2 uppercase tracking-tighter">
                    Gerar Pagamento Pix <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                )}
              </Button>
            </div>
          )}

          {step === "payment" && (
            <div className="space-y-6 flex flex-col items-center">
              <div className="text-center space-y-1">
                <Badge className="bg-success/10 text-success border-success/20 mb-2">Pix Gerado com Sucesso</Badge>
                <h3 className="text-sm font-bold">Escaneie o QR Code abaixo</h3>
                <p className="text-xs text-muted-foreground">Valor: R$ {selectedPack.amount},00</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border-2 border-primary/20 shadow-inner group relative">
                {paymentData?.pix?.encodedImage ? (
                  <img src={`data:image/png;base64,${paymentData.pix.encodedImage}`} alt="QR Code Pix" className="h-48 w-48" />
                ) : (
                  <div className="h-48 w-48 flex items-center justify-center bg-muted/20">
                     <QrCode className="h-12 w-12 text-muted-foreground/30 animate-pulse" />
                  </div>
                )}
              </div>

              <div className="w-full space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full h-12 rounded-xl text-xs font-bold gap-2"
                  onClick={copyPixCode}
                >
                  {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Código Copiado!" : "Copiar Código Pix (Copia e Cola)"}
                </Button>
                
                <a 
                  href={paymentData?.invoiceUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="flex items-center justify-center gap-2 text-[11px] font-bold text-primary hover:underline"
                >
                  Ver outras formas de pagamento <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="w-full bg-primary/5 p-4 rounded-2xl border border-primary/10 flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold leading-none">Aguardando confirmação...</p>
                  <p className="text-[9px] text-muted-foreground leading-tight">
                    Após o pagamento, seus créditos serão adicionados instantaneamente.
                  </p>
                </div>
              </div>

              <Button 
                variant="ghost" 
                className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest"
                onClick={() => setStep("select")}
              >
                Voltar e mudar valor
              </Button>
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center py-8 text-center space-y-4">
              <div className="h-20 w-20 rounded-full bg-success/15 flex items-center justify-center animate-in zoom-in duration-500">
                <CheckCircle2 className="h-10 w-10 text-success" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-heading font-black">Recarga Concluída!</h3>
                <p className="text-sm text-muted-foreground max-w-[250px]">
                  {selectedPack.credits} créditos foram adicionados ao seu saldo com sucesso.
                </p>
              </div>
              <Button 
                onClick={() => onOpenChange(false)}
                className="w-full h-12 rounded-xl bg-primary mt-4 font-bold"
              >
                Continuar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
