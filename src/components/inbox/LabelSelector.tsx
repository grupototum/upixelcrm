import { useState } from "react";
import { X, Plus, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useConversationLabels, ConversationLabel } from "@/hooks/useConversationLabels";

interface LabelSelectorProps {
  leadId: string;
  selectedLabels: { id: string; name: string; color: string }[];
  onLabelsChange: () => void;
  onUpdateLabels: (leadId: string, labels: { id: string; name: string; color: string }[]) => Promise<void>;
}

export function LabelSelector({ leadId, selectedLabels, onLabelsChange, onUpdateLabels }: LabelSelectorProps) {
  const { labels } = useConversationLabels();
  const [open, setOpen] = useState(false);

  const toggleLabel = async (label: ConversationLabel) => {
    const isSelected = selectedLabels.some((l) => l.id === label.id);
    let newLabels;
    if (isSelected) {
      newLabels = selectedLabels.filter((l) => l.id !== label.id);
    } else {
      newLabels = [...selectedLabels, { id: label.id, name: label.name, color: label.color }];
    }
    
    await onUpdateLabels(leadId, newLabels);
    onLabelsChange();
  };

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {selectedLabels.map((label) => (
        <Badge
          key={label.id}
          style={{ backgroundColor: label.color, color: "white" }}
          className="text-[10px] px-1.5 py-0 h-4 border-none flex items-center gap-1 group"
        >
          {label.name}
          <button
            onClick={() => toggleLabel(label as any)}
            className="hover:bg-black/10 rounded-full p-0.5"
          >
            <X className="h-2 w-2" />
          </button>
        </Badge>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-4 w-4 rounded-full border-dashed"
          >
            <Plus className="h-2 w-2 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Etiquetas
          </p>
          <div className="space-y-1">
            {labels.map((label) => {
              const isSelected = selectedLabels.some((l) => l.id === label.id);
              return (
                <button
                  key={label.id}
                  onClick={() => toggleLabel(label)}
                  className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between hover:bg-secondary transition-colors text-xs`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    {label.name}
                  </div>
                  {isSelected && <Check className="h-3 w-3 text-primary" />}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
