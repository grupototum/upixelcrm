import { AppLayout } from "@/components/layout/AppLayout";
import { TemplateManager } from "@/components/whatsapp/broadcast/TemplateManager";

/**
 * Página standalone /whatsapp/templates — wrapper fino sobre TemplateManager.
 * O mesmo componente é renderizado inline em /integrations via
 * WhatsAppIntegrationPanel (aba Templates).
 */
export default function WhatsAppTemplatesPage() {
  return (
    <AppLayout
      title="Templates WhatsApp"
      subtitle="Modelos HSM aprovados pela Meta — necessários pra mensagens fora da janela de 24h"
    >
      <div className="p-6 animate-fade-in">
        <TemplateManager />
      </div>
    </AppLayout>
  );
}
