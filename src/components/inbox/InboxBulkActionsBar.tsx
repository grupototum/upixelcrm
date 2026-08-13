import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckSquare, UserPlus, Tag, MailOpen, Mail, X, Loader2, Check, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSelection } from "@/contexts/SelectionContext";
import { useAuth } from "@/contexts/AuthContext";
import { useConversationLabels } from "@/hooks/useConversationLabels";
import { listActiveAgents } from "@/services/users";
import { markConversationsRead, markConversationsUnread } from "@/services/inbox";
import { toast } from "sonner";
import type { LeadConversation } from "@/hooks/useInbox";

function addHours(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface InboxBulkActionsBarProps {
  conversations: LeadConversation[];
  updateStatus: (leadId: string, status: string) => Promise<void>;
  snoozeConversation: (leadId: string, until: Date) => Promise<void>;
  assignToAgent: (leadId: string, agentId: string | null) => Promise<void>;
  updateLabels: (leadId: string, labels: { id: string; name: string; color: string }[]) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Toolbar de ações em massa do Inbox — mesmo padrão visual/estrutural da
 * BulkActionsBar do CRM (src/components/crm/BulkActionsBar.tsx), reusando
 * as funções já existentes do useInbox (que já operam por leadId, iterando
 * as source_conversations internamente) para não duplicar lógica de status/
 * snooze/assign/labels. Só "marcar lida/não lida" precisou de uma função
 * nova (services/inbox.ts) — as demais ações já existiam por conversa e
 * este componente só as chama em loop pelas conversas selecionadas.
 */
export function InboxBulkActionsBar({
  conversations, updateStatus, snoozeConversation, assignToAgent, updateLabels, refresh,
}: InboxBulkActionsBarProps) {
  const { selectionMode, selectedIds, selectedCount, clearSelection, exitSelectionMode } = useSelection();
  const { user } = useAuth();
  const clientId = user?.client_id ?? "";
  const { labels } = useConversationLabels();

  const [busy, setBusy] = useState(false);
  const [snoozeCustom, setSnoozeCustom] = useState(() => toLocalInputValue(addHours(24)));

  const { data: agents = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["inbox-agents", clientId],
    queryFn: () => (clientId ? listActiveAgents(clientId).catch(() => []) : Promise.resolve([])),
    enabled: !!clientId,
    staleTime: 60_000,
  });

  if (!selectionMode || selectedCount === 0) return null;

  const leadIds = Array.from(selectedIds);
  const selectedLeads = conversations.filter((c) => leadIds.includes(c.lead_id));
  // Todas as conversation ids dos leads selecionados (um lead pode ter mais de 1 canal).
  const conversationIds = selectedLeads.flatMap((c) => c.source_conversations.map((sc) => sc.id));

  const runBulk = async (label: string, fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      toast.success(label);
      clearSelection();
      exitSelectionMode();
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro na ação em massa.";
      toast.error(`Falha: ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  const handleMarkRead = () =>
    runBulk(`${leadIds.length} conversa(s) marcada(s) como lida(s).`, () => markConversationsRead(conversationIds));

  const handleMarkUnread = () =>
    runBulk(`${leadIds.length} conversa(s) marcada(s) como não lida(s).`, () => markConversationsUnread(conversationIds));

  const handleResolve = () =>
    runBulk(`${leadIds.length} conversa(s) resolvida(s).`, () =>
      Promise.all(leadIds.map((id) => updateStatus(id, "resolved"))).then(() => undefined));

  const handleReopen = () =>
    runBulk(`${leadIds.length} conversa(s) reaberta(s).`, () =>
      Promise.all(leadIds.map((id) => updateStatus(id, "open"))).then(() => undefined));

  const handleSnooze = (until: Date) =>
    runBulk(`${leadIds.length} conversa(s) adiada(s).`, () =>
      Promise.all(leadIds.map((id) => snoozeConversation(id, until))).then(() => undefined));

  const handleAssign = (agentId: string | null) =>
    runBulk(
      agentId ? `${leadIds.length} conversa(s) atribuída(s).` : `${leadIds.length} conversa(s) sem atribuição.`,
      () => Promise.all(leadIds.map((id) => assignToAgent(id, agentId))).then(() => undefined),
    );

  const handleAddLabel = (label: { id: string; name: string; color: string }) =>
    runBulk(`Etiqueta "${label.name}" adicionada.`, () =>
      Promise.all(
        selectedLeads.map((c) => {
          if (c.labels.some((l) => l.id === label.id)) return Promise.resolve();
          return updateLabels(c.lead_id, [...c.labels, label]);
        }),
      ).then(() => undefined));

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-xl shadow-lg px-4 py-3 flex items-center gap-2 flex-wrap max-w-[95vw]">
      <span className="text-sm font-semibold whitespace-nowrap">
        {selectedCount} selecionada{selectedCount === 1 ? "" : "s"}
      </span>
      <div className="h-5 w-px bg-border" />

      <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={handleMarkRead} disabled={busy}>
        <MailOpen className="h-3 w-3" /> Marcar lida
      </Button>
      <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={handleMarkUnread} disabled={busy}>
        <Mail className="h-3 w-3" /> Não lida
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="text-xs gap-1.5" disabled={busy}>
            <UserPlus className="h-3 w-3" /> Atribuir
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => handleAssign(null)} className="text-xs">Nenhum</DropdownMenuItem>
          {agents.map((agent) => (
            <DropdownMenuItem key={agent.id} onClick={() => handleAssign(agent.id)} className="text-xs">
              {agent.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" className="text-xs gap-1.5" disabled={busy}>
            <Tag className="h-3 w-3" /> Etiqueta
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-52 p-2">
          <div className="space-y-1">
            {labels.map((label) => (
              <button
                key={label.id}
                onClick={() => handleAddLabel(label)}
                className="w-full text-left px-2 py-1.5 rounded flex items-center gap-2 hover:bg-secondary transition-colors text-xs"
              >
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: label.color }} />
                {label.name}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={handleResolve} disabled={busy}>
        <CheckSquare className="h-3 w-3" /> Resolver
      </Button>
      <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={handleReopen} disabled={busy}>
        <Check className="h-3 w-3" /> Reabrir
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" className="text-xs gap-1.5" disabled={busy}>
            <Clock className="h-3 w-3" /> Adiar
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-2">
          <div className="space-y-1">
            <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8" onClick={() => handleSnooze(addHours(1))}>Em 1 hora</Button>
            <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8" onClick={() => handleSnooze(addHours(3))}>Em 3 horas</Button>
            <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8" onClick={() => handleSnooze(addHours(24))}>Amanhã</Button>
            <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8" onClick={() => handleSnooze(addHours(24 * 7))}>Em 7 dias</Button>
            <div className="border-t my-2" />
            <div className="flex gap-1.5 px-1">
              <Input
                type="datetime-local"
                value={snoozeCustom}
                min={toLocalInputValue(new Date())}
                onChange={(e) => setSnoozeCustom(e.target.value)}
                className="h-8 text-xs"
              />
              <Button
                size="sm"
                className="h-8 text-xs px-3"
                onClick={() => {
                  const d = new Date(snoozeCustom);
                  if (Number.isNaN(d.getTime()) || d.getTime() <= Date.now()) return;
                  handleSnooze(d);
                }}
              >
                OK
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <div className="h-5 w-px bg-border" />
      <Button size="sm" variant="ghost" className="text-xs gap-1.5" onClick={clearSelection} disabled={busy}>
        Limpar
      </Button>
      <Button size="sm" variant="ghost" className="text-xs gap-1.5" onClick={exitSelectionMode} disabled={busy}>
        <X className="h-3 w-3" /> Sair
      </Button>
      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
    </div>
  );
}
