import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, AlertCircle, ExternalLink, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Step = "form" | "verifying" | "verified" | "saved";

interface CloudConnectModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";

export function CloudConnectModal({ open, onClose, onSaved }: CloudConnectModalProps) {
  const [step, setStep] = useState<Step>("form");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [verifyInfo, setVerifyInfo] = useState<{ display_phone_number: string; verified_name: string; quality_rating: string } | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [savedInfo, setSavedInfo] = useState<{ webhook_url: string; webhook_verify_token: string } | null>(null);

  const reset = () => {
    setStep("form");
    setPhoneNumberId("");
    setBusinessAccountId("");
    setAccessToken("");
    setDisplayName("");
    setVerifyInfo(null);
    setVerifyError(null);
    setSavedInfo(null);
  };

  const closeAndReset = () => {
    reset();
    onClose();
  };

  const handleVerify = async () => {
    if (!phoneNumberId || !accessToken) {
      toast.error("Preencha Phone Number ID e Access Token.");
      return;
    }
    setStep("verifying");
    setVerifyError(null);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-cloud-proxy?action=verify-config", {
        body: { phone_number_id: phoneNumberId, access_token: accessToken },
      });
      if (error) throw new Error(error.message);
      if (data?.ok === false) {
        setVerifyError(data.error ?? "Credenciais inválidas.");
        setStep("form");
        return;
      }
      setVerifyInfo({
        display_phone_number: data.display_phone_number,
        verified_name: data.verified_name,
        quality_rating: data.quality_rating,
      });
      setStep("verified");
    } catch (err: any) {
      setVerifyError(err.message ?? "Erro ao verificar credenciais.");
      setStep("form");
    }
  };

  const handleSave = async () => {
    if (!businessAccountId) {
      toast.error("Preencha o Business Account ID.");
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-cloud-proxy?action=save-config", {
        body: {
          phone_number_id: phoneNumberId,
          business_account_id: businessAccountId,
          access_token: accessToken,
          display_phone_number: verifyInfo?.display_phone_number,
          display_name: displayName.trim() || verifyInfo?.verified_name || "WhatsApp Cloud",
        },
      });
      if (error) throw new Error(error.message);

      const webhookUrl = data.webhook_url ?? `${SUPABASE_URL}/functions/v1/whatsapp-cloud-webhook?integration_id=${data.integration_id}`;
      setSavedInfo({
        webhook_url: webhookUrl,
        webhook_verify_token: data.webhook_verify_token,
      });
      setStep("saved");
      toast.success("Credenciais salvas. Agora configure o webhook na Meta.");
      onSaved?.();
    } catch (err: any) {
      toast.error(`Erro ao salvar: ${err.message ?? "tente novamente"}`);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado`);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeAndReset()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {step !== "saved" && (
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp Cloud API (Meta Oficial)</DialogTitle>
            <DialogDescription>
              Integração direta com Meta — sem Evolution. Funciona 24/7, sem celular, suporta templates aprovados.
            </DialogDescription>
          </DialogHeader>
        )}

        {step === "form" && (
          <div className="space-y-4">
            <div className="bg-secondary/30 border border-border rounded-lg p-3 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">Onde achar esses dados?</p>
              <ol className="space-y-1 list-decimal list-inside leading-relaxed">
                <li>
                  Acesse <a href="https://developers.facebook.com/apps/" target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-0.5">developers.facebook.com/apps <ExternalLink className="h-2.5 w-2.5" /></a>
                </li>
                <li>Selecione seu app → WhatsApp → Configuração da API</li>
                <li>Copie o <strong>Phone Number ID</strong> e o <strong>WhatsApp Business Account ID</strong></li>
                <li>Gere um <strong>Access Token permanente</strong> (System User Token recomendado)</li>
              </ol>
            </div>

            {verifyError && (
              <div className="flex items-start gap-2 bg-destructive/5 border border-destructive/30 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-xs text-destructive">{verifyError}</p>
              </div>
            )}

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Phone Number ID *</Label>
                <Input
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  placeholder="ex: 105912839128391"
                  className="text-xs h-9 bg-secondary/30"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">WhatsApp Business Account ID *</Label>
                <Input
                  value={businessAccountId}
                  onChange={(e) => setBusinessAccountId(e.target.value)}
                  placeholder="ex: 178923948203948"
                  className="text-xs h-9 bg-secondary/30"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Permanent Access Token *</Label>
                <Input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="EAAB...token gerado no Meta"
                  className="text-xs h-9 bg-secondary/30"
                />
                <p className="text-[10px] text-muted-foreground">
                  Token não é mostrado depois de salvo. Gere um System User Token na Meta Business Suite pra não expirar.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nome amigável (opcional)</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="ex: WhatsApp Vendas"
                  className="text-xs h-9 bg-secondary/30"
                />
              </div>
            </div>
          </div>
        )}

        {step === "verifying" && (
          <div className="py-10 flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Verificando credenciais na Meta…</p>
          </div>
        )}

        {step === "verified" && verifyInfo && (
          <div className="space-y-4">
            <div className="bg-success/5 border border-success/30 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <p className="text-sm font-bold text-success">Credenciais válidas!</p>
              </div>
              <div className="text-xs space-y-1 text-foreground/80 pl-7">
                <p><strong>Número:</strong> {verifyInfo.display_phone_number || "—"}</p>
                <p><strong>Nome verificado:</strong> {verifyInfo.verified_name || "—"}</p>
                <p><strong>Quality rating:</strong> <Badge variant="outline" className="text-[10px]">{verifyInfo.quality_rating || "N/A"}</Badge></p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Clique em <strong>Salvar</strong> para vincular este número ao seu tenant.
              Logo após, mostraremos a URL do webhook pra você configurar na Meta.
            </p>
          </div>
        )}

        {step === "saved" && savedInfo && (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" /> Quase lá!
              </DialogTitle>
              <DialogDescription>
                Falta o último passo: configurar o webhook na Meta pra receber mensagens.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold">1. URL do Webhook</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={savedInfo.webhook_url} readOnly className="text-[11px] h-9 bg-secondary/30 font-mono" />
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(savedInfo.webhook_url, "URL")}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">2. Verify Token</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={savedInfo.webhook_verify_token} readOnly className="text-[11px] h-9 bg-secondary/30 font-mono" />
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(savedInfo.webhook_verify_token, "Token")}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="bg-secondary/30 border border-border rounded-lg p-3 text-xs space-y-2">
                <p className="font-semibold text-foreground">Configuração na Meta:</p>
                <ol className="space-y-1 list-decimal list-inside text-muted-foreground leading-relaxed">
                  <li>Vai em <a href="https://developers.facebook.com/apps/" target="_blank" rel="noreferrer" className="text-primary underline">App Meta</a> → WhatsApp → Configuração</li>
                  <li>Em "Webhook", clique em <strong>Configurar webhook</strong></li>
                  <li>Cole a URL e o Verify Token acima</li>
                  <li>Subscreva aos campos: <code className="bg-background px-1 rounded">messages</code></li>
                  <li>Clique em <strong>Verificar e salvar</strong></li>
                </ol>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "form" && (
            <>
              <Button variant="outline" onClick={closeAndReset}>Cancelar</Button>
              <Button onClick={handleVerify} disabled={!phoneNumberId || !accessToken}>
                Verificar credenciais
              </Button>
            </>
          )}
          {step === "verified" && (
            <>
              <Button variant="outline" onClick={() => setStep("form")}>Voltar</Button>
              <Button onClick={handleSave} disabled={!businessAccountId}>Salvar e conectar</Button>
            </>
          )}
          {step === "saved" && (
            <Button onClick={closeAndReset}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
