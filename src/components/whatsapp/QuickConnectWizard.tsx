import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MessageCircle, CheckCircle2, RefreshCw, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type WizardStep = "name" | "qr" | "success";

interface WizardData {
  friendlyName: string;
  instanceName: string;
  qrCode: string | null;
  connectedNumber: string;
}

// ── Step 1: friendly name ────────────────────────────────────────────────────

function NameStep({
  value,
  onChange,
  onContinue,
  creating,
}: {
  value: string;
  onChange: (v: string) => void;
  onContinue: (name: string) => void;
  creating: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-6 py-2">
      <div className="h-16 w-16 rounded-full bg-[#25D366]/10 flex items-center justify-center">
        <MessageCircle className="h-8 w-8 text-[#25D366]" />
      </div>

      <div className="text-center">
        <h2 className="text-base font-bold text-foreground mb-1">Conecte seu WhatsApp</h2>
        <p className="text-xs text-muted-foreground max-w-xs">
          Receba e responda mensagens direto no uPixel. Leva menos de 1 minuto.
        </p>
      </div>

      <div className="w-full space-y-2">
        <Label className="text-xs font-semibold">
          Nome deste número <span className="text-muted-foreground font-normal">(opcional)</span>
        </Label>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, 30))}
          placeholder="Ex: Vendas, Suporte, Marketing..."
          className="h-10 text-sm"
          onKeyDown={(e) => e.key === "Enter" && !creating && onContinue(value)}
          autoFocus
          disabled={creating}
        />
        <p className="text-[11px] text-muted-foreground">{value.length}/30</p>
      </div>

      <div className="w-full space-y-2">
        <Button
          className="w-full gap-2 bg-[#25D366] hover:bg-[#1da851] text-white font-semibold"
          onClick={() => onContinue(value)}
          disabled={creating}
        >
          {creating
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando QR Code...</>
            : <><MessageCircle className="h-4 w-4" /> Gerar QR Code</>
          }
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground"
          onClick={() => onContinue("")}
          disabled={creating}
        >
          Pular — usar nome padrão
        </Button>
      </div>

      <div className="w-full bg-muted/30 rounded-xl p-4 space-y-1.5">
        {["Receba mensagens no inbox", "Responda pelo computador", "Automatize com bots", "Atribua à sua equipe"].map((b) => (
          <p key={b} className="text-xs text-muted-foreground flex items-center gap-2">
            <span className="text-[#25D366]">✓</span> {b}
          </p>
        ))}
      </div>
    </div>
  );
}

// ── Step 2: QR code + polling ────────────────────────────────────────────────

