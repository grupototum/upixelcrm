import { AppLayout } from "@/components/layout/AppLayout";
import { WhatsAppManagement } from "@/components/whatsapp/WhatsAppManagement";

/**
 * Página standalone /whatsapp — wrapper fino sobre WhatsAppManagement.
 * O mesmo componente é renderizado inline em /integrations via
 * WhatsAppIntegrationPanel (aba Números).
 */
export default function WhatsAppPage() {
  return (
    <AppLayout title="WhatsApp" subtitle="Números conectados">
      <WhatsAppManagement />
    </AppLayout>
  );
}
