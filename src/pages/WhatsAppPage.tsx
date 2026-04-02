import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  MessageCircle, Shield, QrCode, CheckCircle2, XCircle, Loader2,
  Settings, RefreshCw, Phone, Wifi, WifiOff, Zap, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWhatsAppIntegration } from "@/hooks/useWhatsAppIntegration";

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

function StatusBadge({ status }: { status: ConnectionStatus }) {
  const map = {
    disconnected: { label: "Desconectado", cls: "border-muted-foreground/40 text-muted-foreground" },
    connecting: { label: "Conectando...", cls: "border-accent/40 text-accent" },
    connected: { label: "Conectado", cls: "border-success/40 text-success" },
    error: { label: "Erro", cls: "border-destructive/40 text-destructive" },
  };
  const { label, cls } = map[status] || map.disconnected;
  return <Badge variant="outline" className={`text-[9px] ${cls}`}>{label}</Badge>;
}

function FeatureTag({ label }: { label: string }) {
  return <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{label}</Badge>;
}

export default function WhatsAppPage() {
  const navigate = useNavigate();
  const waNormal = useWhatsAppIntegration("normal");
  const waOfficial = useWhatsAppIntegration("official");

  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrStep, setQrStep] = useState<"scan" | "connecting" | "success">("scan");

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [officialSettingsOpen, setOfficialSettingsOpen] = useState(false);

  // Normal Form
  const [formApiUrl, setFormApiUrl] = useState("");
  const [formInstance, setFormInstance] = useState("");
  const [formApiKey, setFormApiKey] = useState("");

  // Official Form
  const [offApiUrl, setOffApiUrl] = useState("");
  const [offInstance, setOffInstance] = useState("");
  const [offApiKey, setOffApiKey] = useState("");
  const [offPhoneId, setOffPhoneId] = useState("");
  const [offBusinessId, setOffBusinessId] = useState("");
  const [offAccessToken, setOffAccessToken] = useState("");

  // Sync state from hook
  useEffect(() => {
    if (!waNormal.loading) {
      // Status is handled via derived state
    }
  }, [waNormal.loading]);

  // Load form fields from saved config
  useEffect(() => {
    if (waNormal.config.api_url) setFormApiUrl(waNormal.config.api_url);
    if (waNormal.config.instance_name) setFormInstance(waNormal.config.instance_name);

    if (waOfficial.config.api_url) setOffApiUrl(waOfficial.config.api_url);
    if (waOfficial.config.instance_name) setOffInstance(waOfficial.config.instance_name);
    if (waOfficial.config.phone_number_id) setOffPhoneId(waOfficial.config.phone_number_id);
    if (waOfficial.config.business_id) setOffBusinessId(waOfficial.config.business_id);
  }, [waNormal.config, waOfficial.config]);

  const apiStatus = waOfficial.config.status as ConnectionStatus;
  const liteStatus = waNormal.config.status as ConnectionStatus;

  // Polling when QR modal is open
  useEffect(() => {
    let interval: any;
    if (qrModalOpen && qrStep !== "success") {
      interval = setInterval(async () => {
        const data = await waNormal.checkStatus();
        if (data?.status === "connected") {
          setQrStep("success");
          clearInterval(interval);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [qrModalOpen, qrStep, waNormal.checkStatus]);

  const handleSaveSettings = async () => {
    await waNormal.saveConfig(formApiUrl, formInstance, formApiKey);
    setFormApiKey("");
    setSettingsOpen(false);
  };

  const handleSaveOfficialSettings = async () => {
    await waOfficial.saveConfig(offApiUrl, offInstance, offApiKey, offPhoneId, offBusinessId, offAccessToken);
    setOffApiKey("");
    setOffAccessToken("");
    setOfficialSettingsOpen(false);
  };

  const initiateConnection = async () => {
    if (!waNormal.config.configured) {
      toast.error("Configure as credenciais da Evolution API primeiro.");
      setSettingsOpen(true);
      return;
    }
    setQrModalOpen(true);
    setQrStep("scan");
    await waNormal.connect();
  };

  const handleConnectOfficial = async () => {
    if (!waOfficial.config.configured) {
      toast.error("Configure as credenciais da API Oficial primeiro.");
      setOfficialSettingsOpen(true);
      return;
    }
    await waOfficial.connect();
    toast.success("Solicitação de conexão enviada!");
  };

  const handleDisconnectOfficial = async () => {
    await waOfficial.disconnect();
  };

  const handleDisconnectLite = async () => {
    await waNormal.disconnect();
  };

  return (
    <AppLayout
      title="WhatsApp"
      subtitle="Conecte seu WhatsApp ao uPixel"
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => navigate("/integrations")}>
            <ArrowLeft className="h-3 w-3" /> Voltar
          </Button>
        </div>
      }
    >
      <div className="p-6 animate-fade-in space-y-6">
        {/* Summary */}
        <div className="flex items-center gap-3 flex-wrap">
          <Badge
            variant="outline"
            className={`text-[10px] gap-1 ${
              apiStatus === "connected" || liteStatus === "connected"
                ? "border-success/40 text-success"
                : "border-muted-foreground/40 text-muted-foreground"
            }`}
          >
            {apiStatus === "connected" || liteStatus === "connected" ? (
              <><Wifi className="h-3 w-3" /> Pelo menos 1 canal ativo</>
            ) : (
              <><WifiOff className="h-3 w-3" /> Nenhum canal conectado</>
            )}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1 — API Oficial */}
          <div className="bg-card ghost-border rounded-xl shadow-card overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                    <Shield className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">WhatsApp API (Oficial)</h3>
                    <p className="text-[11px] text-muted-foreground">Meta Business Platform</p>
                  </div>
                </div>
                <StatusBadge status={apiStatus} />
              </div>

              <p className="text-xs text-muted-foreground">
                Conexão estável e recomendada para automações e escala. Suporta envio de templates,
                mensagens em massa e integração com bots.
              </p>

              <div className="flex flex-wrap gap-2">
                <FeatureTag label="Templates" />
                <FeatureTag label="Automações" />
                <FeatureTag label="Mensagens em massa" />
                <FeatureTag label="Bots" />
                <FeatureTag label="Webhooks" />
              </div>

              <div className="border-t border-border/40 pt-4 flex items-center justify-between">
                {apiStatus === "connected" ? (
                  <>
                    <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={() => setOfficialSettingsOpen(true)}>
                      <Settings className="h-3 w-3" /> Configurar
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs gap-1 text-destructive" onClick={handleDisconnectOfficial}>
                      <XCircle className="h-3 w-3" /> Desconectar
                    </Button>
                  </>
                ) : apiStatus === "connecting" ? (
                  <Button size="sm" disabled className="text-xs gap-1 w-full">
                    <Loader2 className="h-3 w-3 animate-spin" /> Conectando...
                  </Button>
                ) : (
                  <Button size="sm" className="text-xs gap-1 w-full bg-success hover:bg-success/90 text-white" onClick={handleConnectOfficial}>
                    <Zap className="h-3 w-3" /> Conectar API Oficial
                  </Button>
                )}
              </div>
            </div>
            <div className="bg-success/5 border-t border-success/20 px-6 py-3">
              <p className="text-[10px] text-success font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Recomendado para produção
              </p>
            </div>
          </div>

          {/* Card 2 — WhatsApp Lite */}
          <div className="bg-card ghost-border rounded-xl shadow-card overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <QrCode className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">WhatsApp Lite</h3>
                    <p className="text-[11px] text-muted-foreground">Conexão via QR Code (Evolution API)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[9px] border-accent/40 text-accent">Alternativo</Badge>
                  <StatusBadge status={liteStatus} />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Conexão rápida via QR Code usando Evolution API. Ideal para uso imediato e testes.
              </p>

              <div className="flex flex-wrap gap-2">
                <FeatureTag label="QR Code" />
                <FeatureTag label="Setup rápido" />
                <FeatureTag label="Uso imediato" />
              </div>

              {liteStatus === "connected" && waNormal.connectedNumber && (
                <div className="bg-secondary rounded-lg p-3 flex items-center gap-3">
                  <Phone className="h-4 w-4 text-success" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{waNormal.connectedNumber}</p>
                    <p className="text-[10px] text-muted-foreground">Sessão ativa</p>
                  </div>
                </div>
              )}

              <div className="border-t border-border/40 pt-4 flex items-center justify-between gap-2">
                {liteStatus === "connected" ? (
                  <>
                    <div className="flex items-center gap-2 flex-1">
                      <Button size="sm" variant="ghost" className="text-xs gap-1 flex-1" onClick={() => { setQrStep("scan"); setQrModalOpen(true); }}>
                        <RefreshCw className="h-3 w-3" /> Reset
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs gap-1 text-primary" onClick={() => setSettingsOpen(true)}>
                        <Settings className="h-3 w-3" /> Config
                      </Button>
                    </div>
                    <Button size="sm" variant="outline" className="text-xs gap-1 text-destructive whitespace-nowrap" onClick={handleDisconnectLite}>
                      <XCircle className="h-3 w-3" /> Desconectar
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col w-full gap-2">
                    <Button size="sm" className="text-xs gap-1 w-full bg-accent hover:bg-accent-hover text-accent-foreground" onClick={initiateConnection}>
                      <QrCode className="h-3 w-3" /> Conectar via QR Code
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs gap-1 w-full text-muted-foreground" onClick={() => setSettingsOpen(true)}>
                      <Settings className="h-3 w-3" /> Credenciais API
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-accent/5 border-t border-accent/20 px-6 py-3">
              <p className="text-[10px] text-accent font-medium flex items-center gap-1">
                <MessageCircle className="h-3 w-3" /> Ideal para testes e uso pessoal
              </p>
            </div>
          </div>
        </div>

        {/* Comparativo */}
        <div className="bg-card ghost-border rounded-xl shadow-card p-6">
          <h3 className="text-xs font-bold text-foreground mb-3">Comparativo</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="text-left py-2 text-muted-foreground font-medium">Recurso</th>
                  <th className="text-center py-2 text-success font-medium">API Oficial</th>
                  <th className="text-center py-2 text-accent font-medium">Lite (QR)</th>
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
                  ["Bots", "✅ Sim", "⚠️ Parcial"],
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
      </div>

      {/* QR Code Modal */}
      <Dialog open={qrModalOpen} onOpenChange={(open) => { setQrModalOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-success" /> Conectar WhatsApp
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center py-6">
            {qrStep === "scan" && (
              <>
                <div className="relative mb-4">
                  <div className="h-48 w-48 bg-white rounded-xl p-3 flex items-center justify-center overflow-hidden">
                    {waNormal.qrData ? (
                      <img src={waNormal.qrData} alt="WhatsApp QR Code" className="h-full w-full object-contain" />
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
                  Abra o WhatsApp no celular → Menu (⋮) → Dispositivos conectados → Conectar dispositivo
                </p>
              </>
            )}

            {qrStep === "connecting" && (
              <>
                <Loader2 className="h-12 w-12 text-success animate-spin mb-4" />
                <p className="text-xs font-semibold text-foreground">Conectando...</p>
                <p className="text-[11px] text-muted-foreground">Sincronizando com seu WhatsApp</p>
              </>
            )}

            {qrStep === "success" && (
              <>
                <div className="h-16 w-16 rounded-full bg-success/15 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
                <p className="text-xs font-bold text-foreground mb-1">Conectado com sucesso!</p>
                <p className="text-[11px] text-muted-foreground mb-3">{waNormal.connectedNumber}</p>
                <Button size="sm" className="text-xs" onClick={() => setQrModalOpen(false)}>
                  Fechar
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" /> Credenciais Evolution API
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">URL do Servidor</Label>
              <Input
                value={formApiUrl}
                onChange={(e) => setFormApiUrl(e.target.value)}
                placeholder="https://api.evolution.com.br"
                className="text-xs h-9 bg-secondary"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome da Instância</Label>
              <Input
                value={formInstance}
                onChange={(e) => setFormInstance(e.target.value)}
                placeholder="upixel-instance"
                className="text-xs h-9 bg-secondary"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">API Key</Label>
              <Input
                type="password"
                value={formApiKey}
                onChange={(e) => setFormApiKey(e.target.value)}
                placeholder={waNormal.config.has_api_key ? "••••••• (já configurada)" : "Sua API Key"}
                className="text-xs h-9 bg-secondary"
              />
              <p className="text-[10px] text-muted-foreground">
                As credenciais são armazenadas de forma segura no backend.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(false)} className="text-xs">Cancelar</Button>
            <Button
              size="sm"
              className="text-xs bg-primary hover:bg-primary-hover text-primary-foreground"
              onClick={handleSaveSettings}
              disabled={!formApiUrl || !formInstance || (!formApiKey && !waNormal.config.has_api_key)}
            >
              Salvar Credenciais
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Official Settings Modal */}
      <Dialog open={officialSettingsOpen} onOpenChange={setOfficialSettingsOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-success" /> Configuração API Oficial (Meta)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Evolution API URL</Label>
              <Input
                value={offApiUrl}
                onChange={(e) => setOffApiUrl(e.target.value)}
                placeholder="https://api.evolution.com.br"
                className="text-xs h-9 bg-secondary"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome da Instância</Label>
              <Input
                value={offInstance}
                onChange={(e) => setOffInstance(e.target.value)}
                placeholder="meta-instance"
                className="text-xs h-9 bg-secondary"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Evolution API Key</Label>
              <Input
                type="password"
                value={offApiKey}
                onChange={(e) => setOffApiKey(e.target.value)}
                placeholder={waOfficial.config.has_api_key ? "••••••• (já configurada)" : "API Key"}
                className="text-xs h-9 bg-secondary"
              />
            </div>

            <div className="h-px bg-border my-2" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Credenciais Meta Business Platform</p>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Phone Number ID</Label>
              <Input
                value={offPhoneId}
                onChange={(e) => setOffPhoneId(e.target.value)}
                placeholder="ID do número de telefone"
                className="text-xs h-9 bg-secondary"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Business ID</Label>
              <Input
                value={offBusinessId}
                onChange={(e) => setOffBusinessId(e.target.value)}
                placeholder="ID da conta Business"
                className="text-xs h-9 bg-secondary"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Meta Access Token</Label>
              <Input
                type="password"
                value={offAccessToken}
                onChange={(e) => setOffAccessToken(e.target.value)}
                placeholder={waOfficial.config.access_token ? "••••••• (já configurado)" : "Token de acesso permanente"}
                className="text-xs h-9 bg-secondary"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setOfficialSettingsOpen(false)} className="text-xs">Cancelar</Button>
            <Button
              size="sm"
              className="text-xs bg-success hover:bg-success/90 text-white"
              onClick={handleSaveOfficialSettings}
              disabled={!offApiUrl || !offInstance || (!offApiKey && !waOfficial.config.has_api_key) || !offPhoneId || !offBusinessId}
            >
              Salvar e Conectar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
