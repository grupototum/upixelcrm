import { logger } from "@/lib/logger";
import { AppLayout } from "@/components/layout/AppLayout";
import { MessageCircle, Instagram, Facebook, Globe, Webhook, Code, Mail, ExternalLink, CheckCircle2, XCircle, Megaphone, TrendingUp, LayoutGrid, MessagesSquare, Wrench } from "lucide-react";
import * as integrationsRepo from "@/services/integrations";
import * as usersRepo from "@/services/users";
import { getCurrentUser } from "@/lib/auth-session";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ComingSoonBadge } from "@/components/ui/coming-soon";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect, useMemo } from "react";
import { ApiSettingsModal } from "@/components/integrations/ApiSettingsModal";
import { WebhookSettingsModal } from "@/components/integrations/WebhookSettingsModal";
import { WhatsAppIntegrationPanel } from "@/components/whatsapp/WhatsAppIntegrationPanel";
import { toast } from "sonner";

type CategoryId = "all" | "messaging" | "ads" | "workspace" | "developer";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  status: string;
  category: CategoryId;
  configRoute?: string;
  tag?: string;
}

interface IntegrationCardProps {
  key?: string | number;
  integration: any;
  active: boolean;
  hasIntegration: boolean;
  /** Quando true, o botão Gerenciar vira "Recolher" (toggle do painel inline). */
  expanded?: boolean;
  onToggle: (v: boolean) => void;
  onConfigure: () => void;
}

const integrations: Integration[] = [
  // Mensageria
  // WhatsApp não tem configRoute: expande inline (Números + Templates) via handleConfigure.
  { id: "whatsapp", name: "WhatsApp", description: "API Oficial (Cloud), QR Code (Lite) ou Coexistence — escolha o modo que se encaixa.", icon: MessageCircle, color: "text-success", status: "disconnected", category: "messaging", tag: "3 modos" },
  { id: "instagram", name: "Instagram Direct", description: "Receba e responda DMs do Instagram diretamente no inbox.", icon: Instagram, color: "text-pink-500", status: "disconnected", category: "messaging", configRoute: "/instagram" },
  { id: "facebook_page", name: "Facebook Messenger", description: "Conecte páginas do Facebook para receber DMs do Messenger no inbox.", icon: Facebook, color: "text-[#1877F2]", status: "disconnected", category: "messaging", configRoute: "/facebook-page" },
  // Anúncios
  { id: "meta_ads", name: "Meta Ads", description: "Facebook & Instagram Ads — campanhas, métricas reais e captura de leads de formulários.", icon: Megaphone, color: "text-blue-600", status: "disconnected", category: "ads", configRoute: "/meta-ads" },
  { id: "google_ads", name: "Google Ads", description: "Importe campanhas e métricas reais do Google Ads.", icon: TrendingUp, color: "text-orange-500", status: "disconnected", category: "ads", configRoute: "/google-ads" },
  // Workspace
  { id: "google", name: "Google Workspace", description: "Gmail, Calendar e Drive integrados ao uPixel.", icon: Globe, color: "text-blue-500", status: "disconnected", category: "workspace", configRoute: "/google" },
  // Dev / APIs
  { id: "webhook", name: "Webhooks", description: "Receba leads e eventos via webhooks customizados em tempo real.", icon: Webhook, status: "disconnected", color: "text-accent", category: "developer" },
  { id: "api", name: "API uPixel", description: "Acesse a API REST do uPixel para integrações personalizadas.", icon: Code, status: "disconnected", color: "text-primary", category: "developer" },
  { id: "smtp", name: "E-mail (SMTP)", description: "Configure envio de e-mails transacionais e notificações pelo sistema.", icon: Mail, status: "coming_soon", color: "text-muted-foreground", category: "developer" },
];

const CATEGORIES: Array<{ id: CategoryId; label: string; icon: any }> = [
  { id: "all", label: "Todas", icon: LayoutGrid },
  { id: "messaging", label: "Mensageria", icon: MessagesSquare },
  { id: "ads", label: "Anúncios", icon: Megaphone },
  { id: "workspace", label: "Workspace", icon: Globe },
  { id: "developer", label: "Dev & APIs", icon: Wrench },
];

