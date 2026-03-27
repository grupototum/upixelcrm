import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Plus, Zap, MessageSquare, Bot, Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComingSoonBadge } from "@/components/ui/coming-soon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RulesTab } from "@/components/automations/RulesTab";
import { SequencesTab } from "@/components/automations/SequencesTab";
import { BotsTab } from "@/components/automations/BotsTab";
import { ComplexTab } from "@/components/automations/ComplexTab";
import { toast } from "sonner";

const tabLabels: Record<string, string> = {
  rules: "Nova Automação",
  sequences: "Nova Sequência",
  bots: "Novo Bot",
  complex: "Novo Fluxo",
};

export default function AutomationsPage() {
  const [activeTab, setActiveTab] = useState("rules");

  return (
    <AppLayout
      title="Automações"
      subtitle="Regras, sequências e bots"
      actions={
        <Button 
          size="sm" 
          onClick={() => toast.success(`${tabLabels[activeTab]} criada com sucesso! (Demonstração)`)}
          className="text-xs gap-1 bg-primary hover:bg-primary-hover text-primary-foreground"
        >
          <Plus className="h-3 w-3" /> {tabLabels[activeTab]}
        </Button>
      }
    >
      <div className="p-6 animate-fade-in">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="rules" className="text-xs gap-1.5">
              <Zap className="h-3 w-3" /> Regras e Automações
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
          <TabsContent value="sequences"><SequencesTab /></TabsContent>
          <TabsContent value="bots"><BotsTab /></TabsContent>
          <TabsContent value="complex"><ComplexTab /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
