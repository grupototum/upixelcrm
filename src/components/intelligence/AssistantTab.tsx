import { Brain, Sparkles, Send, Lightbulb, MessageSquare, TrendingUp, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const quickSuggestions = [
  { icon: MessageSquare, label: "Sugerir resposta para objeção de preço", category: "Comercial" },
  { icon: TrendingUp, label: "Como melhorar taxa de conversão?", category: "Estratégia" },
  { icon: HelpCircle, label: "Como configurar automações no pipeline?", category: "Sistema" },
  { icon: Lightbulb, label: "Dicas para follow-up eficiente", category: "Comercial" },
];

const systemTips = [
  "Use tags para segmentar leads e disparar automações automáticas.",
  "Configure cadências de tarefas nas colunas do pipeline para nunca perder um follow-up.",
  "Importe leads via CSV e defina o pipeline/etapa inicial automaticamente.",
];

export function AssistantTab() {
  const [query, setQuery] = useState("");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Chat principal */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-card border border-border rounded-lg p-4 min-h-[420px] flex flex-col">
          <div className="flex-1 space-y-4 mb-4 overflow-auto">
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                <Brain className="h-4 w-4 text-accent" />
              </div>
              <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3 max-w-[80%]">
                <p className="text-sm text-foreground">
                  Olá! Sou o assistente uPixel. Posso ajudar com sugestões de resposta, orientações sobre o sistema ou estratégias de vendas. Como posso ajudar?
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {quickSuggestions.slice(0, 3).map((s) => (
              <button
                key={s.label}
                onClick={() => setQuery(s.label)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-xs text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors"
              >
                <s.icon className="h-3 w-3" />
                <span className="truncate max-w-[180px]">{s.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              className="flex-1 bg-secondary rounded-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
              placeholder="Pergunte algo..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && query.trim() && setQuery("")}
            />
            <Button
              size="icon"
              className="h-9 w-9 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
              disabled={!query.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Painel lateral */}
      <div className="space-y-4">
        {/* Sugestões rápidas */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">Sugestões Rápidas</h3>
          </div>
          <div className="space-y-2">
            {quickSuggestions.map((s) => (
              <button
                key={s.label}
                onClick={() => setQuery(s.label)}
                className="w-full flex items-start gap-3 p-2.5 rounded-lg hover:bg-secondary transition-colors text-left group"
              >
                <s.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0 group-hover:text-primary" />
                <div>
                  <p className="text-xs font-medium text-foreground">{s.label}</p>
                  <p className="text-[10px] text-muted-foreground">{s.category}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Dicas do sistema */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Dicas do Sistema</h3>
          </div>
          <div className="space-y-2">
            {systemTips.map((tip, i) => (
              <div key={i} className="flex gap-2 p-2 rounded-lg bg-secondary/50">
                <span className="text-xs font-bold text-primary shrink-0">{i + 1}.</span>
                <p className="text-xs text-muted-foreground">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
