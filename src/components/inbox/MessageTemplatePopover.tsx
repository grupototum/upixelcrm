import { useState } from "react";
import { FileText, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

const TEMPLATES = [
  { id: "1", title: "Boas-vindas", body: "Olá! Obrigado por entrar em contato. Estamos aqui para ajudá-lo. O que posso fazer por você hoje?" },
  { id: "2", title: "Follow-up", body: "Olá! Gostaria de saber se teve a oportunidade de avaliar nossa proposta. Fico à disposição para qualquer dúvida!" },
  { id: "3", title: "Agradecimento", body: "Muito obrigado pela sua confiança! Estamos felizes em tê-lo como cliente. Qualquer necessidade, estamos aqui." },
  { id: "4", title: "Reagendamento", body: "Olá! Vi que não conseguimos conversar conforme combinado. Gostaria de reagendar para um horário mais conveniente?" },
  { id: "5", title: "Proposta", body: "Segue em anexo a proposta detalhada conforme conversamos. Fico no aguardo do seu retorno!" },
  { id: "6", title: "Encerramento", body: "Se houver mais alguma dúvida, estou à disposição. Desejo um ótimo dia!" },
];

interface MessageTemplatePopoverProps {
  onSelect: (body: string) => void;
}

export function MessageTemplatePopover({ onSelect }: MessageTemplatePopoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground shrink-0" title="Templates de mensagem">
          <FileText className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-72 p-0 max-h-64 overflow-auto">
        <div className="p-2 border-b border-border">
          <p className="text-xs font-semibold">Modelos rápidos</p>
        </div>
        <div className="divide-y divide-border">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              className="w-full text-left px-3 py-2.5 hover:bg-secondary transition-colors"
              onClick={() => { onSelect(t.body); setOpen(false); }}
            >
              <p className="text-xs font-medium text-foreground mb-0.5">{t.title}</p>
              <p className="text-[10px] text-muted-foreground line-clamp-2">{t.body}</p>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
