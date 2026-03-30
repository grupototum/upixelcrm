import { AppLayout } from "@/components/layout/AppLayout";
import { MessageCircle, Instagram, Globe, Webhook, Code, Mail, ExternalLink, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ComingSoonBadge } from "@/components/ui/coming-soon";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { ApiSettingsModal } from "@/components/integrations/ApiSettingsModal";
import { WebhookSettingsModal } from "@/components/integrations/WebhookSettingsModal";
import { toast } from "sonner";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  status: "connected" | "disconnected" | "coming_soon";
  category: "channel" | "developer" | "email";
  configRoute?: string;
}

const integrations: Integration[] = [
  { id: "whatsapp", name: "WhatsApp Business", description: "Conecte sua conta do WhatsApp Business para atender leads diretamente pelo uPixel.", icon: MessageCircle, color: "text-success", status: "connected", category: "channel", configRoute: "/whatsapp" },
  { id: "instagram", name: "Instagram Direct", description: "Receba e responda mensagens do Instagram diretamente no inbox.", icon: Instagram, color: "text-pink-500", status: "coming_soon", category: "channel" },
  { id: "google", name: "Google", description: "Gmail, Calendar e Drive integrados ao uPixel.", icon: Globe, color: "text-blue-500", status: "connected", category: "channel", configRoute: "/google" },
  { id: "webhook", name: "Webhooks", description: "Receba leads e eventos via webhooks customizados em tempo real.", icon: Webhook, status: "connected", color: "text-accent", category: "developer" },
  { id: "api", name: "API uPixel", description: "Acesse a API REST do uPixel para integrações personalizadas.", icon: Code, status: "connected", color: "text-primary", category: "developer" },
  { id: "smtp", name: "E-mail (SMTP)", description: "Configure envio de e-mails transacionais e notificações pelo sistema.", icon: Mail, status: "coming_soon", color: "text-muted-foreground", category: "email" },
];

const STORAGE_KEY = "upixel_integration_toggles";

function loadToggles(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { whatsapp: false, google: false, webhook: true, api: true };
}

function saveToggles(toggles: Record<string, boolean>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toggles));
}

function StatusBadge({ status, active }: { status: Integration["status"]; active: boolean }) {
  if (status === "coming_soon") return <ComingSoonBadge />;
  if (status === "connected" && active) return <Badge className="bg-success/15 text-success border-success/30 text-[10px] gap-1"><CheckCircle2 className="h-2.5 w-2.5" /> Ativo</Badge>;
  if (status === "connected" && !active) return <Badge variant="outline" className="text-[10px] gap-1"><XCircle className="h-2.5 w-2.5" /> Inativo</Badge>;
  return <Badge variant="outline" className="text-[10px]">Inativo</Badge>;
}

export default function IntegrationsPage() {
  const navigate = useNavigate();
  const [activeToggles, setActiveToggles] = useState<Record<string, boolean>>(loadToggles);
  const [apiModalOpen, setApiModalOpen] = useState(false);
  const [webhookModalOpen, setWebhookModalOpen] = useState(false);

  // Persist toggle changes
  useEffect(() => {
    saveToggles(activeToggles);
  }, [activeToggles]);

  const channels = integrations.filter(i => i.category === "channel");
  const devTools = integrations.filter(i => i.category !== "channel");

  const handleToggle = (id: string, value: boolean) => {
    setActiveToggles(p => ({ ...p, [id]: value }));
    if (value) {
      toast.success(`${integrations.find(i => i.id === id)?.name} ativado.`);
    } else {
      toast.info(`${integrations.find(i => i.id === id)?.name} desativado.`);
    }
  };

  const handleConfigure = (id: string) => {
    if (id === "api") setApiModalOpen(true);
    else if (id === "webhook") setWebhookModalOpen(true);
    else {
      const int = integrations.find(i => i.id === id);
      if (int?.configRoute) navigate(int.configRoute);
    }
  };

  const activeCount = Object.values(activeToggles).filter(Boolean).length;

  return (
    <AppLayout
      title="Integrações"
      subtitle="Conecte seus canais e ferramentas ao uPixel"
      actions={
        <Badge variant="outline" className="text-[10px] gap-1.5 px-2 py-1">
          <CheckCircle2 className="h-3 w-3 text-success" /> {activeCount} integração{activeCount !== 1 ? "ões" : ""} ativa{activeCount !== 1 ? "s" : ""}
        </Badge>
      }
    >
      <div className="p-6 space-y-8 animate-fade-in">
        {/* Canais */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Canais de comunicação</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {channels.map((int) => (
              <IntegrationCard
                key={int.id}
                integration={int}
                active={activeToggles[int.id] ?? false}
                onToggle={(v) => handleToggle(int.id, v)}
                onConfigure={() => handleConfigure(int.id)}
              />
            ))}
          </div>
        </div>

        {/* Developer & Email */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Ferramentas e APIs</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {devTools.map((int) => (
              <IntegrationCard
                key={int.id}
                integration={int}
                active={activeToggles[int.id] ?? false}
                onToggle={(v) => handleToggle(int.id, v)}
                onConfigure={() => handleConfigure(int.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <ApiSettingsModal open={apiModalOpen} onOpenChange={setApiModalOpen} />
      <WebhookSettingsModal open={webhookModalOpen} onOpenChange={setWebhookModalOpen} />
    </AppLayout>
  );
}

function IntegrationCard({ integration: int, active, onToggle, onConfigure }: { integration: Integration; active: boolean; onToggle: (v: boolean) => void; onConfigure: () => void }) {
  const isAvailable = int.status !== "coming_soon";

  return (
    <div className={`bg-card ghost-border rounded-xl p-5 shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col ${active && isAvailable ? 'hover:border-primary/20 ring-1 ring-primary/10' : 'hover:border-border-hover'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${active && isAvailable ? 'bg-primary/10' : 'bg-muted'}`}>
          <int.icon className={`h-5 w-5 ${active && isAvailable ? int.color : 'text-muted-foreground'}`} />
        </div>
        <StatusBadge status={int.status} active={active} />
      </div>

      <h3 className="text-sm font-semibold text-foreground mb-1">{int.name}</h3>
      <p className="text-xs text-muted-foreground mb-4 flex-1">{int.description}</p>

      <div className="flex items-center justify-between">
        {isAvailable ? (
          <>
            <div className="flex items-center gap-2">
              <Switch checked={active} onCheckedChange={onToggle} className="scale-90" />
              <span className={`text-xs ${active ? 'text-success font-medium' : 'text-muted-foreground'}`}>{active ? "Ativo" : "Inativo"}</span>
            </div>
            <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary" onClick={onConfigure}>
              Configurar <ExternalLink className="h-3 w-3" />
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" className="text-xs w-full" disabled>
            Em breve
          </Button>
        )}
      </div>
    </div>
  );
}
