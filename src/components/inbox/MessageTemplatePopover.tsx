import { useState } from "react";
import { FileText, Settings, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { useCannedResponses } from "@/hooks/useCannedResponses";
import { TemplatesManagerModal } from "./TemplatesManagerModal";

interface MessageTemplatePopoverProps {
  onSelect: (body: string) => void;
}

export function MessageTemplatePopover({ onSelect }: MessageTemplatePopoverProps) {
  const [open, setOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const { responses, loading } = useCannedResponses();

  const templates = responses.filter((r) => r.category === "template");

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground shrink-0"
            title="Templates de mensagem"
          >
            <FileText className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" side="top" className="w-80 p-0 max-h-80 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-border flex items-center justify-between">
            <p className="text-xs font-semibold">Modelos de mensagem</p>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] gap-1"
              onClick={() => {
                setOpen(false);
                setManagerOpen(true);
              }}
            >
              <Settings className="h-3 w-3" /> Gerenciar
            </Button>
          </div>

          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : templates.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-[11px] text-muted-foreground mb-3">
                  Nenhum template cadastrado.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[11px] gap-1.5 h-7"
                  onClick={() => {
                    setOpen(false);
                    setManagerOpen(true);
                  }}
                >
                  <Plus className="h-3 w-3" />
                  Criar primeiro template
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    className="w-full text-left px-3 py-2.5 hover:bg-secondary transition-colors"
                    onClick={() => {
                      onSelect(t.content);
                      setOpen(false);
                    }}
                  >
                    <p className="text-xs font-medium text-foreground mb-0.5">{t.title}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">{t.content}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <TemplatesManagerModal open={managerOpen} onOpenChange={setManagerOpen} />
    </>
  );
}
