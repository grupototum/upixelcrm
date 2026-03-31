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

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export default function WhatsAppPage() {
  const navigate = useNavigate();
  const [apiStatus, setApiStatus] = useState<ConnectionStatus>("disconnected");
  const [liteStatus, setLiteStatus] = useState<ConnectionStatus>("disconnected");
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrStep, setQrStep] = useState<"scan" | "connecting" | "success">("scan");
  const [connectedNumber, setConnectedNumber] = useState("");

  // Integração Real - WhatsApp Web / Evolution API / Baileys
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem("evo_api_url") || "https://sua-api.com.br");
  const [instanceName, setInstanceName] = useState(() => localStorage.getItem("evo_instance") || "upixel-instance");
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("evo_api_key") || "SUA_API_KEY");
  
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);

  const handleSaveSettings = () => {
    localStorage.setItem("evo_api_url", apiUrl);
    localStorage.setItem("evo_instance", instanceName);
    localStorage.setItem("evo_api_key", apiKey);
    setSettingsOpen(false);
    toast.success("Credenciais da Evolution API salvas com sucesso!");
  };

  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        // Exemplo de chamada real para checar o status da conexão
        const res = await fetch(`${apiUrl}/instance/connectionState/${instanceName}`, {
          headers: { apikey: apiKey }
        });
        if (!res.ok) throw new Error("API Indisponível");
        const data = await res.json();
        
        if (data.instance?.state === "open") {
          setQrStep("success");
          setLiteStatus("connected");
          setConnectedNumber(data.instance?.owner || "+55 11 98765-4321");
          clearInterval(pollInterval);
        } else if (data.instance?.state === "connecting") {
           setQrStep("connecting");
        }
      } catch (e) {
        // Fallback para Demonstração (Mock) se a API não estiver conectada
        if (qrStep === "scan") {
          pollInterval = setTimeout(() => setQrStep("connecting"), 4000);
        } else if (qrStep === "connecting") {
          pollInterval = setTimeout(() => {
            setQrStep("success");
            setLiteStatus("connected");
            setConnectedNumber("+55 11 98765-4321 (Demonstração)");
            toast.success("WhatsApp conectado (Modo Demo)!");
          }, 2000);
        }
      }
    };

    if (qrModalOpen && qrStep !== "success") {
      checkStatus();
      pollInterval = setInterval(checkStatus, 3000); // Polling a cada 3s para ler status ou qr
    }

    return () => {
      clearInterval(pollInterval);
      clearTimeout(pollInterval);
    };
  }, [qrModalOpen, qrStep]);

  const initiateConnection = async () => {
    setLiteStatus("connecting");
    setQrModalOpen(true);
    setQrStep("scan");
    setQrCodeData(null);
    try {
      // Exemplo de chamada real para gerar o QRCode
      const res = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
        headers: { apikey: apiKey }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.base64) {
        setQrCodeData(data.base64); // Sua API retorna QRCode em Base64
      }
    } catch (e) {
      console.warn("Usando QRCode Fake para demonstração");
    }
  };

  const handleConnectApi = () => {
    setApiStatus("connecting");
    setTimeout(() => {
      setApiStatus("connected");
      toast.success("WhatsApp API conectado!");
    }, 2000);
  };

  const handleDisconnectApi = () => {
    setApiStatus("disconnected");
    toast.info("WhatsApp API desconectado.");
  };

  const handleDisconnectLite = async () => {
    setLiteStatus("disconnected");
    setConnectedNumber("");
    try {
      // Chamada real para desconectar
      await fetch(`${apiUrl}/instance/logout/${instanceName}`, { method: 'DELETE', headers: { apikey: apiKey } });
    } catch(e) { /* ignore in demo */ }
    toast.info("WhatsApp Lite desconectado.");
  };

  return (
    <AppLayout
      title="WhatsApp"
      subtitle="Conecte seu WhatsApp ao uPixel"
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="text-xs gap-1 opacity-70 hover:opacity-100" onClick={() => setSettingsOpen(true)}>
            <Settings className="h-3 w-3" /> Credenciais API
          </Button>
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
                mensagens em massa e integração com bots. Ideal para operações profissionais.
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
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={() => toast.info("Configurações da API — em breve")}>
                        <Settings className="h-3 w-3" /> Configurar
                      </Button>
                    </div>
                    <Button size="sm" variant="outline" className="text-xs gap-1 text-destructive" onClick={handleDisconnectApi}>
                      <XCircle className="h-3 w-3" /> Desconectar
                    </Button>
                  </>
                ) : apiStatus === "connecting" ? (
                  <Button size="sm" disabled className="text-xs gap-1 w-full">
                    <Loader2 className="h-3 w-3 animate-spin" /> Conectando...
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="text-xs gap-1 w-full bg-success hover:bg-success/90 text-white"
                    onClick={handleConnectApi}
                  >
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
                    <p className="text-[11px] text-muted-foreground">Conexão via QR Code</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[9px] border-accent/40 text-accent">Alternativo</Badge>
                  <StatusBadge status={liteStatus} />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Conexão rápida via QR Code, ideal para uso imediato e testes. Funciona como o WhatsApp Web.
                Não requer conta Business verificada.
              </p>

              <div className="flex flex-wrap gap-2">
                <FeatureTag label="QR Code" />
                <FeatureTag label="Setup rápido" />
                <FeatureTag label="Uso imediato" />
              </div>

              {liteStatus === "connected" && connectedNumber && (
                <div className="bg-secondary rounded-lg p-3 flex items-center gap-3">
                  <Phone className="h-4 w-4 text-success" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{connectedNumber}</p>
                    <p className="text-[10px] text-muted-foreground">Sessão ativa</p>
                  </div>
                </div>
              )}

              <div className="border-t border-border/40 pt-4 flex items-center justify-between">
                {liteStatus === "connected" ? (
                  <>
                    <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={() => { setQrStep("scan"); setQrModalOpen(true); }}>
                      <RefreshCw className="h-3 w-3" /> Atualizar sessão
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs gap-1 text-destructive" onClick={handleDisconnectLite}>
                      <XCircle className="h-3 w-3" /> Desconectar
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    className="text-xs gap-1 w-full bg-accent hover:bg-accent-hover text-accent-foreground"
                    onClick={initiateConnection}
                  >
                    <QrCode className="h-3 w-3" /> Conectar via QR Code
                  </Button>
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

        {/* Info section */}
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
      <Dialog open={qrModalOpen} onOpenChange={(open) => { setQrModalOpen(open); if (!open && liteStatus === "connecting") setLiteStatus("disconnected"); }}>
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
                    {qrCodeData ? (
                      <img src={qrCodeData} alt="WhatsApp QR Code" className="h-full w-full object-contain" />
                    ) : (
                      <svg viewBox="0 0 100 100" className="h-full w-full opacity-60">
                        {Array.from({ length: 10 }).map((_, row) =>
                          Array.from({ length: 10 }).map((_, col) => {
                            const isFilled = Math.random() > 0.4 ||
                              (row < 3 && col < 3) || (row < 3 && col > 6) || (row > 6 && col < 3);
                            return isFilled ? (
                              <rect key={`${row}-${col}`} x={col * 10} y={row * 10} width="9" height="9" fill="#1a1a1a" rx="1" />
                            ) : null;
                          })
                        )}
                      </svg>
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
                <p className="text-[11px] text-muted-foreground mb-3">{connectedNumber}</p>
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
              <Settings className="h-4 w-4 text-primary" /> Configurar Credenciais Externas
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">URL da Evolution API (Base)</Label>
              <Input 
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="Ex: https://api.suaempresa.com.br"
                className="text-xs h-9 bg-secondary"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome da Instância</Label>
              <Input 
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                placeholder="Ex: upixel-instance"
                className="text-xs h-9 bg-secondary"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Global API Key (Autenticação)</Label>
              <Input 
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Chave do ambiente (Ex: 429384...)"
                className="text-xs h-9 bg-secondary"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(false)} className="text-xs">Cancelar</Button>
            <Button size="sm" className="text-xs bg-primary hover:bg-primary-hover text-primary-foreground" onClick={handleSaveSettings}>
              Salvar Conexão
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function StatusBadge({ status }: { status: ConnectionStatus }) {
  if (status === "connected")
    return <Badge className="bg-success/15 text-success border-success/30 text-[10px] gap-1"><CheckCircle2 className="h-3 w-3" /> Conectado</Badge>;
  if (status === "connecting")
    return <Badge className="bg-accent/15 text-accent border-accent/30 text-[10px] gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Conectando</Badge>;
  if (status === "error")
    return <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px] gap-1"><XCircle className="h-3 w-3" /> Erro</Badge>;
  return <Badge variant="outline" className="text-[10px] gap-1"><WifiOff className="h-3 w-3" /> Desconectado</Badge>;
}

function FeatureTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-secondary text-[10px] font-medium text-muted-foreground">
      {label}
    </span>
  );
}
