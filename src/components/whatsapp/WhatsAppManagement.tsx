import { useState, useEffect, useCallback } from "react";
import {
  MessageCircle, Shield, QrCode, CheckCircle2, XCircle, Loader2,
  Settings, Phone, Wifi, WifiOff, Plus, Trash2, RefreshCw, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import * as integrationsRepo from "@/services/integrations";
import { useWhatsAppInstances, WaInstance } from "@/hooks/useWhatsAppInstances";
import { QuickConnectWizard } from "@/components/whatsapp/QuickConnectWizard";
import { CloudConnectModal } from "@/components/whatsapp/CloudConnectModal";
import { CloudInstanceList } from "@/components/whatsapp/CloudInstanceList";

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; dot: string }> = {
    disconnected: { label: "Desconectado", cls: "border-muted-foreground/40 text-muted-foreground", dot: "bg-muted-foreground/50" },
    connecting:   { label: "Conectando…",  cls: "border-yellow-500/40 text-yellow-600",            dot: "bg-yellow-500 animate-pulse" },
    connected:    { label: "Conectado",     cls: "border-success/40 text-success",                  dot: "bg-success animate-pulse" },
    configured:   { label: "Configurado",   cls: "border-primary/40 text-primary",                  dot: "bg-primary" },
    paused:       { label: "Pausado",       cls: "border-muted-foreground/40 text-muted-foreground", dot: "bg-muted-foreground" },
    error:        { label: "Erro",          cls: "border-destructive/40 text-destructive",           dot: "bg-destructive" },
  };
  const cfg = map[status] ?? map.disconnected;
  return (
    <Badge variant="outline" className={`text-[9px] gap-1 ${cfg.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </Badge>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 py-12 px-4">
      <div className="relative">
        <div className="h-24 w-24 rounded-full bg-[#25D366]/10 flex items-center justify-center">
          <MessageCircle className="h-12 w-12 text-[#25D366]" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-[#25D366]/20 animate-pulse" />
      </div>

      <div className="text-center max-w-md">
        <h2 className="text-xl font-bold text-foreground mb-2">Conecte seu WhatsApp</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Receba e responda mensagens do WhatsApp direto no uPixel.
          Automatize, organize e converta mais clientes.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {[
          { icon: "💬", label: "Receba mensagens no inbox" },
          { icon: "💻", label: "Responda pelo computador" },
          { icon: "🤖", label: "Automatize respostas" },
          { icon: "👥", label: "Atribua à equipe" },
        ].map(({ icon, label }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-3 flex items-center gap-2">
            <span className="text-lg">{icon}</span>
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3">
        <Button
          size="lg"
          className="gap-2 bg-[#25D366] hover:bg-[#1da851] text-white font-semibold px-8"
          onClick={onConnect}
        >
          <MessageCircle className="h-5 w-5" />
          Conectar WhatsApp →
        </Button>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>✓ Leva menos de 1 minuto</span>
          <span>✓ Sem servidor próprio</span>
        </div>
      </div>
    </div>
  );
}

// ── Instance card ─────────────────────────────────────────────────────────────

function InstanceCard({
  instance,
  onDeleted,
  onEdit,
}: {
  instance: WaInstance;
  onDeleted: () => void;
  onEdit: () => void;
}) {
  const [status, setStatus] = useState(instance.status);
  const [connectedNumber, setConnectedNumber] = useState(instance.connected_number);
  const [qrData, setQrData] = useState<string | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrStep, setQrStep] = useState<"scan" | "success">("scan");
  const [working, setWorking] = useState(false);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOfficial = instance.provider === "whatsapp_official";
  const type = isOfficial ? "official" : "normal";

  const displayName = instance.friendly_name || instance.instance_name;

  const invokeProxy = useCallback(
    async (action: string, body?: Record<string, unknown>) => {
      const params = new URLSearchParams({ action, type, instance_name: instance.instance_name });
      const { data, error } = await supabase.functions.invoke(`whatsapp-proxy?${params.toString()}`, { body });
      if (error) throw new Error(error.message);
      return data;
    },
    [type, instance.instance_name]
  );

  // Periodic status refresh (every 10s when connected)
  useEffect(() => {
    if (status !== "connected" && status !== "configured") return;
    const t = setInterval(async () => {
      try {
        const data = await invokeProxy("status");
        setStatus(data.status);
        if (data.instance?.owner) setConnectedNumber(data.instance.owner);
      } catch { /* noop */ }
    }, 10000);
    return () => clearInterval(t);
  }, [status, invokeProxy]);

  // Poll for QR scan completion
  useEffect(() => {
    if (!qrModalOpen || qrStep !== "scan") return;
    const t = setInterval(async () => {
      try {
        const data = await invokeProxy("status");
        if (data.status === "connected") {
          setStatus("connected");
          if (data.instance?.owner) setConnectedNumber(data.instance.owner);
          setQrStep("success");
          clearInterval(t);
        }
      } catch { /* noop */ }
    }, 3000);
    return () => clearInterval(t);
  }, [qrModalOpen, qrStep, invokeProxy]);

  const handleConnect = async () => {
    setWorking(true);
    try {
      const data = await invokeProxy("connect");
      if (!data) return;
      if (data.reachable === false) {
        toast.error(data.error || "Servidor WhatsApp indisponível.");
        setStatus(data.status || status);
        return;
      }
      if (isOfficial) {
        if (data.connected || data.instance?.state === "open") {
          setStatus("connected");
          toast.success("WhatsApp Oficial conectado!");
        } else {
          toast.success("Solicitação enviada!");
        }
      } else {
        if (data.base64) {
          setQrData(data.base64);
          setQrStep("scan");
          setQrModalOpen(true);
          setStatus("connecting");
        } else if (data.instance?.state === "open") {
          setStatus("connected");
        }
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setWorking(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnectDialogOpen(false);
    setWorking(true);
    try {
      await invokeProxy("disconnect");
      setStatus("disconnected");
      setConnectedNumber("");
      toast.info("WhatsApp desconectado.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setWorking(false);
    }
  };

  // Toggle ativar/desativar: alterna integrations.status entre 'connected' e 'paused'.
  // O webhook ignora mensagens quando status='paused' (preserva credenciais).
  const handleToggle = async () => {
    if (status !== "connected" && status !== "paused") return;
    const newStatus = status === "connected" ? "paused" : "connected";
    const previous = status;
    setStatus(newStatus);
    try {
      await integrationsRepo.updateIntegration(instance.id, { status: newStatus });
      toast.success(newStatus === "connected" ? "Instância ativada." : "Instância pausada.");
    } catch (err: any) {
      setStatus(previous);
      toast.error(`Erro ao alterar status: ${err.message}`);
    }
  };

  const handleDelete = async () => {
    setDeleteDialogOpen(false);
    setDeleting(true);
    try {
      const params = new URLSearchParams({ action: "delete-instance", type, instance_name: instance.instance_name });
      const { error } = await supabase.functions.invoke(`whatsapp-proxy?${params.toString()}`);
      if (error) throw new Error(error.message);
      toast.success("Número removido.");
      onDeleted();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="bg-card border border-border rounded-xl overflow-hidden transition-shadow hover:shadow-md">
        {/* Card header */}
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                isOfficial ? "bg-success/10" : "bg-[#25D366]/10"
              }`}>
                {isOfficial
                  ? <Shield className="h-5 w-5 text-success" />
                  : <MessageCircle className="h-5 w-5 text-[#25D366]" />
                }
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-foreground truncate">{displayName}</h3>
                <p className="text-[10px] text-muted-foreground">
                  {isOfficial ? "API Oficial (Meta)" : "WhatsApp via QR Code"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {(status === "connected" || status === "paused") && (
                <Switch
                  checked={status === "connected"}
                  onCheckedChange={handleToggle}
                  aria-label={status === "connected" ? "Pausar" : "Ativar"}
                />
              )}
              <StatusBadge status={status} />
            </div>
          </div>

          {/* Connected number */}
          {status === "connected" && connectedNumber && (
            <div className="bg-[#25D366]/5 border border-[#25D366]/20 rounded-lg p-3 flex items-center gap-2.5">
              <Phone className="h-3.5 w-3.5 text-[#25D366] shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{connectedNumber}</p>
                <p className="text-[10px] text-muted-foreground">Sessão ativa</p>
              </div>
              <CheckCircle2 className="h-3.5 w-3.5 text-[#25D366] ml-auto shrink-0" />
            </div>
          )}

          {/* Primary actions */}
          <div className="flex items-center gap-2">
            {status === "connected" ? (
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1 flex-1"
                onClick={onEdit}
              >
                <Settings className="h-3 w-3" /> Configurar
              </Button>
            ) : status === "connecting" ? (
              <>
                <Button size="sm" disabled className="text-xs gap-1 flex-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Conectando…
                </Button>
                {!isOfficial && (
                  <Button size="sm" variant="outline" className="text-xs gap-1"
                    onClick={() => setQrModalOpen(true)}>
                    <QrCode className="h-3 w-3" /> QR
                  </Button>
                )}
              </>
            ) : (
              <Button
                size="sm"
                className={`text-xs gap-1 flex-1 ${isOfficial ? "bg-success hover:bg-success/90" : "bg-[#25D366] hover:bg-[#1da851]"} text-white`}
                onClick={handleConnect}
                disabled={working}
              >
                {working ? <Loader2 className="h-3 w-3 animate-spin" /> : <QrCode className="h-3 w-3" />}
                Conectar via QR
              </Button>
            )}
          </div>
        </div>

        {/* Danger zone footer */}
        <div className="border-t border-border px-5 py-3 flex items-center justify-between bg-muted/20">
          {status === "connected" ? (
            <button
              className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
              onClick={() => setDisconnectDialogOpen(true)}
              disabled={working}
            >
              <XCircle className="h-3 w-3" /> Desconectar
            </button>
          ) : (
            <span />
          )}
          <button
            className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors disabled:opacity-50"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={deleting}
          >
            {deleting
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <Trash2 className="h-3 w-3" />
            }
            Remover número
          </button>
        </div>
      </div>

      {/* QR Code modal */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-[#25D366]" />
              Conectar — {displayName}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-6">
            {qrStep === "scan" && (
              <>
                <div className="relative mb-4">
                  <div className="h-48 w-48 bg-white rounded-xl p-3 flex items-center justify-center overflow-hidden shadow-sm">
                    {qrData ? (
                      <img src={qrData} alt="WhatsApp QR Code" className="h-full w-full object-contain" />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <p className="text-[10px] text-muted-foreground">Gerando QR Code...</p>
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 rounded-xl border-2 border-[#25D366]/50 animate-pulse pointer-events-none" />
                </div>
                <p className="text-xs font-semibold text-foreground mb-1">Escaneie o QR Code</p>
                <p className="text-[11px] text-muted-foreground text-center max-w-xs">
                  WhatsApp → Menu (⋮) → Dispositivos conectados → Conectar dispositivo
                </p>
              </>
            )}
            {qrStep === "success" && (
              <>
                <div className="h-16 w-16 rounded-full bg-[#25D366]/15 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-8 w-8 text-[#25D366]" />
                </div>
                <p className="text-xs font-bold text-foreground mb-1">Conectado com sucesso!</p>
                {connectedNumber && <p className="text-[11px] text-muted-foreground mb-3">{connectedNumber}</p>}
                <Button size="sm" className="text-xs" onClick={() => setQrModalOpen(false)}>Fechar</Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Disconnect confirmation */}
      <AlertDialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desconectar WhatsApp?</AlertDialogTitle>
            <AlertDialogDescription>
              O número <strong>{connectedNumber || displayName}</strong> será desconectado. Você pode reconectar a qualquer momento escaneando um novo QR Code.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnect} className="bg-destructive hover:bg-destructive/90">
              Desconectar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover número permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              O número <strong>{connectedNumber || displayName}</strong> será desconectado e removido do uPixel. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Remover número
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Edit modal (modo avançado — mantido para quem tem servidor próprio) ───────

function InstanceEditModal({
  open,
  onClose,
  onSaved,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: WaInstance | null;
}) {
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setApiUrl(editing.api_url);
      setApiKey("");
    }
  }, [editing, open]);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const params = new URLSearchParams({ action: "save-config", type: "normal" });
      const { error } = await supabase.functions.invoke(`whatsapp-proxy?${params.toString()}`, {
        body: {
          api_url: apiUrl,
          instance_name: editing.instance_name,
          api_key: apiKey || undefined,
        },
      });
      if (error) throw new Error(error.message);
      toast.success("Configurações salvas!");
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurar — {editing?.friendly_name || editing?.instance_name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">URL do Servidor WhatsApp</Label>
            <Input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://seu-servidor-whatsapp.com" className="text-xs h-9 bg-secondary" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">API Key</Label>
            <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
              placeholder={editing?.has_api_key ? "••••••• (já configurada)" : "Sua API Key"}
              className="text-xs h-9 bg-secondary" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={!apiUrl || saving} className="text-xs">
            {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Alerta de servidor inacessível ───────────────────────────────────────────

// Cadência do cron whatsapp-health-check: 1 checagem a cada 5 minutos.
const HEALTH_CHECK_INTERVAL_MIN = 5;

/** Formata o tempo offline a partir do nº de checagens falhas consecutivas. */
function formatDowntime(failures: number): string {
  const minutes = failures * HEALTH_CHECK_INTERVAL_MIN;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days} dia${days > 1 ? "s" : ""}`;
}

/**
 * Banner de servidor inacessível. O health-check já gravava `unhealthy` no banco,
 * mas isso nunca chegava à interface — uma queda do servidor Evolution passava
 * despercebida por semanas. Aqui ela fica visível.
 */
function UnhealthyBanner({ instances }: { instances: WaInstance[] }) {
  const unhealthy = instances.filter((i) => i.health_status === "unhealthy");
  if (unhealthy.length === 0) return null;

  // Maior nº de falhas = há quanto tempo o servidor está fora.
  const worst = unhealthy.reduce(
    (acc, i) => Math.max(acc, i.consecutive_failures ?? 0),
    0,
  );
  const servers = Array.from(
    new Set(unhealthy.map((i) => i.api_url).filter(Boolean)),
  );

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
      <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-semibold text-destructive">
          Servidor WhatsApp inacessível
        </p>
        <p className="text-xs text-muted-foreground">
          {unhealthy.length} de {instances.length} número
          {instances.length !== 1 ? "s" : ""} sem resposta do servidor
          {worst > 0 && <> — offline há aproximadamente <strong>{formatDowntime(worst)}</strong></>}.
          Enquanto isso, não é possível conectar novos números nem enviar mensagens.
        </p>
        {servers.length > 0 && (
          <p className="text-[11px] text-muted-foreground">
            Servidor: <code className="text-foreground">{servers.join(", ")}</code> — verifique se
            o serviço WhatsApp está no ar e se o proxy reverso consegue alcançá-lo.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

interface WhatsAppManagementProps {
  /** Quando true, esconde botão "Voltar" (ex.: embedded em /integrations). */
  embedded?: boolean;
}

export function WhatsAppManagement({ embedded = false }: WhatsAppManagementProps = {}) {
  const { instances, loading, refresh } = useWhatsAppInstances();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [cloudOpen, setCloudOpen] = useState(false);
  const [cloudRefreshKey, setCloudRefreshKey] = useState(0);
  const [editModal, setEditModal] = useState<WaInstance | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedType, setAdvancedType] = useState<"normal" | "official">("normal");

  // Advanced add (for users with own server)
  const [adApiUrl, setAdApiUrl] = useState("");
  const [adInstanceName, setAdInstanceName] = useState("");
  const [adApiKey, setAdApiKey] = useState("");
  const [adPhoneId, setAdPhoneId] = useState("");
  const [adSaving, setAdSaving] = useState(false);

  const handleAdvancedSave = async () => {
    setAdSaving(true);
    try {
      const params = new URLSearchParams({ action: "save-config", type: advancedType });
      const { error } = await supabase.functions.invoke(`whatsapp-proxy?${params.toString()}`, {
        body: { api_url: adApiUrl, instance_name: adInstanceName, api_key: adApiKey, phone_number_id: adPhoneId || undefined },
      });
      if (error) throw new Error(error.message);
      toast.success("Instância adicionada!");
      refresh();
      setAdvancedOpen(false);
      setAdApiUrl(""); setAdInstanceName(""); setAdApiKey(""); setAdPhoneId("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAdSaving(false);
    }
  };

  const connectedCount = instances.filter((i) => i.status === "connected").length;

  // Empty state
  if (!loading && instances.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState onConnect={() => setWizardOpen(true)} />
        <QuickConnectWizard
          open={wizardOpen}
          onClose={() => setWizardOpen(false)}
          onComplete={refresh}
        />
      </div>
    );
  }

  return (
    <div className={embedded ? "space-y-6" : "p-6 animate-fade-in space-y-6"}>
      {/* Toolbar de ações */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          {loading
            ? "Carregando…"
            : `${connectedCount > 0 ? `${connectedCount} conectado${connectedCount > 1 ? "s" : ""}` : "Nenhum conectado"} · ${instances.length} número${instances.length !== 1 ? "s" : ""}`}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="text-xs gap-1" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" variant="outline" className="text-xs gap-1 border-success/40 text-success hover:bg-success/5" onClick={() => setCloudOpen(true)}>
            <Shield className="h-3.5 w-3.5" /> WhatsApp Oficial (Meta)
          </Button>
          <Button size="sm" className="text-xs gap-1 bg-[#25D366] hover:bg-[#1da851] text-white" onClick={() => setWizardOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Adicionar WhatsApp Web
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Alerta de servidor fora do ar (health-check) */}
        {!loading && <UnhealthyBanner instances={instances} />}

        {/* Summary */}
        <div className="flex items-center gap-3 flex-wrap">
          <Badge
            variant="outline"
            className={`text-[10px] gap-1.5 ${connectedCount > 0 ? "border-success/40 text-success" : "border-muted-foreground/40 text-muted-foreground"}`}
          >
            {connectedCount > 0
              ? <><Wifi className="h-3 w-3" /> {connectedCount} número{connectedCount > 1 ? "s" : ""} conectado{connectedCount > 1 ? "s" : ""}</>
              : <><WifiOff className="h-3 w-3" /> Nenhum número conectado</>
            }
          </Badge>
        </div>

        {/* Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Carregando números…</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {instances.map((inst) => (
              <InstanceCard
                key={inst.id}
                instance={inst}
                onDeleted={refresh}
                onEdit={() => setEditModal(inst)}
              />
            ))}
          </div>
        )}

        {/* Lista de instâncias Cloud API (Meta direto) */}
        <CloudInstanceList refreshKey={cloudRefreshKey} />

        {/* Advanced mode link */}
        <div className="text-center pt-4 border-t border-border">
          <button
            className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
            onClick={() => setAdvancedOpen(true)}
          >
            Adicionar com servidor próprio (modo avançado)
          </button>
        </div>
      </div>

      {/* Wizard */}
      <QuickConnectWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onComplete={refresh}
      />

      {/* Modal WhatsApp Cloud API (Meta direto) */}
      <CloudConnectModal
        open={cloudOpen}
        onClose={() => setCloudOpen(false)}
        onSaved={() => setCloudRefreshKey((k) => k + 1)}
      />

      {/* Edit modal */}
      <InstanceEditModal
        open={!!editModal}
        onClose={() => setEditModal(null)}
        onSaved={refresh}
        editing={editModal}
      />

      {/* Advanced add modal */}
      <Dialog open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Adicionar — Modo avançado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-2">
              {(["normal", "official"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setAdvancedType(t)}
                  className={`rounded-lg border p-3 text-left text-xs transition-colors ${advancedType === t ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                  {t === "normal" ? <><QrCode className="h-4 w-4 mb-1 text-primary" /><p className="font-semibold">QR Code</p><p className="text-muted-foreground">Servidor próprio</p></>
                    : <><Shield className="h-4 w-4 mb-1 text-success" /><p className="font-semibold">API Oficial</p><p className="text-muted-foreground">Meta Business</p></>}
                </button>
              ))}
            </div>
            {[
              { label: "URL do Servidor WhatsApp", val: adApiUrl, set: setAdApiUrl, ph: "https://seu-servidor-whatsapp.com" },
              { label: "Nome da Instância", val: adInstanceName, set: setAdInstanceName, ph: "meu-numero-1" },
              { label: "API Key", val: adApiKey, set: setAdApiKey, ph: "Sua API Key", type: "password" },
              ...(advancedType === "official" ? [{ label: "Phone Number ID", val: adPhoneId, set: setAdPhoneId, ph: "ID do número" }] : []),
            ].map(({ label, val, set, ph, type: t }) => (
              <div key={label} className="space-y-1.5">
                <Label className="text-xs font-semibold">{label}</Label>
                <Input value={val} onChange={(e) => set(e.target.value)} placeholder={ph}
                  type={t || "text"} className="text-xs h-9 bg-secondary" />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setAdvancedOpen(false)} className="text-xs">Cancelar</Button>
            <Button size="sm" onClick={handleAdvancedSave} disabled={!adApiUrl || !adInstanceName || !adApiKey || adSaving} className="text-xs">
              {adSaving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              Adicionar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
