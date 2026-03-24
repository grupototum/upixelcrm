import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { mockAutomations, mockColumns } from "@/lib/mock-data";
import { Plus, Zap, Play, Pause, Settings, ChevronRight, AlertTriangle, Target, Cog, Bot, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComingSoonBadge } from "@/components/ui/coming-soon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const triggerLabels: Record<string, string> = {
  card_entered: "Entrada no card",
  time_in_column: "Tempo na coluna",
  stage_changed: "Mudança de estágio",
};

const actionLabels: Record<string, string> = {
  add_tag: "Adicionar tag",
  remove_tag: "Remover tag",
  move_column: "Mover de coluna",
  create_task: "Criar tarefa",
  send_message: "Enviar mensagem",
  send_template: "Enviar template",
  add_ai_agent: "Adicionar agente IA",
};

export default function AutomationsPage() {
  return (
    <AppLayout
      title="Automações"
      subtitle="Regras, sequências e bots"
      actions={<Button size="sm" className="text-xs gap-1 bg-primary hover:bg-primary-hover text-primary-foreground"><Plus className="h-3 w-3" /> Nova Automação</Button>}
    >
      <div className="p-6 animate-fade-in">
        <Tabs defaultValue="rules" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="rules" className="text-xs">Regras e Automações</TabsTrigger>
            <TabsTrigger value="sequences" className="text-xs">Mensagens e Sequências</TabsTrigger>
            <TabsTrigger value="bots" className="text-xs">Bots <ComingSoonBadge /></TabsTrigger>
            <TabsTrigger value="complex" className="text-xs">Automações Complexas <ComingSoonBadge /></TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="space-y-4">
            {mockAutomations.map((auto) => {
              const col = mockColumns.find((c) => c.id === auto.column_id);
              return (
                <div key={auto.id} className="bg-card border border-border rounded-lg p-5 hover:border-border-hover transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${auto.active ? "bg-primary/10" : "bg-secondary"}`}>
                        <Zap className={`h-4 w-4 ${auto.active ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{auto.name}</h3>
                        {auto.description && <p className="text-xs text-muted-foreground">{auto.description}</p>}
                        {col && <p className="text-[10px] text-muted-foreground mt-0.5">Coluna: {col.name}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${auto.active ? "bg-primary" : "bg-muted"}`}>
                        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-primary-foreground transition-transform ${auto.active ? "translate-x-4" : "translate-x-1"}`} />
                      </button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"><Settings className="h-4 w-4" /></Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {/* Trigger */}
                    <div className="rounded-md border border-success/30 bg-success/5 p-3">
                      <p className="text-[10px] font-semibold text-success uppercase tracking-wide mb-1.5 flex items-center gap-1"><Target className="h-3 w-3" /> Gatilho</p>
                      <p className="text-xs text-foreground">{triggerLabels[auto.trigger.type]}</p>
                    </div>
                    {/* Actions */}
                    <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                      <p className="text-[10px] font-semibold text-primary uppercase tracking-wide mb-1.5 flex items-center gap-1"><Cog className="h-3 w-3" /> Ações</p>
                      <div className="space-y-1">
                        {auto.actions.map((a, i) => (
                          <p key={i} className="text-xs text-foreground flex items-center gap-1">
                            {actionLabels[a.type]} {a.comingSoon && <ComingSoonBadge />}
                          </p>
                        ))}
                      </div>
                    </div>
                    {/* Exceptions */}
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                      <p className="text-[10px] font-semibold text-destructive uppercase tracking-wide mb-1.5 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Exceções</p>
                      {auto.exceptions.length > 0 ? (
                        auto.exceptions.map((e, i) => <p key={i} className="text-xs text-foreground">Tag: {(e.config as any)?.tag}</p>)
                      ) : (
                        <p className="text-xs text-muted-foreground">Nenhuma</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="sequences">
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-foreground mb-1">Mensagens e Sequências</h3>
              <p className="text-xs text-muted-foreground">Crie blocos reutilizáveis de mensagem para usar nas automações.</p>
              <Button size="sm" className="mt-4 text-xs gap-1 bg-primary hover:bg-primary-hover text-primary-foreground"><Plus className="h-3 w-3" /> Nova Sequência</Button>
            </div>
          </TabsContent>

          <TabsContent value="bots">
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <Bot className="h-12 w-12 text-accent mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-foreground mb-1">Bots com Typebot</h3>
              <p className="text-xs text-muted-foreground mb-2">Crie chatbots visuais poderosos para qualificar e atender leads automaticamente.</p>
              <ComingSoonBadge />
            </div>
          </TabsContent>

          <TabsContent value="complex">
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <Cog className="h-12 w-12 text-accent mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-foreground mb-1">Automações Complexas</h3>
              <p className="text-xs text-muted-foreground mb-2">Canvas visual com nodes e conexões para fluxos avançados estilo n8n.</p>
              <ComingSoonBadge />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
