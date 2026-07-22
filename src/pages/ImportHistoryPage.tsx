import { useCallback, useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileDown, RotateCcw, Loader2, History, ChevronLeft, ChevronRight, Upload } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useAppState } from "@/contexts/AppContext";
import { resolveClientId } from "@/lib/tenant-utils";
import { exportLeadsToCSV } from "@/lib/export";
import * as importsRepo from "@/services/imports";
import type { ImportLogRow } from "@/services/imports";

const PAGE_SIZE = 20;

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function ImportHistoryPage() {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const { refreshData } = useAppState();

  const clientId = useMemo(
    () => resolveClientId(tenant?.id, user?.client_id),
    [tenant?.id, user?.client_id],
  );
  const masterView = user?.role === "master" && tenant?.subdomain === "master";

  const [rows, setRows] = useState<ImportLogRow[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);
  const [rollbackTarget, setRollbackTarget] = useState<ImportLogRow | null>(null);
  const [rollingBack, setRollingBack] = useState(false);
  const [exportingId, setExportingId] = useState<string>("");

  const fetchPage = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const hasTable = await importsRepo.hasImportLogsTable();
      setAvailable(hasTable);
      if (!hasTable) { setRows([]); setCount(0); return; }
      const { rows: data, count: total } = await importsRepo.listImportLogs(
        clientId, !!masterView, page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1,
      );
      setRows(data);
      setCount(total);
    } catch {
      toast.error("Falha ao carregar o histórico de importações.");
    } finally {
      setLoading(false);
    }
  }, [clientId, masterView, page]);

  useEffect(() => { fetchPage(); }, [fetchPage]);

  const handleRollback = async () => {
    if (!rollbackTarget || !clientId) return;
    setRollingBack(true);
    try {
      const removed = await importsRepo.rollbackImportBatch(rollbackTarget.batch_id, clientId);
      toast.success(`${removed} lead(s) removido(s). Importação desfeita.`);
      setRollbackTarget(null);
      await refreshData();
      await fetchPage();
    } catch {
      toast.error("Falha ao desfazer a importação.");
    } finally {
      setRollingBack(false);
    }
  };

  const handleExport = async (log: ImportLogRow) => {
    if (!clientId) return;
    setExportingId(log.id);
    try {
      const leads = await importsRepo.listLeadsByBatch(log.batch_id, clientId);
      if (leads.length === 0) {
        toast.info("Nenhum lead deste batch encontrado (pode ter sido desfeito).");
        return;
      }
      exportLeadsToCSV(leads as any, `importacao-${formatDate(log.created_at).replace(/[/:\s]/g, "-")}.csv`);
    } catch {
      toast.error("Falha ao exportar os leads desta importação.");
    } finally {
      setExportingId("");
    }
  };

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <AppLayout title="Histórico de Importações" subtitle="Veja e desfaça importações de leads">
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <History className="h-4 w-4" />
            {count} importação(ões)
          </div>
          <Button size="sm" variant="outline" className="text-xs gap-1.5" asChild>
            <a href="/import"><Upload className="h-3.5 w-3.5" /> Nova importação</a>
          </Button>
        </div>

        {!available ? (
          <div className="bg-card ghost-border rounded-xl p-8 text-center text-sm text-muted-foreground">
            O histórico de importações ainda não está disponível. Ele passa a funcionar
            após aplicar as migrations do banco (import_logs / leads.import_batch_id).
          </div>
        ) : loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <div className="bg-card ghost-border rounded-xl p-8 text-center text-sm text-muted-foreground">
            Nenhuma importação registrada ainda.
          </div>
        ) : (
          <div className="bg-card ghost-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-left">
                    <th className="px-3 py-2 font-medium">Data</th>
                    <th className="px-3 py-2 font-medium">Arquivo</th>
                    <th className="px-3 py-2 font-medium text-right">Importados</th>
                    <th className="px-3 py-2 font-medium text-right">Atualizados</th>
                    <th className="px-3 py-2 font-medium text-right">Ignorados</th>
                    <th className="px-3 py-2 font-medium text-right">Erros</th>
                    <th className="px-3 py-2 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((log) => (
                    <tr key={log.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-2 whitespace-nowrap text-foreground">{formatDate(log.created_at)}</td>
                      <td className="px-3 py-2 max-w-[180px] truncate text-foreground" title={log.filename ?? ""}>
                        {log.filename || "—"}
                        {log.rolled_back_at && (
                          <Badge variant="outline" className="ml-1.5 text-[9px] text-destructive border-destructive/40">desfeita</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-success">{log.inserted}</td>
                      <td className="px-3 py-2 text-right text-primary">{log.updated || 0}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{log.skipped}</td>
                      <td className={`px-3 py-2 text-right ${log.errors > 0 ? "text-destructive" : "text-muted-foreground"}`}>{log.errors}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm" variant="ghost" className="h-7 px-2 text-[11px] gap-1"
                            onClick={() => handleExport(log)}
                            disabled={exportingId === log.id}
                          >
                            {exportingId === log.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileDown className="h-3 w-3" />}
                            CSV
                          </Button>
                          {!log.rolled_back_at && log.inserted > 0 && (
                            <Button
                              size="sm" variant="ghost"
                              className="h-7 px-2 text-[11px] gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => setRollbackTarget(log)}
                            >
                              <RotateCcw className="h-3 w-3" /> Desfazer
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-3 py-2 border-t border-border">
                <span className="text-[11px] text-muted-foreground">Página {page + 1} de {totalPages}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="h-7 px-2" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 px-2" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={!!rollbackTarget} onOpenChange={(o) => !o && setRollbackTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desfazer esta importação?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai <strong>excluir permanentemente</strong> os {rollbackTarget?.inserted} lead(s)
              inseridos nesta importação{rollbackTarget?.filename ? ` ("${rollbackTarget.filename}")` : ""}.
              Leads que já existiam e foram apenas atualizados <strong>não</strong> são afetados. Esta ação é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rollingBack}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleRollback(); }}
              disabled={rollingBack}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {rollingBack ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Sim, desfazer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
