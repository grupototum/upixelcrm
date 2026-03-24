import { AppLayout } from "@/components/layout/AppLayout";
import { Plug, MessageCircle, Instagram, Mail, Globe, Code, Webhook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComingSoonBadge } from "@/components/ui/coming-soon";

const integrations = [
  { name: "WhatsApp Business", description: "Conecte sua conta do WhatsApp Business para atender leads diretamente.", icon: MessageCircle, status: "coming_soon" as const, color: "text-success" },
  { name: "Instagram Direct", description: "Receba e responda mensagens do Instagram diretamente no uPixel.", icon: Instagram, status: "coming_soon" as const, color: "text-pink-500" },
  { name: "Google", description: "Integre com Google Ads, Sheets e Calendar.", icon: Globe, status: "coming_soon" as const, color: "text-blue-500" },
  { name: "Webhooks", description: "Receba leads e eventos via webhooks customizados.", icon: Webhook, status: "available" as const, color: "text-accent" },
  { name: "API uPixel", description: "Acesse a API REST do uPixel para integrações personalizadas.", icon: Code, status: "available" as const, color: "text-primary" },
  { name: "E-mail (SMTP)", description: "Configure envio de e-mails pelo sistema.", icon: Mail, status: "coming_soon" as const, color: "text-muted-foreground" },
];

export default function IntegrationsPage() {
  return (
    <AppLayout title="Integrações" subtitle="Conecte seus canais e ferramentas">
      <div className="p-6 animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map((int) => (
            <div key={int.name} className="bg-card border border-border rounded-lg p-5 hover:border-border-hover transition-colors">
              <div className="flex items-start justify-between mb-3">
                <int.icon className={`h-8 w-8 ${int.color}`} />
                {int.status === "coming_soon" && <ComingSoonBadge />}
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">{int.name}</h3>
              <p className="text-xs text-muted-foreground mb-4">{int.description}</p>
              <Button
                variant={int.status === "available" ? "default" : "outline"}
                size="sm"
                className={`text-xs w-full ${int.status === "available" ? "bg-primary hover:bg-primary-hover text-primary-foreground" : ""}`}
                disabled={int.status === "coming_soon"}
              >
                {int.status === "available" ? "Configurar" : "Em breve"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