function QRStep({
  qrCode,
  onRefresh,
  refreshing,
}: {
  qrCode: string | null;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    setTimeLeft(30);
    const t = setInterval(() => setTimeLeft((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, [qrCode]);

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      <div className="text-center">
        <h2 className="text-base font-bold text-foreground mb-1">Escaneie com seu celular</h2>
        <p className="text-xs text-muted-foreground">Aponte a câmera do WhatsApp para o QR Code</p>
      </div>

      {/* QR display */}
      <div className="relative">
        <div className="h-52 w-52 bg-white rounded-2xl p-3 flex items-center justify-center overflow-hidden shadow-md">
          {qrCode ? (
            <img src={qrCode} alt="WhatsApp QR Code" className="h-full w-full object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground text-center">Gerando QR Code...</p>
            </div>
          )}
        </div>
        <div className="absolute inset-0 rounded-2xl border-2 border-[#25D366]/50 animate-pulse pointer-events-none" />
      </div>

      {/* Timer + refresh */}
      <div className="flex items-center gap-3">
        {qrCode && (
          <span className="text-xs text-muted-foreground">
            ⏱️ Expira em <span className={timeLeft <= 5 ? "text-destructive font-semibold" : ""}>{String(timeLeft).padStart(2, "0")}s</span>
          </span>
        )}
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-7 gap-1"
          onClick={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Gerar novo QR
        </Button>
      </div>

      {/* Instructions */}
      <div className="w-full bg-muted/30 rounded-xl p-4">
        <p className="text-xs font-semibold text-foreground mb-2">Como escanear:</p>
        <ol className="text-xs text-muted-foreground space-y-1">
          <li>1. Abra o WhatsApp no celular</li>
          <li>2. Toque no menu ⋮ (3 pontinhos)</li>
          <li>3. "Dispositivos conectados"</li>
          <li>4. "Conectar dispositivo"</li>
          <li>5. Aponte a câmera para o QR Code</li>
        </ol>
      </div>

      <p className="text-[11px] text-muted-foreground text-center">
        A conexão é detectada automaticamente ao escanear.
      </p>
    </div>
  );
}

// ── Step 3: Success ──────────────────────────────────────────────────────────

function SuccessStep({
  connectedNumber,
  onGoToInbox,
  onAddAnother,
  onDone,
}: {
  connectedNumber: string;
  onGoToInbox: () => void;
  onAddAnother: () => void;
  onDone: () => void;
}) {
  const [countdown, setCountdown] = useState(5);
  const cancelRef = useRef(false);

  useEffect(() => {
    cancelRef.current = false;
    const t = setInterval(() => {
      setCountdown((p) => {
        if (p <= 1) {
          clearInterval(t);
          if (!cancelRef.current) onDone();
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [onDone]);

  return (
    <div className="flex flex-col items-center gap-6 py-4 text-center">
      <div className="relative">
        <div className="h-20 w-20 rounded-full bg-[#25D366]/15 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-[#25D366]" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-[#25D366]/30 animate-ping" />
      </div>

      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">WhatsApp conectado! 🎉</h2>
        {connectedNumber && (
          <p className="text-sm text-muted-foreground">Número: {connectedNumber}</p>
        )}
      </div>

      <div className="w-full space-y-2">
        <Button
          className="w-full gap-2 bg-[#25D366] hover:bg-[#1da851] text-white font-semibold"
          onClick={onGoToInbox}
        >
          💬 Ir para o Inbox
        </Button>
        <Button variant="outline" className="w-full text-sm" onClick={onAddAnother}>
          ➕ Conectar outro número
        </Button>
        <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={onDone}>
          Fechar
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Indo para o Inbox em {countdown}s…{" "}
        <button
          className="underline text-primary cursor-pointer"
          onClick={() => { cancelRef.current = true; setCountdown(99); }}
        >
          Cancelar
        </button>
      </p>
    </div>
  );
}

// ── Wizard container ─────────────────────────────────────────────────────────

export function QuickConnectWizard({
  open,
  onClose,
  onComplete,
}: {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState<WizardStep>("name");
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<WizardData>({
    friendlyName: "",
    instanceName: "",
    qrCode: null,
    connectedNumber: "",
  });
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  };

  const resetWizard = () => {
    stopPolling();
    setStep("name");
    setCreating(false);
    setData({ friendlyName: "", instanceName: "", qrCode: null, connectedNumber: "" });
  };

  useEffect(() => {
    if (!open) resetWizard();
    return () => stopPolling();
  }, [open]);

  const startPolling = (instanceName: string) => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      try {
        const params = new URLSearchParams({ action: "status", type: "normal", instance_name: instanceName });
        const { data: res } = await supabase.functions.invoke(`whatsapp-proxy?${params.toString()}`);
        if (res?.status === "connected") {
          stopPolling();
          setData((prev) => ({ ...prev, connectedNumber: res?.instance?.owner || "" }));
          setStep("success");
          onComplete();
        }
      } catch { /* noop */ }
    }, 3000);
  };

  const handleCreateInstance = async (name: string) => {
    setCreating(true);
    try {
      const { data: res, error } = await supabase.functions.invoke(
        "whatsapp-proxy?action=create-managed-instance",
        { body: { name: name || "WhatsApp" } }
      );
      if (error || !res?.success) {
        throw new Error(error?.message || res?.error || "Falha ao criar instância");
      }
      setData({
        friendlyName: res.friendly_name,
        instanceName: res.instance_name,
        qrCode: res.qr_code,
        connectedNumber: "",
      });
      setStep("qr");
      startPolling(res.instance_name);
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar instância WhatsApp");
    } finally {
      setCreating(false);
    }
  };

  const handleRefreshQR = async () => {
    if (!data.instanceName) return;
    setRefreshing(true);
    try {
      const params = new URLSearchParams({ action: "connect", type: "normal", instance_name: data.instanceName });
      const { data: res } = await supabase.functions.invoke(`whatsapp-proxy?${params.toString()}`);
      if (res?.base64) setData((prev) => ({ ...prev, qrCode: res.base64 }));
    } catch { /* noop */ } finally {
      setRefreshing(false);
    }
  };

  const handleClose = () => {
    stopPolling();
    onClose();
  };

  const titleMap: Record<WizardStep, string> = {
    name: "Conectar WhatsApp",
    qr: "Escanear QR Code",
    success: "WhatsApp conectado!",
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-[#25D366]/10 flex items-center justify-center">
              <MessageCircle className="h-3.5 w-3.5 text-[#25D366]" />
            </div>
            {titleMap[step]}
          </DialogTitle>
        </DialogHeader>

        {step === "name" && (
          <NameStep
            value={data.friendlyName}
            onChange={(v) => setData((prev) => ({ ...prev, friendlyName: v }))}
            onContinue={handleCreateInstance}
            creating={creating}
          />
        )}

        {step === "qr" && (
          <>
            <QRStep
              qrCode={data.qrCode}
              onRefresh={handleRefreshQR}
              refreshing={refreshing}
            />
            <div className="pt-2 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1 text-muted-foreground"
                onClick={() => { stopPolling(); setStep("name"); }}
              >
                <ArrowLeft className="h-3 w-3" /> Voltar
              </Button>
            </div>
          </>
        )}

        {step === "success" && (
          <SuccessStep
            connectedNumber={data.connectedNumber}
            onGoToInbox={() => { handleClose(); navigate("/inbox"); }}
            onAddAnother={() => { resetWizard(); onComplete(); }}
            onDone={() => { handleClose(); navigate("/inbox"); }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
