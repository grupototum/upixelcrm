import { AppLayout } from "@/components/layout/AppLayout";
import { Brain, Bot, BookOpen, Sparkles, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComingSoonBadge, ComingSoonOverlay } from "@/components/ui/coming-soon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

export default function IntelligencePage() {
  const [query, setQuery] = useState("");

  return (
    <AppLayout title="Central de Inteligência" subtitle="IA a serviço da operação">
      <div className="p-6 animate-fade-in">
        <Tabs defaultValue="assistant" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="assistant" className="text-xs">Assistente Operacional</TabsTrigger>
            <TabsTrigger value="agents" className="text-xs">Agentes IA <ComingSoonBadge /></TabsTrigger>
            <TabsTrigger value="knowledge" className="text-xs">Base de Conhecimento <ComingSoonBadge /></TabsTrigger>
          </TabsList>

          <TabsContent value="assistant">
            <div className="max-w-2xl mx-auto">
              <div className="bg-card border border-border rounded-lg p-6 text-center mb-6">
                <Sparkles className="h-10 w-10 text-accent mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-foreground mb-1">Assistente uPixel</h3>
                <p className="text-sm text-muted-foreground">Pergunte sobre leads, objeções, configurações ou peça sugestões de resposta.</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 min-h-[300px] flex flex-col">
                <div className="flex-1 space-y-4 mb-4">
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0"><Brain className="h-4 w-4 text-accent" /></div>
                    <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3 max-w-[80%]">
                      <p className="text-sm text-foreground">Olá! Sou o assistente uPixel. Posso ajudar com sugestões de resposta, orientações sobre o sistema ou estratégias de vendas. Como posso ajudar?</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 bg-secondary rounded-full px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Pergunte algo..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <Button size="icon" className="h-9 w-9 rounded-full bg-primary hover:bg-primary-hover text-primary-foreground shrink-0">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="agents">
            <ComingSoonOverlay label="Agentes IA">
              <div className="grid grid-cols-3 gap-4">
                {["Qualificador", "Suporte", "Vendas"].map((name) => (
                  <div key={name} className="bg-card border border-border rounded-lg p-5">
                    <Bot className="h-8 w-8 text-primary mb-3" />
                    <h4 className="text-sm font-semibold text-foreground">{name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">Agente especializado em {name.toLowerCase()}</p>
                  </div>
                ))}
              </div>
            </ComingSoonOverlay>
          </TabsContent>

          <TabsContent value="knowledge">
            <ComingSoonOverlay label="Base de Conhecimento">
              <div className="bg-card border border-border rounded-lg p-8 text-center">
                <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-foreground">Upload de documentos e fontes de conhecimento</h3>
              </div>
            </ComingSoonOverlay>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
