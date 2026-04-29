import { useMemo, useState, useEffect } from "react";
import { Clock, AlertTriangle, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useConversationWindow, formatWindowTime } from "@/hooks/useConversationWindow";

interface WindowStatusProps {
  conversationId: string;
  channel: string;
}

export function WindowStatus({ conversationId, channel }: WindowStatusProps) {
  const { window } = useConversationWindow(conversationId);
  const [displayTime, setDisplayTime] = useState<string>("");

  // Only show for WhatsApp official
  if (channel !== "whatsapp_official") {
    return null;
  }

  // Update display time every second
  useEffect(() => {
    if (!window || !window.remainingSeconds) {
      setDisplayTime("Janela expirada");
      return;
    }
    setDisplayTime(formatWindowTime(window.remainingSeconds));

    const interval = setInterval(() => {
      setDisplayTime((prev) => {
        const current = window.remainingSeconds || 0;
        if (current <= 0) {
          clearInterval(interval);
          return "Janela expirada";
        }
        return formatWindowTime(current - 1);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [window, window?.remainingSeconds]);

  if (!window) return null;

  if (window.isWithin24h) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className="gap-1 bg-success/15 text-success border-success/30 text-[10px]">
            <Clock className="h-3 w-3" />
            Janela aberta: {displayTime}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-[11px] max-w-xs">
          Você pode responder sem custo de créditos enquanto a janela estiver aberta.
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge className="gap-1 bg-destructive/15 text-destructive border-destructive/30 text-[10px]">
          <AlertTriangle className="h-3 w-3" />
          Fora da janela
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-[11px] max-w-xs">
        Você está fora da janela de 24h. Cada mensagem gastará créditos (≈ {window.costPerMessage} crédito).
      </TooltipContent>
    </Tooltip>
  );
}

interface CreditWarningProps {
  conversationId: string;
  channel: string;
}

export function CreditWarning({ conversationId, channel }: CreditWarningProps) {
  const { window, credits, hasEnoughCredits } = useConversationWindow(conversationId);

  if (channel !== "whatsapp_official" || !window || window.isWithin24h || !window.requiresCredit) {
    return null;
  }

  const costPerMessage = window.costPerMessage;
  const canSend = hasEnoughCredits && (credits ?? 0) >= costPerMessage;

  return (
    <div
      className={`flex items-start gap-2 p-3 rounded-lg text-[11px] border ${
        canSend
          ? "bg-warning/5 border-warning/20 text-warning-foreground"
          : "bg-destructive/10 border-destructive/20 text-destructive"
      }`}
    >
      <Zap className="h-3.5 w-3.5 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold">
          {canSend ? "Aviso: Fora da janela de 24h" : "Créditos insuficientes"}
        </p>
        <p className={canSend ? "text-warning/80" : "text-destructive/80"}>
          {canSend
            ? `Cada mensagem consumirá ${costPerMessage} crédito(s). Saldo atual: ${credits || 0} créditos.`
            : `Você precisa de ${costPerMessage} crédito(s) para enviar mensagens fora da janela. Saldo atual: ${credits || 0} créditos.`}
        </p>
      </div>
    </div>
  );
}
