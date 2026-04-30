import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  MessageCircle, Shield, QrCode, CheckCircle2, XCircle, Loader2,
  Settings, RefreshCw, Phone, Wifi, WifiOff, Zap, ArrowLeft,
  Plus, Trash2, ChevronDown, ChevronUp, Facebook,
} from "lucide-react";
import { useMetaOAuth } from "@/hooks/useMetaOAuth";
import { useWhatsAppEmbeddedSignup } from "@/hooks/useWhatsAppEmbeddedSignup";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useWhatsAppInstances, WaInstance } from "@/hooks/useWhatsAppInstances";

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "configured" | "error";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    disconnected: { label: "Desconectado", cls: "border-muted-foreground/40 text-muted-foreground" },
    connecting: { label: "Conectando...", cls: "border-accent/40 text-accent" },
    connected: { label: "Conectado", cls: "border-success/40 text-success" },
    configured: { label: "Configurado", cls: "border-primary/40 text-primary" },
    error: { label: "Erro", cls: "border-destructive/40 text-destructive" },
  };
  const { label, cls } = map[status] || map.disconnected;
  return <Badge variant="outline" className={`text-[9px] ${cls}`}>{label}</Badge>;
}

// Per-instance card that manages its own connect/disconnect/qr state
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
  const [deleting, setDeleting] = useState(false);

  const type = instance.provider === "whatsapp_official" ? "official" : "normal";
  const isOfficial = type === "official";

  const invokeProxy = useCallback(
    async (action: string, body?: Record<string, unknown>) => {
      const params = new URLSearchParams({
        action,
        type,
        instance_name: instance.instance_name,
      });
      const { data, error } = await supabase.functions.invoke(
        `whatsapp-proxy?${params.toString()}`,
        { body }
      );
      if (error) throw new Error(error.message);
      return data;
    },
    [type, instance.instance_name]
  );

  // Periodic status check every 10s
  useEffect(() => {
    if (status !== "connected" && status !== "configured") return;
    const interval = setInterval(async () => {
      try {
        const data = await invokeProxy("status");
        setStatus(data.status);
        if (data.instance?.owner) setConnectedNumber(data.instance.owner);
      } catch {}
    }, 10000);
    return () => clearInterval(interval);
  }, [status, invokeProxy]);

  // Poll for QR scan completion
  useEffect(() => {
    if (!qrModalOpen || qrStep !== "scan") return;
    const interval = setInterval(async () => {
      try {
        const data = await invokeProxy("status");
        if (data.status === "connected") {
          setStatus("connected");
          setQrStep("success");
          clearInterval(interval);
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [qrModalOpen, qrStep, invokeProxy]);

  const handleConnect = async () => {
    setWorking(true);
    try {
      const data = await invokeProxy("connect");
      if (!data) return;

      if (data.reachable === false) {
        toast.error(data.error || "Evolution API indisponível.");
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
    if (!confirm(`Desconectar "${instance.instance_name}"?`)) return;
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

  const handleDelete = async () => {
    if (!confirm(`Remover a instância "${instance.instance_name}" permanentemente?`)) return;
    setDeleting(true);
    try {
      const params = new URLSearchParams({
        action: "delete-instance",
        type,
        instance_name: instance.instance_name,
      });
      const { error } = await supabase.functions.invoke(`whatsapp-proxy?${params.toString()}`);
      if (error) throw new Error(error.message);
      toast.success("Instância removida.");
      onDeleted();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const accentColor = isOfficial ? "success" : "accent";

  return (
    <>
      <div className="bg-card ghost-border rounded-xl shadow-card overflow-hidden">
        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-xl bg-${accentColor}/10 flex items-center justify-center`}>
                {isOfficial
                  ? <Shield className={`h-6 w-6 text-${accentColor}`} />
                  : <QrCode className={`h-6 w-6 text-${accentColor}`} />
                }
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">{instance.instance_name}</h3>
                <p className="text-[11px] text-muted-foreground">
                  {isOfficial ? "API Oficial (Meta)" : "QR Code (Evolution API)"}
                </p>
              </div>
            </div>
            <StatusBadge status={status} />
          </div>

          {/* Connected number */}
          {status === "connected" && connectedNumber && (
            <div className="bg-secondary rounded-lg p-3 flex items-center gap-3">
              <Phone className="h-4 w-4 text-success" />
              <div>
                <p className="text-xs font-semibold text-foreground">{connectedNumber}</p>
                <p className="text-[10px] text-muted-foreground">Sessão ativa</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="border-t border-border/40 pt-4 flex items-center gap-2">
            {status === "connected" ? (
              <>
                <Button size="sm" variant="outline" className="text-xs gap-1 flex-1" onClick={onEdit}>
                  <Settings className="h-3 w-3" /> Config
                </Button>
                <Button
                  size="sm" variant="outline"
                  className="text-xs gap-1 text-destructive"
                  onClick={handleDisconnect}
                  disabled={working}
                >
                  {working ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                  Desconectar
                </Button>
              </>
            ) : status === "connecting" ? (
              <>
                <Button size="sm" disabled className="text-xs gap-1 flex-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Conectando...
                </Button>
                {!isOfficial && (
                  <Button size="sm" variant="outline" className="text-xs gap-1"
                    onClick={() => setQrModalOpen(true)}>
                    <QrCode className="h-3 w-3" /> QR
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  className={`text-xs gap-1 flex-1 bg-${accentColor} hover:bg-${accentColor}/90 text-white`}
                  onClick={handleConnect}
                  disabled={working}
                >
                  {working
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : isOfficial ? <Zap className="h-3 w-3" /> : <QrCode className="h-3 w-3" />
                  }
                  {isOfficial ? "Conectar" : "Conectar via QR"}
                </Button>
                <Button size="sm" variant="outline" className="text-xs gap-1" onClick={onEdit}>
                  <Settings className="h-3 w-3" />
                </Button>
              </>
            )}
            <Button
              size="sm" variant="ghost"
              className="text-xs text-destructive/70 hover:text-destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            </Button>
          </div>
        </div>
        <div className={`bg-${accentColor}/5 border-t border-${accentColor}/20 px-6 py-2.5`}>
          <p className={`text-[10px] text-${accentColor} font-medium flex items-center gap-1`}>
            {isOfficial
              ? <><CheckCircle2 className="h-3 w-3" /> Meta Business Platform</>
              : <><MessageCircle className="h-3 w-3" /> Evolution API / Baileys</>
            }
          </p>
        </div>
      </div>

      {/* QR Code Modal */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-success" />
              Conectar — {instance.instance_name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-6">
            {qrStep === "scan" && (
              <>
                <div className="relative mb-4">
                  <div className="h-48 w-48 bg-white rounded-xl p-3 flex items-center justify-center overflow-hidden">
                    {qrData ? (
                      <img src={qrData} alt="WhatsApp QR Code" className="h-full w-full object-contain" />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <p className="text-[10px] text-muted-foreground">Gerando QR Code...</p>
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 rounded-xl border-2 border-success/50 animate-pulse pointer-events-none" />
                </div>
                <p className="text-xs text-foreground font-semibold mb-1">Escaneie o QR Code</p>
                <p className="text-[11px] text-muted-foreground text-center max-w-xs">
                  Abra o WhatsApp → Menu (⋮) → Dispositivos conectados → Conectar dispositivo
                </p>
              </>
            )}
            {qrStep === "success" && (
              <>
                <div className="h-16 w-16 rounded-full bg-success/15 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
                <p className="text-xs font-bold text-foreground mb-1">Conectado com sucesso!</p>
                {connectedNumber && (
                  <p className="text-[11px] text-muted-foreground mb-3">{connectedNumber}</p>
                )}
                <Button size="sm" className="text-xs" onClick={() => setQrModalOpen(false)}>
                  Fechar
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Modal to add or edit an instance
function InstanceFormModal({
  open,
  onClose,
  onSaved,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing?: WaInstance | null;
}) {
  const [instanceType, setInstanceType] = useState<"normal" | "official">("normal");
  const [apiUrl, setApiUrl] = useState("");
  const [instanceName, setInstanceName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [phoneId, setPhoneId] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setInstanceType(editing.provider === "whatsapp_official" ? "official" : "normal");
      setApiUrl(editing.api_url);
      setInstanceName(editing.instance_name);
      setApiKey("");
      setPhoneId(editing.phone_number_id);
      setBusinessId(editing.business_id);
      setAccessToken("");
    } else {
      setInstanceType("normal");
      setApiUrl("");
      setInstanceName("");
      setApiKey("");
      setPhoneId("");
      setBusinessId("");
      setAccessToken("");
    }
  }, [editing, open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const params = new URLSearchParams({
        action: "save-config",
        type: instanceType,
      });
      const { error } = await supabase.functions.invoke(
        `whatsapp-proxy?${params.toString()}`,
        {
          body: {
            api_url: apiUrl,
            instance_name: instanceName,
            api_key: apiKey,
            phone_number_id: phoneId || undefined,
            business_id: businessId || undefined,
            access_token: accessToken || undefined,
          },
        }
      );
      if (error) throw new Error(error.message);
      toast.success(editing ? "Instância atualizada!" : "Instância adicionada!");
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const isOfficial = instanceType === "official";
  const hasExistingApiKey = !!(editing?.has_api_key);
  const hasExistingToken = !!(editing?.has_access_token);

  const canSave =
    apiUrl &&
    instanceName &&
    (apiKey || hasExistingApiKey) &&
    (!isOfficial || phoneId);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            {editing ? <Settings className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {editing ? `Editar — ${editing.instance_name}` : "Adicionar número"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Type selector */}
          {!editing && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setInstanceType("normal")}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  instanceType === "normal"
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-accent/50"
                }`}
              >
                <QrCode className="h-5 w-5 text-accent mb-1" />
                <p className="text-xs font-semibold">QR Code</p>
                <p className="text-[10px] text-muted-foreground">Via Evolution API</p>
              </button>
              <button
                type="button"
                onClick={() => setInstanceType("official")}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  instanceType === "official"
                    ? "border-success bg-success/10"
                    : "border-border hover:border-success/50"
                }`}
              >
                <Shield className="h-5 w-5 text-success mb-1" />
                <p className="text-xs font-semibold">API Oficial</p>
                <p className="text-[10px] text-muted-foreground">Meta Business</p>
              </button>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">URL do Servidor Evolution API</Label>
            <Input
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://api.evolution.com.br"
              className="text-xs h-9 bg-secondary"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Nome da Instância</Label>
            <Input
              value={instanceName}
              onChange={(e) => setInstanceName(e.target.value)}
              placeholder="meu-numero-1"
              className="text-xs h-9 bg-secondary"
              disabled={!!editing}
            />
            <p className="text-[10px] text-muted-foreground">
              Identificador único — use letras, números e hífens.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Evolution API Key</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasExistingApiKey ? "••••••• (já configurada)" : "Sua API Key"}
              className="text-xs h-9 bg-secondary"
            />
          </div>

          {isOfficial && (
            <>
              <div className="h-px bg-border" />
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Meta Business Platform
              </p>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Phone Number ID</Label>
                <Input
                  value={phoneId}
                  onChange={(e) => setPhoneId(e.target.value)}
                  placeholder="ID do número de telefone"
                  className="text-xs h-9 bg-secondary"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Business ID</Label>
                <Input
                  value={businessId}
                  onChange={(e) => setBusinessId(e.target.value)}
                  placeholder="ID da conta Business"
                  className="text-xs h-9 bg-secondary"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Meta Access Token</Label>
                <Input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder={hasExistingToken ? "••••••• (já configurado)" : "Token de acesso permanente"}
                  className="text-xs h-9 bg-secondary"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Cancelar
          </Button>
          <Button
            size="sm"
            className="text-xs"
            onClick={handleSave}
            disabled={!canSave || saving}
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            {editing ? "Salvar" : "Adicionar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function WhatsAppPage() {
  const navigate = useNavigate();
  const { instances, loading, refresh } = useWhatsAppInstances();
  const metaOAuth = useMetaOAuth();
  const embeddedSignup = useWhatsAppEmbeddedSignup();
  const [formOpen, setFormOpen] = useState(false);
  const [editingInstance, setEditingInstance] = useState<WaInstance | null>(null);

  const connectedCount = instances.filter((i) => i.status === "connected").length;

  const handleEdit = (instance: WaInstance) => {
    setEditingInstance(instance);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditingInstance(null);
    setFormOpen(true);
  };

  return (
    <AppLayout
      title="WhatsApp"
      subtitle="Gerencie todos os seus números"
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => navigate("/integrations")}>
            <ArrowLeft className="h-3 w-3" /> Voltar
          </Button>
          <Button
            size="sm"
            className="text-xs gap-1 bg-success hover:bg-success/90 text-white"
            onClick={async () => {
              const result = await embeddedSignup.startSignup();
              if (result) refresh();
            }}
            disabled={embeddedSignup.loading}
          >
            {embeddedSignup.loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
            Conectar em 1 clique
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs gap-1 border-blue-500/40 text-blue-500 hover:bg-blue-500/10"
            onClick={() => metaOAuth.startOAuth("whatsapp", "/whatsapp")}
            disabled={metaOAuth.loading}
          >
            {metaOAuth.loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Facebook className="h-3 w-3" />}
            Conectar com Meta
          </Button>
          <Button size="sm" className="text-xs gap-1" onClick={handleAdd}>
            <Plus className="h-3 w-3" /> Adicionar número
          </Button>
        </div>
      }
    >
      <div className="p-6 animate-fade-in space-y-6">
        {/* Debug info */}
        {process.env.NODE_ENV === "development" && (
          <div className="text-[10px] text-muted-foreground font-mono bg-secondary rounded p-2">
            Debug: {loading ? "carregando..." : `${instances.length} instância(s)`}
          </div>
        )}

        {/* Summary badge */}
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={`text-[10px] gap-1 ${
              connectedCount > 0
                ? "border-success/40 text-success"
                : "border-muted-foreground/40 text-muted-foreground"
            }`}
          >
            {connectedCount > 0
              ? <><Wifi className="h-3 w-3" /> {connectedCount} número{connectedCount > 1 ? "s" : ""} conectado{connectedCount > 1 ? "s" : ""}</>
              : <><WifiOff className="h-3 w-3" /> Nenhum número conectado</>
            }
          </Badge>
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            {instances.length} instância{instances.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        {/* Instance cards */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Carregando instâncias...</span>
          </div>
        ) : instances.length === 0 ? (
          <div className="bg-card ghost-border rounded-xl shadow-card p-10 flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-muted/40 flex items-center justify-center">
              <MessageCircle className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground mb-1">Nenhum número configurado</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Adicione um número de WhatsApp para começar a receber e enviar mensagens.
              </p>
            </div>
            <Button size="sm" className="text-xs gap-1" onClick={handleAdd}>
              <Plus className="h-3 w-3" /> Adicionar primeiro número
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {instances.map((inst) => (
              <InstanceCard
                key={inst.id}
                instance={inst}
                onDeleted={refresh}
                onEdit={() => handleEdit(inst)}
              />
            ))}
          </div>
        )}

        {/* Comparison table */}
        {instances.length > 0 && (
          <div className="bg-card ghost-border rounded-xl shadow-card p-6">
            <h3 className="text-xs font-bold text-foreground mb-3">Comparativo de modalidades</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="text-left py-2 text-muted-foreground font-medium">Recurso</th>
                    <th className="text-center py-2 text-success font-medium">API Oficial</th>
                    <th className="text-center py-2 text-accent font-medium">QR Code</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {[
                    ["Estabilidade", "✅ Alta", "⚠️ Média"],
                    ["Templates oficiais", "✅ Sim", "❌ Não"],
                    ["Mensagens em massa", "✅ Sim", "❌ Não"],
                    ["Setup", "⏳ Requer aprovação Meta", "⚡ Instantâneo"],
                    ["Custo", "💰 Pago por conversa", "🆓 Gratuito"],
                    ["Automações", "✅ Completas", "⚠️ Limitadas"],
                    ["Multi-instância", "✅ Sim", "✅ Sim"],
                  ].map(([feature, api, lite]) => (
                    <tr key={feature} className="border-b border-border/20">
                      <td className="py-2 font-medium text-foreground/80">{feature}</td>
                      <td className="py-2 text-center">{api}</td>
                      <td className="py-2 text-center">{lite}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <InstanceFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={refresh}
        editing={editingInstance}
      />
    </AppLayout>
  );
}
