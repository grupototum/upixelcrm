import { AppLayout } from "@/components/layout/AppLayout";
import { MessageCircle, Instagram, Globe, Webhook, Code, Mail, ExternalLink, CheckCircle2, XCircle, ArrowLeft, Shield, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  icon: any;
  color: string;
  status: string;
  category: "channel" | "developer" | "email";
  configRoute?: string;
}

interface IntegrationCardProps {
  key?: string | number;
  integration: any;
  active: boolean;
  onToggle: (v: boolean) => void;
  onConfigure: () => void;
}

const integrations: Integration[] = [
  { id: "whatsapp", name: "WhatsApp", description: "Conecte seu WhatsApp via API Oficial (Meta) ou QR Code (Lite) para atendimento omnichannel.", icon: MessageCircle, color: "text-success", status: "disconnected", category: "channel", configRoute: "/whatsapp" },
  { id: "instagram", name: "Instagram Direct", description: "Receba e responda mensagens do Instagram diretamente no inbox.", icon: Instagram, color: "text-pink-500", status: "coming_soon", category: "channel" },
  { id: "google", name: "Google", description: "Gmail, Calendar e Drive integrados ao uPixel.", icon: Globe, color: "text-blue-500", status: "disconnected", category: "channel", configRoute: "/google" },
  { id: "webhook", name: "Webhooks", description: "Receba leads e eventos via webhooks customizados em tempo real.", icon: Webhook, status: "disconnected", color: "text-accent", category: "developer" },
  { id: "api", name: "API uPixel", description: "Acesse a API REST do uPixel para integrações personalizadas.", icon: Code, status: "disconnected", color: "text-primary", category: "developer" },
  { id: "smtp", name: "E-mail (SMTP)", description: "Configure envio de e-mails transacionais e notificações pelo sistema.", icon: Mail, status: "coming_soon", color: "text-muted-foreground", category: "email" },
];

export default function IntegrationsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [realStatuses, setRealStatuses] = useState<Record<string, string>>({});
  const [apiModalOpen, setApiModalOpen] = useState(false);
  const [webhookModalOpen, setWebhookModalOpen] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStatuses() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase.from("profiles").select("client_id").eq("id", user.id).single();
        if (!profile) return;

        const { data: ints } = await supabase
          .from("integrations")
          .select("provider, status")
          .eq("client_id", profile.client_id);

        const statusMap: Record<string, string> = {};
        ints?.forEach(i => {
          statusMap[i.provider] = i.status;
        });
        
        // WhatsApp special handling: if any of the two are connected, the unified card is "connected"
        if (statusMap["whatsapp"] === "connected" || statusMap["whatsapp_official"] === "connected") {
          statusMap["whatsapp_unified"] = "connected";
        } else if (statusMap["whatsapp"] === "configured" || statusMap["whatsapp_official"] === "configured") {
          statusMap["whatsapp_unified"] = "configured";
        } else {
          statusMap["whatsapp_unified"] = "disconnected";
        }

        setRealStatuses(statusMap);
        setProjectId(import.meta.env.VITE_SUPABASE_PROJECT_ID);
      } catch (error) {
        console.error("Error fetching statuses:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStatuses();
  }, []);

  const handleToggle = (id: string, value: boolean) => {
    // For now, toggling from this page is mainly restricted to configuration redirect
    // but we can add logic to enable/disable via API if needed
    toast.info("Acesse as configurações para ativar/desativar esta integração.");
  };

  const handleConfigure = (id: string) => {
    if (id === "api") setApiModalOpen(true);
    else if (id === "webhook") setWebhookModalOpen(true);
    else {
      const int = integrations.find(i => i.id === id);
      if (int?.configRoute) navigate(int.configRoute);
    }
  };

  const integrationsWithStatus = integrations.map(int => ({
    ...int,
    status: (int.id === "whatsapp" ? realStatuses["whatsapp_unified"] : realStatuses[int.id]) || int.status
  }));

  const channels = integrationsWithStatus.filter(i => i.category === "channel");
  const devTools = integrationsWithStatus.filter(i => i.category !== "channel");

  // Count active unique integrations
  const activeCount = integrationsWithStatus.filter(i => i.status === "connected").length;

  const B = Badge as any;
  return (
    <AppLayout
      title="Integrações"
      subtitle="Conecte seus canais e ferramentas ao uPixel"
      actions={
        <B variant="outline" className="text-[10px] gap-1.5 px-2 py-1">
          <CheckCircle2 className="h-3 w-3 text-success" /> {activeCount} integração{activeCount !== 1 ? "ões" : ""} ativa{activeCount !== 1 ? "s" : ""}
        </B>
      }
    >
      <div className="p-6 space-y-8 animate-fade-in">
        {/* Canais */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Canais de comunicação</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              Array(3).fill(0).map((_, i) => <div key={i} className="h-44 bg-card/50 ghost-border rounded-xl animate-pulse" />)
            ) : (
              channels.map((int) => (
                <IntegrationCard
                  key={int.id}
                  integration={int}
                  active={int.status === "connected" || int.status === "configured"}
                  onToggle={(v) => handleToggle(int.id, v)}
                  onConfigure={() => handleConfigure(int.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Developer & Email */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Ferramentas e APIs</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              Array(2).fill(0).map((_, i) => <div key={i} className="h-44 bg-card/50 ghost-border rounded-xl animate-pulse" />)
            ) : (
              devTools.map((int) => (
                <IntegrationCard
                  key={int.id}
                  integration={int}
                  active={int.status === "connected" || int.status === "configured"}
                  onToggle={(v) => handleToggle(int.id, v)}
                  onConfigure={() => handleConfigure(int.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <ApiSettingsModal open={apiModalOpen} onOpenChange={setApiModalOpen} />
      <WebhookSettingsModal open={webhookModalOpen} onOpenChange={setWebhookModalOpen} />
    </AppLayout>
  );
}

function StatusBadge({ status, active }: { status: string; active?: boolean }) {
  const B = Badge as any;
  if (status === "coming_soon") return <ComingSoonBadge />;
  if (status === "connected") return <B variant="success" className="bg-success/15 text-success border-success/30 text-[10px] gap-1"><CheckCircle2 className="h-2.5 w-2.5" /> Conectado</B>;
  if (status === "configured") return <B className="bg-primary/15 text-primary border-primary/30 text-[10px] gap-1"><CheckCircle2 className="h-2.5 w-2.5" /> Configurado</B>;
  return <B variant="outline" className="text-[10px] gap-1 text-muted-foreground opacity-60"><XCircle className="h-2.5 w-2.5" /> Inativo</B>;
}

function IntegrationCard({ integration: int, active, onToggle, onConfigure }: IntegrationCardProps) {
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
              <span className={`text-xs ${active ? 'text-primary font-medium' : 'text-muted-foreground'}`}>{active ? "Ativo" : "Inativo"}</span>
            </div>
            <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary hover:bg-primary/5 rounded-lg" onClick={onConfigure}>
              Gerenciar <ExternalLink className="h-3 w-3" />
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" className="text-xs w-full rounded-lg" disabled>
            Em breve
          </Button>
        )}
      </div>
    </div>
  );
}
