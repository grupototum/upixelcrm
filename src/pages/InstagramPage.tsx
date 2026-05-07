import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Shield, CheckCircle2, XCircle, Loader2,
  Settings, ArrowLeft, Instagram, Wifi, WifiOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInstagramIntegration } from "@/hooks/useInstagramIntegration";

type ConnectionStatus = "disconnected" | "connected" | "error";

function StatusBadge({ status }: { status: ConnectionStatus }) {
  const map: Record<string, { label: string; cls: string }> = {
    disconnected: { label: "Desconectado", cls: "border-muted-foreground/40 text-muted-foreground" },
    connected: { label: "Conectado", cls: "border-success/40 text-success" },
    error: { label: "Erro", cls: "border-destructive/40 text-destructive" },
  };
  const { label, cls } = map[status] || map.disconnected;
  return <Badge variant="outline" className={`text-[9px] ${cls}`}>{label}</Badge>;
}

function FeatureTag({ label }: { label: string }) {
  return <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{label}</Badge>;
}

export default function InstagramPage() {
  const navigate = useNavigate();
  const instagramApi = useInstagramIntegration();

  const [settingsOpen, setSettingsOpen] = useState(false);

  // Form Fields
  const [igAccountId, setIgAccountId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [webhookVerifyToken, setWebhookVerifyToken] = useState("");

  // Load form fields from saved config
  useEffect(() => {
    if (instagramApi.config.ig_account_id) setIgAccountId(instagramApi.config.ig_account_id);
    if (instagramApi.config.access_token) setAccessToken(instagramApi.config.access_token);
    if (instagramApi.config.webhook_verify_token) setWebhookVerifyToken(instagramApi.config.webhook_verify_token);
  }, [instagramApi.config]);

  const apiStatus = instagramApi.config.status as ConnectionStatus;

  const handleSaveSettings = async () => {
    await instagramApi.saveConfig(igAccountId, accessToken, webhookVerifyToken);
    setSettingsOpen(false);
  };

  const handleDisconnect = async () => {
    await instagramApi.disconnect();
  };

  return (
    <AppLayout
      title="Instagram"
      subtitle="Conexão Nativa com Instagram Direct"
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
              apiStatus === "connected"
                ? "border-success/40 text-success"
                : "border-muted-foreground/40 text-muted-foreground"
            }`}
          >
            {apiStatus === "connected" ? (
              <><Wifi className="h-3 w-3" /> Canal conectado</>
            ) : (
              <><WifiOff className="h-3 w-3" /> Canal não conectado</>
            )}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-6 max-w-2xl">
          {/* Card — API Oficial / Nativa */}
          <div className="bg-card ghost-border rounded-xl shadow-card overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-pink-500/10 flex items-center justify-center">
                    <Instagram className="h-6 w-6 text-pink-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Instagram Direct (Nativo)</h3>
                    <p className="text-[11px] text-muted-foreground">Meta Graph API</p>
                  </div>
                </div>
                <StatusBadge status={apiStatus} />
              </div>

              <p className="text-xs text-muted-foreground">
                Conexão através da infraestrutura nativa da Meta. Centralize o atendimento do seu Instagram diretamente na caixa de entrada do CRM de forma independente.
              </p>

              <div className="flex flex-wrap gap-2">
                <FeatureTag label="Direct Messages" />
                <FeatureTag label="Story Replies" />
                <FeatureTag label="Meta Webhooks" />
              </div>

              <div className="border-t border-[hsl(var(--border-strong))] pt-4 flex items-center justify-between">
                {apiStatus === "connected" ? (
                  <>
                    <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={() => setSettingsOpen(true)}>
                      <Settings className="h-3 w-3" /> Configurar
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs gap-1 text-destructive" onClick={handleDisconnect} disabled={instagramApi.loading}>
                      {instagramApi.loading ? <Loader2 className="h-3 w-3 animate-spin"/> : <XCircle className="h-3 w-3" />} Desconectar
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col w-full gap-2">
                    <Button size="sm" className="text-xs gap-1 w-full bg-pink-500 hover:bg-pink-600 text-white" onClick={() => setSettingsOpen(true)}>
                      <Settings className="h-3 w-3" /> Configurar Credenciais
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-pink-500/5 border-t border-pink-500/20 px-6 py-3">
              <p className="text-[10px] text-pink-500 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Recomendado para estabilidade independente
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-pink-500" /> Integração Nativa Instagram
            </DialogTitle>
            <DialogDescription className="text-xs">
              Informe as chaves do Meta for Developers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Instagram Account ID</Label>
              <Input
                value={igAccountId}
                onChange={(e) => setIgAccountId(e.target.value)}
                placeholder="Ex: 178414..."
                className="text-xs h-9 bg-secondary"
              />
              <p className="text-[10px] text-muted-foreground">O ID da conta conectada à sua Página do Facebook.</p>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">System Access Token</Label>
              <Input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder={instagramApi.config.access_token ? "••••••• (já configurado)" : "Token permanente do Meta (EAA...)"}
                className="text-xs h-9 bg-secondary"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Webhook Verify Token</Label>
              <Input
                value={webhookVerifyToken}
                onChange={(e) => setWebhookVerifyToken(e.target.value)}
                placeholder="Insira um token de verificação criativo"
                className="text-xs h-9 bg-secondary"
              />
              <p className="text-[10px] text-muted-foreground">Você vai precisar deste token para validar o Webhook no painel da Meta.</p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(false)} className="text-xs">Cancelar</Button>
            <Button
              size="sm"
              className="text-xs bg-pink-500 hover:bg-pink-600 text-white"
              onClick={handleSaveSettings}
              disabled={!igAccountId || !webhookVerifyToken || (!accessToken && !instagramApi.config.access_token) || instagramApi.loading}
            >
              {instagramApi.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Configurações"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
