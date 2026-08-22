import { useState, FormEvent } from "react";
import { useLocation } from "react-router-dom";
import { useAppState } from "@/contexts/AppContext";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Plus, Zap, MessageSquare, Bot, Workflow, Clock, Instagram,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComingSoonBadge } from "@/components/ui/coming-soon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RulesTab } from "@/components/automations/RulesTab";
import { SequencesTab } from "@/components/automations/SequencesTab";
import { BotsTab } from "@/components/automations/BotsTab";
import { ComplexTab } from "@/components/automations/ComplexTab";
import { TimeActionsTab } from "@/components/automations/TimeActionsTab";
import { InstagramFunnelsTab } from "@/components/automations/InstagramFunnelsTab";
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

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const supportedTabs = ["rules", "time_actions"];
  const canCreateHere = supportedTabs.includes(activeTab);

  const handleCreate = () => {
    if (!canCreateHere) {
      toast.info(`Criação de "${tabLabels[activeTab]}" ainda não está disponível por aqui.`);
      return;
    }
    setNewName("");
    setCreateOpen(true);
  };

  const handleConfirmCreate = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      toast.error("Informe um nome para a automação.");
      return;
    }
    setCreating(true);
    try {
      if (activeTab === "rules") {
        await addBasicAutomation({
          name: trimmed,
          trigger: { type: "card_entered" },
          actions: [{ type: "add_tag", config: { tag: "novo" } }],
        });
      } else if (activeTab === "time_actions") {
        await addBasicAutomation({
          name: trimmed,
          trigger: {
            type: "time_in_column",
            config: {
              hours: 24,
              ...(((location.state as any)?.lead_id) ? { target_lead_ids: [(location.state as any).lead_id] } : {}),
            },
          },
          actions: [{ type: "send_message", config: { text: "Olá! Como podemos ajudar?" } }],
        });
      }
      setCreateOpen(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppLayout
      title="Automações"
      subtitle="Regras, sequências e bots"
      actions={
        canCreateHere ? (
          <Button
            size="sm"
            onClick={handleCreate}
            className="text-xs gap-1 bg-primary hover:bg-[#e04400] text-primary-foreground"
          >
            <Plus className="h-3 w-3" /> {tabLabels[activeTab]}
          </Button>
        ) : null
      }
    >
      <div className="p-6 animate-fade-in">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
              <Bot className="h-3 w-3" /> Bots
            </TabsTrigger>
            <TabsTrigger value="instagram" className="text-xs gap-1.5">
              <Instagram className="h-3 w-3" /> Funis Instagram
            </TabsTrigger>
            <TabsTrigger value="complex" className="text-xs gap-1.5">
              <Workflow className="h-3 w-3" /> Automações Complexas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rules"><RulesTab /></TabsContent>
          <TabsContent value="time_actions"><TimeActionsTab /></TabsContent>
          <TabsContent value="sequences"><SequencesTab /></TabsContent>
          <TabsContent value="bots"><BotsTab /></TabsContent>
          <TabsContent value="instagram"><InstagramFunnelsTab /></TabsContent>
          <TabsContent value="complex"><ComplexTab /></TabsContent>
        </Tabs>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleConfirmCreate}>
            <DialogHeader>
              <DialogTitle>{tabLabels[activeTab] ?? "Nova automação"}</DialogTitle>
              <DialogDescription>
                Dê um nome agora. Você pode configurar o gatilho e as ações depois pelo card.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <Label htmlFor="new-automation-name" className="text-xs uppercase tracking-wider text-muted-foreground">Nome</Label>
              <Input
                id="new-automation-name"
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Boas-vindas para novos leads"
                maxLength={80}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)} disabled={creating}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creating || !newName.trim()}>
                {creating ? "Criando..." : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
