import { AppLayout } from "@/components/layout/AppLayout";
import { TemplateManager } from "@/components/whatsapp/broadcast/TemplateManager";

/**
 * Página dedicada de templates WhatsApp HSM.
 * Atalho direto pra TemplateManager (mesmo componente da aba dentro de /whatsapp/broadcast),
 * pra usuário não precisar atravessar Disparos → Templates toda vez que quer gerenciar.
 */
export default function WhatsAppTemplatesPage() {
  return (
    <AppLayout
      title="Templates WhatsApp"
      subtitle="Modelos HSM aprovados pela Meta — necessários pra mensagens fora da janela de 24h"
    >
      <div className="p-6 max-w-7xl">
        <TemplateManager />
      </div>
    </AppLayout>
  );
}
