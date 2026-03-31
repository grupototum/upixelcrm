import { useState, useEffect, useRef } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useCannedResponses, CannedResponse } from "@/hooks/useCannedResponses";

interface CannedResponsePickerProps {
  onSelect: (content: string) => void;
  onClose: () => void;
  searchQuery: string;
}

export function CannedResponsePicker({ onSelect, onClose, searchQuery }: CannedResponsePickerProps) {
  const { search } = useCannedResponses();
  const [results, setResults] = useState<CannedResponse[]>([]);
  
  useEffect(() => {
    setResults(search(searchQuery));
  }, [searchQuery, search]);

  return (
    <div className="absolute bottom-full left-0 mb-2 w-72 z-50 bg-popover rounded-md shadow-lg border border-border animate-in fade-in slide-in-from-bottom-2">
      <Command className="rounded-lg shadow-md">
        <CommandInput 
          placeholder="Pesquisar resposta rápida..." 
          className="h-8 text-xs" 
          value={searchQuery}
          autoFocus
        />
        <CommandList className="max-h-[200px]">
          <CommandEmpty className="py-2 px-4 text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Nenhuma resposta encontrada
          </CommandEmpty>
          <CommandGroup heading="Respostas Rápidas" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            {results.map((item) => (
              <CommandItem
                key={item.id}
                value={item.short_code}
                onSelect={() => onSelect(item.content)}
                className="flex flex-col items-start gap-0.5 py-2 px-3 data-[selected=true]:bg-accent text-foreground cursor-pointer"
              >
                <div className="flex items-center gap-1.5 w-full">
                  <span className="font-bold text-primary">/{item.short_code}</span>
                  <span className="text-[11px] font-semibold truncate opacity-80">{item.title}</span>
                </div>
                <p className="text-[10px] text-muted-foreground line-clamp-1 w-full italic">
                  {item.content}
                </p>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}
