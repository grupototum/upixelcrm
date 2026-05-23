import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MessageCircle, FileText } from "lucide-react";
import { WhatsAppManagement } from "@/components/whatsapp/WhatsAppManagement";
import { TemplateManager } from "@/components/whatsapp/broadcast/TemplateManager";

/**
 * Painel inline pro card WhatsApp em /integrations — agrupa Números (Cloud + QR)
 * e Templates HSM em abas. Renderizado expandido abaixo do card quando o usuário
 * clica em "Gerenciar".
 */
export function WhatsAppIntegrationPanel() {
  const [tab, setTab] = useState<"numeros" | "templates">("numeros");

  return (
    <div className="col-span-full bg-card ghost-border rounded-xl p-6 space-y-4 animate-fade-in">
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="numeros" className="gap-2 text-xs">
            <MessageCircle className="h-3.5 w-3.5" /> Números
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2 text-xs">
            <FileText className="h-3.5 w-3.5" /> Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="numeros" className="mt-4 focus-visible:outline-none">
          <WhatsAppManagement embedded />
        </TabsContent>

        <TabsContent value="templates" className="mt-4 focus-visible:outline-none">
          <TemplateManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
