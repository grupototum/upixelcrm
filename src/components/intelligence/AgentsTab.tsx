import { Bot, Plus, Settings, Zap, MessageSquare, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComingSoonOverlay, ComingSoonBadge } from "@/components/ui/coming-soon";

const agents = [
  {
    name: "Qualificador",
    description: "Qualifica leads automaticamente com perguntas estratégicas",
    icon: Zap,
    status: "Inativo",
    model: "GPT-4o",
  },
  {
    name: "Suporte",
    description: "Responde dúvidas frequentes com base na base de conhecimento",
    icon: ShieldCheck,
    status: "Inativo",
    model: "GPT-4o mini",
  },
  {
    name: "Vendas",
    description: "Conduz conversas comerciais e agenda reuniões",
    icon: MessageSquare,
    status: "Inativo",
    model: "GPT-4o",
  },
];

export function AgentsTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Configure agentes de IA especializados para automatizar interações.
        </p>
        <Button size="sm" disabled className="gap-2">
          <Plus className="h-4 w-4" /> Novo Agente <ComingSoonBadge />
        </Button>
      </div>

      <ComingSoonOverlay label="Agentes IA">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <div key={agent.name} className="bg-card ghost-border rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <agent.icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                  {agent.status}
                </span>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">{agent.name}</h4>
                <p className="text-xs text-muted-foreground mt-1">{agent.description}</p>
              </div>
              <div className="flex items-center justify-between pt-2 ghost-border border-t">
                <span className="text-[10px] text-muted-foreground">Modelo: {agent.model}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled>
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ComingSoonOverlay>
    </div>
  );
}
