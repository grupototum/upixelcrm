import { useState } from "react";
import { Workflow, Plus, Play, MoreHorizontal, Edit, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useAppState } from "@/contexts/AppContext";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ComplexTab() {
  const navigate = useNavigate();
  const { complexAutomations, createAutomation, deleteAutomation } = useAppState();

  const handleCreateNew = async () => {
    const newId = await createAutomation("Nova Automação " + (complexAutomations.length + 1));
    if (newId) navigate(`/automations/builder/${newId}`);
  };

  return (
    <div className="space-y-4">
      {/* Container de listagem */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Card Criar Novo */}
        <div 
          onClick={handleCreateNew}
          className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-all cursor-pointer min-h-[140px] hover:bg-primary/5"
        >
          <div className="h-10 w-10 bg-card rounded-full flex items-center justify-center shadow-sm mb-3">
             <Plus className="h-5 w-5 text-primary" />
          </div>
          <span className="text-sm font-semibold">Novo Fluxo Visual</span>
          <span className="text-[10px] text-center mt-1 w-3/4 opacity-70">
            Crie do zero usando nossa interface drag-and-drop inteligente.
          </span>
        </div>

        {/* Cards dinâmicos */}
        {complexAutomations.map((wf) => (
          <div
            key={wf.id}
            onClick={() => navigate(`/automations/builder/${wf.id}`)}
            className="bg-card ghost-border rounded-xl p-5 shadow-card hover:shadow-card-hover hover:border-border-hover transition-all duration-200 cursor-pointer group flex flex-col relative"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Workflow className="h-5 w-5 text-accent" />
              </div>
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  wf.status === "active" ? "border-success/40 text-success" : "border-warning/40 text-warning"
                }`}
              >
                {wf.status === "active" ? "Ativo" : "Rascunho"}
              </Badge>
            </div>
            
            <div className="flex-1">
               <h4 className="text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">{wf.name}</h4>
               <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                 <span className="flex items-center gap-1"><Play className="h-3 w-3" /> {Array.isArray(wf.nodes) ? wf.nodes.length : 0} nós</span>
                 <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Atualizado {wf.updated_at ? formatDistanceToNow(new Date(wf.updated_at), { addSuffix: true, locale: ptBR }) : "Agora"}</span>
               </div>
            </div>

            {/* Menu Dropdown de Ação */}
            <div className="absolute top-4 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                   <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
                     <MoreHorizontal className="h-4 w-4" />
                   </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={() => navigate(`/automations/builder/${wf.id}`)}>
                    <Edit className="h-3 w-3 mr-2" /> Editar Visualmente
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={() => deleteAutomation(wf.id)}>
                    <Trash2 className="h-3 w-3 mr-2" /> Excluir permanentemente
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
