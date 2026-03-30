import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useAppState } from "@/contexts/AppContext";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Plus, Zap, MessageSquare, Bot, Workflow, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComingSoonBadge } from "@/components/ui/coming-soon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RulesTab } from "@/components/automations/RulesTab";
import { SequencesTab } from "@/components/automations/SequencesTab";
import { BotsTab } from "@/components/automations/BotsTab";
import { ComplexTab } from "@/components/automations/ComplexTab";
import { TimeActionsTab } from "@/components/automations/TimeActionsTab";
import { toast } from "sonner";

const tabLabels: Record<string, string> = {
  rules: "Nova Automação",
  time_actions: "Configurar Tempo",
  sequences: "Nova Sequência",
  bots: "Novo Bot",
  complex: "Novo Fluxo",
};

export default function AutomationsPage() {
  const location = useLocation();
  const initialTab = (location.state as { tab?: string })?.tab || "rules";
  const [activeTab, setActiveTab] = useState(initialTab);
  const { addBasicAutomation } = useAppState();

  const handleCreate = () => {
    if (activeTab === "rules") {
      addBasicAutomation({
        name: "Nova Automação " + (Math.floor(Math.random() * 100)),
        trigger: { type: "card_entered" },
        actions: [{ type: "add_tag", config: { tag: "novo" } }],
      });
    } else if (activeTab === "time_actions") {
      addBasicAutomation({
        name: "Ação de Tempo " + (Math.floor(Math.random() * 100)),
        trigger: { type: "time_in_column", config: { hours: 24 } },
        actions: [{ type: "send_message", config: { text: "Olá! Como podemos ajudar?" } }],
      });
    } else {
      toast.success(`${tabLabels[activeTab]} criada com sucesso! (Demonstração)`);
    }
  };

  return (
    <AppLayout
      title="Automações"
      subtitle="Regras, sequências e bots"
      actions={
        <Button 
          size="sm" 
          onClick={handleCreate}
          className="text-xs gap-1 bg-primary hover:bg-primary-hover text-primary-foreground"
        >
          <Plus className="h-3 w-3" /> {tabLabels[activeTab]}
        </Button>
      }
    >
      <div className="p-6 animate-fade-in">
          <TabsList className="bg-secondary">
            <TabsTrigger value="rules" className="text-xs gap-1.5">
              <Zap className="h-3 w-3" /> Regras e Automações
            </TabsTrigger>
            <TabsTrigger value="time_actions" className="text-xs gap-1.5">
              <Clock className="h-3 w-3" /> Ações de Tempo
            </TabsTrigger>
            <TabsTrigger value="sequences" className="text-xs gap-1.5">
              <MessageSquare className="h-3 w-3" /> Mensagens e Sequências
            </TabsTrigger>
            <TabsTrigger value="bots" className="text-xs gap-1.5">
              <Bot className="h-3 w-3" /> Bots <ComingSoonBadge />
            </TabsTrigger>
            <TabsTrigger value="complex" className="text-xs gap-1.5">
              <Workflow className="h-3 w-3" /> Automações Complexas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rules"><RulesTab /></TabsContent>
          <TabsContent value="time_actions"><TimeActionsTab /></TabsContent>
          <TabsContent value="sequences"><SequencesTab /></TabsContent>
          <TabsContent value="bots"><BotsTab /></TabsContent>
          <TabsContent value="complex"><ComplexTab /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