export default function IntegrationsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [realStatuses, setRealStatuses] = useState<Record<string, string>>({});
  // Providers que já existem como linha em `integrations` (independente do status).
  // Usado pra decidir se o card mostra toggle Ativar (já configurado antes) ou "Conectar" (1ª vez).
  const [existingProviders, setExistingProviders] = useState<Set<string>>(new Set());
  // Id do card expandido inline (atualmente só "whatsapp" usa esse mecanismo).
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [apiModalOpen, setApiModalOpen] = useState(false);
  const [webhookModalOpen, setWebhookModalOpen] = useState(false);

  // Categoria ativa controlada por URL (?category=messaging|ads|workspace|developer|all)
  const activeCategory: CategoryId = useMemo(() => {
    const raw = searchParams.get("category") as CategoryId | null;
    return raw && CATEGORIES.some((c) => c.id === raw) ? raw : "all";
  }, [searchParams]);

  const setCategory = (cat: CategoryId) => {
    if (cat === "all") {
      searchParams.delete("category");
    } else {
      searchParams.set("category", cat);
    }
    setSearchParams(searchParams, { replace: true });
  };

  useEffect(() => {
    async function fetchStatuses() {
      try {
        const user = await getCurrentUser();
        if (!user) return;

        const clientId = await usersRepo.getProfileClientId(user.id);
        if (!clientId) return;

        const ints = await integrationsRepo.listIntegrationStatuses(clientId);

        const statusMap: Record<string, string> = {};
        const existing = new Set<string>();
        ints?.forEach(i => {
          statusMap[i.provider] = i.status;
          existing.add(i.provider);
        });
        setExistingProviders(existing);
        
        // WhatsApp unified card cobre 3 providers: whatsapp (Baileys), whatsapp_official (legacy)
        // e whatsapp_cloud (Meta Cloud API atual). Se qualquer um conectar, o card mostra ativo.
        const waProviders = ["whatsapp", "whatsapp_official", "whatsapp_cloud"] as const;
        if (waProviders.some(p => statusMap[p] === "connected")) {
          statusMap["whatsapp_unified"] = "connected";
        } else if (waProviders.some(p => statusMap[p] === "configured")) {
          statusMap["whatsapp_unified"] = "configured";
        } else {
          statusMap["whatsapp_unified"] = "disconnected";
        }

        setRealStatuses(statusMap);
      } catch (error) {
        logger.error("Error fetching statuses:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStatuses();
  }, []);

  const handleToggle = async (id: string, value: boolean) => {
    // Mapeia o id do card unificado pros providers reais no banco
    const providersByCard: Record<string, string[]> = {
      whatsapp: ["whatsapp", "whatsapp_official", "whatsapp_cloud"],
      instagram: ["instagram"],
      facebook_page: ["facebook_page"],
      meta_ads: ["meta_ads"],
      google_ads: ["google_ads"],
      google: ["google"],
    };
    const providers = providersByCard[id];
    if (!providers) {
      toast.info("Acesse as configurações para ativar/desativar esta integração.");
      return;
    }

    try {
      const newStatus = value ? "connected" : "disconnected";
      const user = await getCurrentUser();
      if (!user) return;
      const clientId = await usersRepo.getProfileClientId(user.id);
      if (!clientId) return;

      // Só atualiza linhas que já existem (conectadas) — não cria registro novo.
      await integrationsRepo.updateIntegrationStatusByProviders(clientId, providers, newStatus);

      // Atualiza UI: recalcula status unificado
      const updated = { ...realStatuses };
      providers.forEach(p => {
        if (updated[p] === "connected" || updated[p] === "disconnected") updated[p] = newStatus;
      });
      if (id === "whatsapp") {
        updated["whatsapp_unified"] = newStatus;
      }
      setRealStatuses(updated);
      toast.success(value ? "Integração ativada." : "Integração desativada.");
    } catch (err: any) {
      logger.error("Toggle integration failed:", err);
      toast.error(`Falha ao alternar status: ${err.message ?? "erro desconhecido"}`);
    }
  };

  const handleConfigure = (id: string) => {
    if (id === "api") setApiModalOpen(true);
    else if (id === "webhook") setWebhookModalOpen(true);
    else if (id === "whatsapp") {
      // WhatsApp expande inline (Números + Templates em abas) em vez de navegar
      setExpandedCardId(prev => prev === "whatsapp" ? null : "whatsapp");
    } else {
      const int = integrations.find(i => i.id === id);
      if (int?.configRoute) navigate(int.configRoute);
    }
  };

  const integrationsWithStatus = integrations.map(int => ({
    ...int,
    status: (int.id === "whatsapp" ? realStatuses["whatsapp_unified"] : realStatuses[int.id]) || int.status
  }));

  // Filter by active category tab
  const visible = activeCategory === "all"
    ? integrationsWithStatus
    : integrationsWithStatus.filter((i) => i.category === activeCategory);

  // Count active unique integrations (global, não filtra por categoria)
  const activeCount = integrationsWithStatus.filter(i => i.status === "connected").length;

  const B = Badge as any;
  return (
    <AppLayout
      title="Integrações"
      subtitle="Conecte seus canais e ferramentas ao uPixel"
      actions={
        <B variant="outline" className="text-[10px] gap-1.5 px-2 py-1">
          <CheckCircle2 className="h-3 w-3 text-success" /> {activeCount} {activeCount !== 1 ? "integrações ativas" : "integração ativa"}
        </B>
      }
    >
      <div className="p-6 space-y-6 animate-fade-in">
        {/* Tab navigation por categoria */}
        <Tabs value={activeCategory} onValueChange={(v) => setCategory(v as CategoryId)}>
          <TabsList className="bg-card border border-border h-auto p-1 flex-wrap">
            {CATEGORIES.map((cat) => {
              const count = cat.id === "all"
                ? integrationsWithStatus.length
                : integrationsWithStatus.filter((i) => i.category === cat.id).length;
              return (
                <TabsTrigger key={cat.id} value={cat.id} className="gap-1.5 text-xs">
                  <cat.icon className="h-3.5 w-3.5" />
                  {cat.label}
                  <span className="ml-1 text-[9px] text-muted-foreground">{count}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array(6).fill(0).map((_, i) => <div key={i} className="h-44 bg-card ghost-border rounded-xl animate-pulse" />)
          ) : visible.length === 0 ? (
            <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
              Nenhuma integração nesta categoria.
            </div>
          ) : (
            visible.map((int) => {
              // Card "whatsapp" cobre 3 providers — basta um existir no DB.
              const providersForCard = int.id === "whatsapp"
                ? ["whatsapp", "whatsapp_official", "whatsapp_cloud"]
                : [int.id];
              const hasIntegration = providersForCard.some(p => existingProviders.has(p));
              const isExpanded = expandedCardId === int.id;
              return (
                <>
                  <IntegrationCard
                    key={int.id}
                    integration={int}
                    active={int.status === "connected" || int.status === "configured"}
                    hasIntegration={hasIntegration}
                    expanded={isExpanded}
                    onToggle={(v) => handleToggle(int.id, v)}
                    onConfigure={() => handleConfigure(int.id)}
                  />
                  {isExpanded && int.id === "whatsapp" && (
                    <WhatsAppIntegrationPanel key={`${int.id}-panel`} />
                  )}
                </>
              );
            })
          )}
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
  if (status === "configured") return <B className="bg-primary/15 text-primary border-[hsl(var(--border-strong))] text-[10px] gap-1"><CheckCircle2 className="h-2.5 w-2.5" /> Configurado</B>;
  return <B variant="outline" className="text-[10px] gap-1 text-muted-foreground opacity-60"><XCircle className="h-2.5 w-2.5" /> Inativo</B>;
}

function IntegrationCard({ integration: int, active, hasIntegration, expanded, onToggle, onConfigure }: IntegrationCardProps) {
  const isAvailable = int.status !== "coming_soon";
  const B = Badge as any;

  return (
    <div className={`bg-card ghost-border rounded-xl p-5 shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col ${active && isAvailable ? 'hover:border-[hsl(var(--border-strong))] ring-1 ring-primary/10' : 'hover:border-[#ff4f00]/30'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${active && isAvailable ? 'bg-primary/10' : 'bg-muted'}`}>
          <int.icon className={`h-5 w-5 ${active && isAvailable ? int.color : 'text-muted-foreground'}`} />
        </div>
        <StatusBadge status={int.status} active={active} />
      </div>

      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-sm font-semibold text-foreground">{int.name}</h3>
        {int.tag && (
          <B variant="outline" className="text-[9px] px-1.5 py-0 border-primary/30 text-primary">{int.tag}</B>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-4 flex-1">{int.description}</p>

      {isAvailable ? (
        active || hasIntegration ? (
          // Já configurada (ativa OU pausada): mostra toggle Ativar/Desativar + Gerenciar.
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch checked={active} onCheckedChange={onToggle} className="scale-90" />
              <span className={`text-xs font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>
                {active ? "Ativo" : "Inativo"}
              </span>
            </div>
            <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary hover:bg-primary/5 rounded-lg" onClick={onConfigure}>
              {expanded ? "Recolher" : "Gerenciar"} <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          // Nunca configurada: CTA primário "Conectar →"
          <Button
            size="sm"
            className="text-xs w-full rounded-lg gap-1.5 bg-primary hover:bg-[#e04400] text-white"
            onClick={onConfigure}
          >
            Conectar <ExternalLink className="h-3 w-3" />
          </Button>
        )
      ) : (
        <Button variant="outline" size="sm" className="text-xs w-full rounded-lg" disabled>
          Em breve
        </Button>
      )}
    </div>
  );
}
