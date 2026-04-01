import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Clock, ShieldCheck, Cog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function ImplementationChecklist() {
  const [isOpen, setIsOpen] = useState(false);

  const items = [
    { label: "Configurar Evolution API no Upixel", completed: true },
    { label: "Conectar WhatsApp Cloud API direto na Meta", completed: true },
    { label: "Criar visualização de templates de Utility", completed: false },
    { label: "Configurar recebimento de webhooks para tracking", completed: false },
    { label: "Definir e aplicar limites por cliente na UI", completed: false },
  ];

  return (
    <div className="bg-card/50 backdrop-blur-sm border border-border/40 rounded-xl overflow-hidden shadow-sm">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status de Implementação (Admin)</span>
            </div>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4 space-y-2 animate-accordion-down">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between py-1.5 border-b border-border/10 last:border-0">
              <div className="flex items-center gap-2">
                {item.completed ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                ) : (
                  <Clock className="h-3.5 w-3.5 text-muted-foreground/50" />
                )}
                <span className={`text-[11px] ${item.completed ? "text-foreground/80" : "text-muted-foreground italic"}`}>
                  {item.label}
                </span>
              </div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${item.completed ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                {item.completed ? "Concluído" : "Pendente"}
              </span>
            </div>
          ))}
          <div className="pt-2 flex justify-end">
            <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 opacity-50">
              <Cog className="h-3 w-3" /> Abrir Logs
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
