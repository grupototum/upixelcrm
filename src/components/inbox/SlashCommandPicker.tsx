import { useMemo } from "react";
import {
  Command, CommandEmpty, CommandGroup, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { MessageSquareReply, FileBadge, Zap } from "lucide-react";
import { useCannedResponses } from "@/hooks/useCannedResponses";
import { useAppState } from "@/contexts/AppContext";
import * as broadcastRepo from "@/services/broadcast";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";

interface SlashCommandPickerProps {
  /** Recebe o conteúdo a inserir no input. */
  onSelect: (content: string) => void;
  /** Recebe info quando uma automação é selecionada — host decide o que fazer. */
  onAutomationSelect?: (automation: { id: string; name: string; type: "basic" | "complex" }) => void;
  onClose: () => void;
  /** Texto após o "/" digitado pelo usuário, usado pra filtrar. */
  searchQuery: string;
}

interface WaTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  status: string;
}

export function SlashCommandPicker({
  onSelect,
  onAutomationSelect,
  onClose,
  searchQuery,
}: SlashCommandPickerProps) {
  const { responses } = useCannedResponses();
  const { automations, complexAutomations } = useAppState();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const clientId = tenant?.id ?? user?.client_id;

  const { data: waTemplates = [] } = useQuery({
    queryKey: ["slash-wa-templates", clientId],
    queryFn: async (): Promise<WaTemplate[]> => {
      if (!clientId) return [];
      return broadcastRepo.listApprovedWhatsAppTemplates(clientId);
    },
    enabled: !!clientId,
    staleTime: 60_000,
  });

  const q = searchQuery.toLowerCase().trim();

  const filteredCanned = useMemo(() => {
    const base = responses.filter((r) => r.short_code);
    if (!q) return base.slice(0, 8);
    return base
      .filter(
        (r) =>
          (r.short_code ?? "").toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.content.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [responses, q]);

  const filteredTemplates = useMemo(() => {
    if (!q) return waTemplates.slice(0, 5);
    return waTemplates
      .filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.content ?? "").toLowerCase().includes(q),
      )
      .slice(0, 5);
  }, [waTemplates, q]);

  const filteredAutomations = useMemo(() => {
    const basic = (automations ?? []).map((a: any) => ({ id: a.id, name: a.name, type: "basic" as const }));
    const complex = (complexAutomations ?? []).map((a: any) => ({ id: a.id, name: a.name, type: "complex" as const }));
    const all = [...basic, ...complex];
    if (!q) return all.slice(0, 5);
    return all.filter((a) => a.name.toLowerCase().includes(q)).slice(0, 5);
  }, [automations, complexAutomations, q]);

  const empty =
    filteredCanned.length === 0 &&
    filteredTemplates.length === 0 &&
    filteredAutomations.length === 0;

  return (
    <div className="absolute bottom-full left-0 mb-2 w-80 z-50 bg-popover rounded-md shadow-lg border border-border animate-in fade-in slide-in-from-bottom-2">
      <Command className="rounded-lg shadow-md" shouldFilter={false}>
        <CommandList className="max-h-[280px]">
          {empty && (
            <CommandEmpty className="py-3 px-4 text-xs text-muted-foreground">
              Nada encontrado para "{searchQuery}".
            </CommandEmpty>
          )}

          {filteredCanned.length > 0 && (
            <CommandGroup
              heading={
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <MessageSquareReply className="h-3 w-3" /> Mensagens Salvas
                </span>
              }
            >
              {filteredCanned.map((item) => (
                <CommandItem
                  key={`canned-${item.id}`}
                  value={`canned-${item.id}`}
                  onSelect={() => { onSelect(item.content); onClose(); }}
                  className="flex flex-col items-start gap-0.5 py-2 px-3 cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 w-full">
                    <span className="font-bold text-primary text-xs">/{item.short_code}</span>
                    <span className="text-[11px] font-semibold truncate opacity-80">{item.title}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-1 w-full italic">
                    {item.content}
                  </p>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {filteredTemplates.length > 0 && (
            <>
              {filteredCanned.length > 0 && <CommandSeparator />}
              <CommandGroup
                heading={
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <FileBadge className="h-3 w-3" /> Templates Meta (HSM)
                  </span>
                }
              >
                {filteredTemplates.map((t) => (
                  <CommandItem
                    key={`tmpl-${t.id}`}
                    value={`tmpl-${t.id}`}
                    onSelect={() => { onSelect(t.content ?? ""); onClose(); }}
                    className="flex flex-col items-start gap-0.5 py-2 px-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 w-full">
                      <span className="font-bold text-emerald-600 text-xs">{t.name}</span>
                      <span className="text-[9px] uppercase font-semibold bg-emerald-500/10 text-emerald-700 px-1.5 py-0.5 rounded">
                        {t.category}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-1 w-full italic">
                      {t.content?.slice(0, 90)}
                    </p>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {filteredAutomations.length > 0 && (
            <>
              {(filteredCanned.length > 0 || filteredTemplates.length > 0) && <CommandSeparator />}
              <CommandGroup
                heading={
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <Zap className="h-3 w-3" /> Robôs & Automações
                  </span>
                }
              >
                {filteredAutomations.map((a) => (
                  <CommandItem
                    key={`auto-${a.type}-${a.id}`}
                    value={`auto-${a.type}-${a.id}`}
                    onSelect={() => {
                      onAutomationSelect?.(a);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 py-2 px-3 cursor-pointer"
                  >
                    <Zap className="h-3 w-3 text-warning shrink-0" />
                    <span className="text-xs font-semibold flex-1 truncate">{a.name}</span>
                    <span className="text-[9px] uppercase font-semibold bg-warning/10 text-warning px-1.5 py-0.5 rounded">
                      {a.type === "complex" ? "Fluxo" : "Robô"}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </Command>
    </div>
  );
}
