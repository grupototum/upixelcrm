import { useState } from "react";
import { Workflow, Plus, Play, MoreHorizontal, Edit, Trash2, Clock, Activity, CheckCircle2, XCircle, Loader2, MessagesSquare, Pause, FileJson, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { useAppState } from "@/contexts/AppContext";
import { useAutomationStats } from "@/hooks/useAutomationRuns";
import { BotImportExportModal } from "./BotImportExportModal";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ComplexTab() {
  const navigate = useNavigate();
  const { complexAutomations, createAutomation, deleteAutomation, toggleComplexAutomation } = useAppState();
  const { stats, loading: statsLoading } = useAutomationStats();
  const [importExportOpen, setImportExportOpen] = useState(false);
  const [exportPreselect, setExportPreselect] = useState<string | undefined>();

  const handleCreateNew = async () => {
    const newId = await createAutomation("Nova Automação " + (complexAutomations.length + 1));
    if (newId) navigate(`/automations/builder/${newId}`);
  };

  const handleExport = (id: string) => {
    setExportPreselect(id);
    setImportExportOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {complexAutomations.length} automaç{complexAutomations.length !== 1 ? "ões" : "ão"} complex{complexAutomations.length !== 1 ? "as" : "a"}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="text-xs gap-1.5"
          onClick={() => {
            setExportPreselect(undefined);
            setImportExportOpen(true);
          }}
        >
          <FileJson className="h-3 w-3" /> Importar / Exportar JSON
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card Criar Novo */}
        <div
          onClick={handleCreateNew}
          className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-all cursor-pointer min-h-[180px] hover:bg-primary/5"
        >
          <div className="h-10 w-10 bg-card rounded-full flex items-center justify-center shadow-sm mb-3">
            <Plus className="h-5 w-5 text-primary" />
          </div>
          <span className="text-sm font-semibold">Novo Fluxo Visual</span>
          <span className="text-[10px] text-center mt-1 w-3/4 opacity-70">
            Drag-and-drop com Aguardar Resposta, Enviar Mídia e mais.
          </span>
        </div>

        {/* Cards dinâmicos */}
        {complexAutomations.map((wf) => {
          const wfStats = stats[wf.id];
          const running = wfStats?.running_count ?? 0;
          const waiting = wfStats?.waiting_count ?? 0;
          const completed = wfStats?.completed_count ?? 0;
          const failed = wfStats?.failed_count ?? 0;
          const total = wfStats?.total_runs ?? 0;
          const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

          return (
            <div
              key={wf.id}
              className="bg-card ghost-border rounded-xl p-5 shadow-card hover:shadow-card-hover hover:border-[#ff4f00]/30 transition-all duration-200 group flex flex-col relative"
            >
              <div
                onClick={() => navigate(`/automations/builder/${wf.id}`)}
                className="cursor-pointer"
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

                <h4 className="text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                  {wf.name}
                </h4>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Play className="h-3 w-3" /> {Array.isArray(wf.nodes) ? wf.nodes.length : 0} nós
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {wf.updated_at ? formatDistanceToNow(new Date(wf.updated_at), { addSuffix: true, locale: ptBR }) : "Agora"}
                  </span>
                </div>
              </div>

              {/* Stats inline */}
              <div className="mt-4 pt-3 border-t border-[hsl(var(--border-strong))]">
                {statsLoading ? (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  </div>
                ) : total === 0 ? (
                  <p className="text-[10px] text-muted-foreground italic text-center">
                    Nenhum lead executou esta automação ainda.
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-4 gap-1.5 mb-2">
                      <div className="flex flex-col items-center" title="Em execução">
                        <div className="flex items-center gap-1 text-primary">
                          <Activity className="h-2.5 w-2.5" />
                          <span className="text-[11px] font-bold">{running}</span>
                        </div>
                        <span className="text-[9px] text-muted-foreground">ativos</span>
                      </div>
                      <div className="flex flex-col items-center" title="Aguardando resposta">
                        <div className="flex items-center gap-1 text-cyan-500">
                          <MessagesSquare className="h-2.5 w-2.5" />
                          <span className="text-[11px] font-bold">{waiting}</span>
                        </div>
                        <span className="text-[9px] text-muted-foreground">aguardando</span>
                      </div>
                      <div className="flex flex-col items-center" title="Concluídos">
                        <div className="flex items-center gap-1 text-success">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          <span className="text-[11px] font-bold">{completed}</span>
                        </div>
                        <span className="text-[9px] text-muted-foreground">finalizados</span>
                      </div>
                      <div className="flex flex-col items-center" title="Falharam">
                        <div className="flex items-center gap-1 text-destructive">
                          <XCircle className="h-2.5 w-2.5" />
                          <span className="text-[11px] font-bold">{failed}</span>
                        </div>
                        <span className="text-[9px] text-muted-foreground">falhas</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">Taxa de sucesso</span>
                      <span className={`font-bold ${successRate >= 70 ? "text-success" : successRate >= 40 ? "text-warning" : "text-destructive"}`}>
                        {successRate}%
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[10px] h-7 flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/automations/builder/${wf.id}/runs`);
                  }}
                >
                  <Activity className="h-3 w-3 mr-1" /> Ver runs
                </Button>
                <Button
                  variant={wf.status === "active" ? "outline" : "default"}
                  size="sm"
                  className="text-[10px] h-7 flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleComplexAutomation(wf.id);
                  }}
                >
                  {wf.status === "active" ? (
                    <><Pause className="h-3 w-3 mr-1" /> Pausar</>
                  ) : (
                    <><Play className="h-3 w-3 mr-1" /> Ativar</>
                  )}
                </Button>
              </div>

              {/* Menu Dropdown */}
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
                    <DropdownMenuItem onClick={() => navigate(`/automations/builder/${wf.id}/runs`)}>
                      <Activity className="h-3 w-3 mr-2" /> Ver execuções
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport(wf.id)}>
                      <Download className="h-3 w-3 mr-2" /> Exportar JSON
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => {
                        if (confirm(`Excluir "${wf.name}" e todos os runs?`)) deleteAutomation(wf.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3 mr-2" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </div>

      <BotImportExportModal
        open={importExportOpen}
        onOpenChange={(v) => {
          setImportExportOpen(v);
          if (!v) setExportPreselect(undefined);
        }}
        preselectAutomationId={exportPreselect}
      />
    </div>
  );
}
