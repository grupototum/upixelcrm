import { AppLayout } from "@/components/layout/AppLayout";
import { Brain, Bot, BookOpen } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssistantTab } from "@/components/intelligence/AssistantTab";
import { AgentsTab } from "@/components/intelligence/AgentsTab";
import { KnowledgeBaseTab } from "@/components/intelligence/KnowledgeBaseTab";

export default function IntelligencePage() {
  return (
    <AppLayout title="Central de Inteligência" subtitle="IA a serviço da operação">
      <div className="p-6 animate-fade-in">
        <Tabs defaultValue="assistant" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="assistant" className="text-xs gap-1.5">
              <Brain className="h-3.5 w-3.5" /> Assistente Operacional
            </TabsTrigger>
            <TabsTrigger value="agents" className="text-xs gap-1.5">
              <Bot className="h-3.5 w-3.5" /> Agentes IA
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="text-xs gap-1.5">
              <BookOpen className="h-3.5 w-3.5" /> Base de Conhecimento
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assistant">
            <AssistantTab />
          </TabsContent>

          <TabsContent value="agents">
            <AgentsTab />
          </TabsContent>

          <TabsContent value="knowledge">
            <KnowledgeBaseTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
