import { useState } from "react";
import { CheckCircle2, Clock, AlertCircle, UserPlus, MoreHorizontal, User, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { LabelSelector } from "./LabelSelector";
import { useInbox } from "@/hooks/useInbox";

interface ConversationActionsProps {
  conversation: any; // LeadConversation
  onRefresh: () => void;
}

// Mock users list (matching UsersPage.tsx style)
const MOCK_USERS = [
  { id: "u1", name: "Admin Totum" },
  { id: "u2", name: "Maria Gerente" },
  { id: "u3", name: "João Operador" },
  { id: "u4", name: "Carla Operadora" },
];

export function ConversationActions({ conversation, onRefresh }: ConversationActionsProps) {
  const { updateStatus, updatePriority, assignToAgent } = useInbox();

  const handleStatusChange = async (status: string) => {
    await updateStatus(conversation.lead_id, status);
  };

  const handlePriorityChange = async (priority: string) => {
    await updatePriority(conversation.lead_id, priority);
  };

  const handleAssignChange = async (agentId: string | null) => {
    await assignToAgent(conversation.lead_id, agentId);
  };

  return (
    <div className="flex items-center gap-2">
      <LabelSelector 
        conversationId={conversation.source_conversations?.[0]?.id} 
        selectedLabels={conversation.labels || []}
        onLabelsChange={onRefresh}
      />

      <div className="h-6 w-px bg-border mx-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-semibold">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            {conversation.status === "resolved" ? "Resolvido" : "Resolver"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 p-1">
          <DropdownMenuItem onClick={() => handleStatusChange("open")} className="py-2 text-xs font-medium cursor-pointer">
            <Clock className="mr-2 h-3.5 w-3.5 text-blue-500" /> Aberto
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStatusChange("pending")} className="py-2 text-xs font-medium cursor-pointer">
            <Clock className="mr-2 h-3.5 w-3.5 text-yellow-500" /> Pendente
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStatusChange("resolved")} className="py-2 text-xs font-medium cursor-pointer">
            <CheckCircle2 className="mr-2 h-3.5 w-3.5 text-green-500" /> Resolvido
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStatusChange("snoozed")} className="py-2 text-xs font-medium cursor-pointer">
            <Clock className="mr-2 h-3.5 w-3.5 text-slate-500" /> Soneca (Snooze)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-accent/50 transition-colors">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 p-1">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="py-2 text-xs font-medium">
              <AlertCircle className="mr-2 h-3.5 w-3.5" /> Prioridade
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="p-1">
                <DropdownMenuItem onClick={() => handlePriorityChange("none")} className="py-2 text-xs font-medium cursor-pointer">Sem prioridade</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePriorityChange("low")} className="py-2 text-xs font-medium cursor-pointer">Baixa</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePriorityChange("medium")} className="py-2 text-xs font-medium cursor-pointer">Média</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePriorityChange("high")} className="py-2 text-xs font-medium cursor-pointer">Alta</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePriorityChange("urgent")} className="py-2 text-xs font-medium cursor-pointer">Urgente</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="py-2 text-xs font-medium">
              <UserPlus className="mr-2 h-3.5 w-3.5" /> Atribuir agente
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="p-1">
                <DropdownMenuItem onClick={() => handleAssignChange(null)} className="py-2 text-xs font-medium cursor-pointer">Nenhum</DropdownMenuItem>
                {MOCK_USERS.map((user) => (
                  <DropdownMenuItem 
                    key={user.id} 
                    onClick={() => handleAssignChange(user.id)}
                    className="py-2 text-xs font-medium cursor-pointer"
                  >
                    {user.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuSeparator />
          <DropdownMenuItem className="py-2 text-xs font-medium text-destructive cursor-pointer">
            Excluir conversa
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
