import { useState } from "react";
import {
  MessageSquare, FileText, Mic, Paperclip, Settings,
  Plus, ChevronDown, ChevronRight, Clock, MoreHorizontal,
  Copy, Trash2, Edit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type StepType = "text" | "audio" | "file";

interface SequenceStep {
  id: string;
  type: StepType;
  content: string;
  delay?: string;
}

interface Sequence {
  id: string;
  name: string;
  channel: "whatsapp" | "email";
  active: boolean;
  steps: SequenceStep[];
}

const mockSequences: Sequence[] = [
  {
    id: "seq1",
    name: "Boas-vindas WhatsApp",
    channel: "whatsapp",
    active: true,
    steps: [
      { id: "s1", type: "text", content: "Olá! Obrigado pelo interesse. Como posso ajudar?", delay: "Imediato" },
      { id: "s2", type: "audio", content: "audio_apresentacao.ogg", delay: "2 min" },
      { id: "s3", type: "file", content: "catalogo_2024.pdf", delay: "5 min" },
    ],
  },
  {
    id: "seq2",
    name: "Follow-up pós-proposta",
    channel: "email",
    active: true,
    steps: [
      { id: "s4", type: "text", content: "Oi! Vimos que você recebeu nossa proposta. Tem alguma dúvida?", delay: "24h" },
      { id: "s5", type: "text", content: "Gostaríamos de agendar uma reunião para esclarecer pontos.", delay: "48h" },
      { id: "s6", type: "file", content: "case_sucesso.pdf", delay: "72h" },
      { id: "s7", type: "text", content: "Última chance! Condições especiais válidas até sexta.", delay: "5 dias" },
      { id: "s8", type: "audio", content: "depoimento_cliente.ogg", delay: "6 dias" },
    ],
  },
  {
    id: "seq3",
    name: "Reengajamento 7 dias",
    channel: "whatsapp",
    active: false,
    steps: [
      { id: "s9", type: "text", content: "Olá! Faz um tempo que não conversamos. Tudo bem?", delay: "7 dias" },
      { id: "s10", type: "text", content: "Temos novidades que podem te interessar!", delay: "8 dias" },
      { id: "s11", type: "file", content: "novidades_q1.pdf", delay: "9 dias" },
      { id: "s12", type: "audio", content: "audio_oferta.ogg", delay: "10 dias" },
    ],
  },
];

const stepTypeConfig: Record<StepType, { icon: typeof MessageSquare; label: string; color: string }> = {
  text: { icon: FileText, label: "Texto", color: "text-primary" },
  audio: { icon: Mic, label: "Áudio", color: "text-accent" },
  file: { icon: Paperclip, label: "Arquivo", color: "text-success" },
};

export function SequencesTab() {
  const [expandedId, setExpandedId] = useState<string | null>("seq1");

  return (
    <div className="space-y-3">
      {mockSequences.map((seq) => {
        const isExpanded = expandedId === seq.id;
        return (
          <div key={seq.id} className="bg-card ghost-border rounded-xl overflow-hidden hover:border-border-hover transition-colors">
            {/* Header */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : seq.id)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
            >
              <div className="h-9 w-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                <MessageSquare className="h-4 w-4 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-foreground">{seq.name}</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {seq.steps.length} etapas · {seq.channel === "whatsapp" ? "WhatsApp" : "E-mail"}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {/* Step type pills */}
                <div className="hidden sm:flex items-center gap-1">
                  {(["text", "audio", "file"] as StepType[]).map((type) => {
                    const count = seq.steps.filter((s) => s.type === type).length;
                    if (count === 0) return null;
                    const cfg = stepTypeConfig[type];
                    const Icon = cfg.icon;
                    return (
                      <Badge key={type} variant="outline" className="text-[10px] gap-1 px-1.5">
                        <Icon className={`h-2.5 w-2.5 ${cfg.color}`} />
                        {count}
                      </Badge>
                    );
                  })}
                </div>
                <Switch checked={seq.active} onClick={(e) => e.stopPropagation()} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem className="text-xs gap-2"><Edit className="h-3 w-3" /> Editar</DropdownMenuItem>
                    <DropdownMenuItem className="text-xs gap-2"><Copy className="h-3 w-3" /> Duplicar</DropdownMenuItem>
                    <DropdownMenuItem className="text-xs gap-2 text-destructive"><Trash2 className="h-3 w-3" /> Excluir</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {/* Steps */}
            {isExpanded && (
              <div className="ghost-border border-t px-4 py-3 space-y-0">
                {seq.steps.map((step, i) => {
                  const cfg = stepTypeConfig[step.type];
                  const Icon = cfg.icon;
                  return (
                    <div key={step.id} className="flex items-start gap-3 relative">
                      {/* Timeline connector */}
                      <div className="flex flex-col items-center shrink-0 pt-1">
                        <div className={`h-6 w-6 rounded-full border-2 border-border bg-card flex items-center justify-center z-10`}>
                          <Icon className={`h-3 w-3 ${cfg.color}`} />
                        </div>
                        {i < seq.steps.length - 1 && (
                          <div className="w-px h-8 bg-border" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pb-3">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>
                            {cfg.label}
                          </Badge>
                          {step.delay && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" /> {step.delay}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-foreground truncate">{step.content}</p>
                      </div>
                    </div>
                  );
                })}
                {/* Add step button */}
                <div className="flex items-center gap-3 pt-1">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="h-6 w-6 rounded-full border-2 border-dashed border-border bg-card flex items-center justify-center">
                      <Plus className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7 px-2 gap-1">
                    <Plus className="h-3 w-3" /> Adicionar etapa
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
