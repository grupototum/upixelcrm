import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Database, Download, Upload, Clock, RefreshCw, CheckCircle2,
  AlertTriangle, XCircle, FileText, ArrowRight, Settings, BarChart3,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ── helpers ──────────────────────────────────────────────────────────────────

function invoke(action: string, body?: BodyInit, contentType?: string) {
  return supabase.functions.invoke(`database-backup?action=${action}`, {
    body,
    headers: contentType ? { "Content-Type": contentType } : undefined,
  });
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return format(new Date(iso), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

function StatusDot({ status }: { status: string }) {
  const cls =
    status === "done" ? "bg-green-500" :
    status === "running" ? "bg-yellow-500 animate-pulse" :
    status === "error" ? "bg-red-500" : "bg-muted-foreground";
  return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />;
}

// ── RestoreWizard ─────────────────────────────────────────────────────────────

type ValidateResult = {
  valid: boolean;
  error?: string;
  total_statements?: number;
  insert_count?: number;
  tables?: Record<string, number>;
  backup_date?: string | null;
};

function RestoreWizard() {
  const [step, setStep] = useState<"upload" | "validate" | "confirm" | "done">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<ValidateResult | null>(null);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<{ executed: number; errors: unknown[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const validate = async () => {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    const { data, error } = await supabase.functions.invoke("database-backup?action=restore-validate", {
      body: form,
    });
    if (error) { toast.error("Erro ao validar arquivo"); return; }
    setValidation(data as ValidateResult);
    setStep("validate");
  };

  const execute = async () => {
    if (!file) return;
    setExecuting(true);
    const form = new FormData();
    form.append("file", file);
    const { data, error } = await supabase.functions.invoke("database-backup?action=restore-execute", {
      body: form,
    });
    setExecuting(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Erro ao restaurar");
      return;
    }
    setResult(data as { executed: number; errors: unknown[] });
    setStep("done");
    toast.success("Restauração concluída");
  };

  const reset = () => {
    setStep("upload");
    setFile(null);
    setValidation(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      {/* Step indicators */}
      <div className="flex items-center gap-2 text-sm">
        {(["upload", "validate", "confirm", "done"] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold
              ${step === s ? "bg-primary text-primary-foreground" :
                ["upload","validate","confirm","done"].indexOf(step) > i
                  ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"}`}>
              {i + 1}
            </div>
            <span className={step === s ? "font-semibold text-foreground" : "text-muted-foreground"}>
              {s === "upload" ? "Upload" : s === "validate" ? "Validação" : s === "confirm" ? "Confirmação" : "Concluído"}
            </span>
            {i < 3 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {step === "upload" && (
        <Card className="rounded-card border-dashed border-2 border-muted bg-card">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
            <div>
              <p className="font-medium">Selecione o arquivo de backup</p>
              <p className="text-sm text-muted-foreground mt-1">Arquivo .sql gerado pelo uPixel</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".sql,.txt"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              Escolher arquivo
            </Button>
            {file && (
              <div className="flex items-center justify-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-primary" />
                <span>{file.name}</span>
                <span className="text-muted-foreground">({fmtBytes(file.size)})</span>
              </div>
            )}
            {file && (
              <Button onClick={validate} className="mt-2">
                Validar arquivo <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {step === "validate" && validation && (
        <Card className={`rounded-card ${validation.valid ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {validation.valid
                ? <CheckCircle2 className="h-5 w-5 text-green-500" />
                : <XCircle className="h-5 w-5 text-red-500" />}
              {validation.valid ? "Arquivo válido" : "Arquivo inválido"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!validation.valid && (
              <p className="text-sm text-red-600 dark:text-red-400">{validation.error}</p>
            )}
            {validation.valid && (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-xl bg-background">
                    <p className="text-muted-foreground text-xs">Statements INSERT</p>
                    <p className="font-bold text-lg">{validation.insert_count}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-background">
                    <p className="text-muted-foreground text-xs">Data do backup</p>
                    <p className="font-bold">{fmtDate(validation.backup_date)}</p>
                  </div>
                </div>
                {validation.tables && Object.keys(validation.tables).length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tabelas no backup</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(validation.tables).map(([t, n]) => (
                        <Badge key={t} variant="secondary">{t}: {n}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={reset}>Cancelar</Button>
                  <Button onClick={() => setStep("confirm")}>
                    Prosseguir <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
            {!validation.valid && (
              <Button variant="outline" onClick={reset}>Tentar novamente</Button>
            )}
          </CardContent>
        </Card>
      )}

      {step === "confirm" && (
        <Card className="rounded-card border-yellow-500/30 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Confirmar restauração
            </CardTitle>
            <CardDescription>
              Os dados do backup serão inseridos/atualizados no banco via UPSERT. Dados existentes com o mesmo ID serão sobrescritos.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("validate")}>Voltar</Button>
            <Button
              variant="destructive"
              onClick={execute}
              disabled={executing}
            >
              {executing && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              {executing ? "Restaurando…" : "Confirmar e restaurar"}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "done" && result && (
        <Card className="rounded-card border-green-500/30 bg-green-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Restauração concluída
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm"><span className="font-semibold">{result.executed}</span> statements executados com sucesso.</p>
            {Array.isArray(result.errors) && result.errors.length > 0 && (
              <div className="text-sm text-red-600 dark:text-red-400 space-y-1">
                <p className="font-medium">{result.errors.length} erro(s):</p>
                {(result.errors as any[]).slice(0, 5).map((e, i) => (
                  <p key={i} className="text-xs font-mono bg-red-500/10 p-2 rounded">{e.error}</p>
                ))}
              </div>
            )}
            <Button variant="outline" onClick={reset}>Nova restauração</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── CompareTab ────────────────────────────────────────────────────────────────

function CompareTab() {
  const [file, setFile] = useState<File | null>(null);
  const [comparison, setComparison] = useState<Array<{
    table: string; backup: number | null; current: number | null; diff: number;
  }> | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const compare = async () => {
    if (!file) return;
    setLoading(true);
    const form = new FormData();
    form.append("file", file);
    const { data, error } = await supabase.functions.invoke("database-backup?action=schema-compare", {
      body: form,
    });
    setLoading(false);
    if (error) { toast.error("Erro ao comparar"); return; }
    setComparison((data as any).comparison ?? []);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input ref={fileRef} type="file" accept=".sql,.txt" className="hidden"
          onChange={(e) => { setFile(e.target.files?.[0] ?? null); setComparison(null); }} />
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" /> Selecionar backup
        </Button>
        {file && <span className="text-sm text-muted-foreground">{file.name}</span>}
        {file && (
          <Button onClick={compare} disabled={loading}>
            {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
            Comparar
          </Button>
        )}
      </div>

      {comparison && (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 text-muted-foreground text-xs">
                <th className="text-left px-4 py-2">Tabela</th>
                <th className="text-right px-4 py-2">No backup</th>
                <th className="text-right px-4 py-2">Atual</th>
                <th className="text-right px-4 py-2">Diferença</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row) => (
                <tr key={row.table} className="border-t hover:bg-muted/20">
                  <td className="px-4 py-2 font-mono text-xs">{row.table}</td>
                  <td className="px-4 py-2 text-right">{row.backup ?? "—"}</td>
                  <td className="px-4 py-2 text-right">{row.current ?? "—"}</td>
                  <td className={`px-4 py-2 text-right font-semibold
                    ${row.diff > 0 ? "text-green-500" : row.diff < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                    {row.diff > 0 ? `+${row.diff}` : row.diff === 0 ? "=" : row.diff}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DatabaseBackupPage() {
  const qc = useQueryClient();

  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ["db-backup-status"],
    queryFn: async () => {
      const { data, error } = await invoke("status");
      if (error) throw error;
      return data as {
        stats: Record<string, number>;
        lastBackup: Record<string, any> | null;
        config: { enabled: boolean; interval_hours: number; retain_count: number } | null;
      };
    },
    staleTime: 60_000,
  });

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ["db-backup-list"],
    queryFn: async () => {
      const { data, error } = await invoke("list");
      if (error) throw error;
      return (data as any).runs as Array<{
        id: string; status: string; type: string; storage_path: string | null;
        file_size_bytes: number | null; row_counts: Record<string, number> | null;
        error_msg: string | null; started_at: string; finished_at: string | null;
      }>;
    },
    staleTime: 30_000,
  });

  // Config state
  const [config, setConfig] = useState<{ enabled: boolean; interval_hours: number; retain_count: number }>({
    enabled: false, interval_hours: 24, retain_count: 7,
  });
  const [configLoaded, setConfigLoaded] = useState(false);

  if (statusData?.config && !configLoaded) {
    setConfig(statusData.config);
    setConfigLoaded(true);
  }

  const saveConfig = useMutation({
    mutationFn: async () => {
      const { error } = await invoke("config-save", JSON.stringify(config), "application/json");
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Configuração salva"); qc.invalidateQueries({ queryKey: ["db-backup-status"] }); },
    onError: () => toast.error("Erro ao salvar configuração"),
  });

  const exportBackup = useMutation({
    mutationFn: async () => {
      toast.info("Gerando backup…");
      const { data, error } = await invoke("export");
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      return data as { filename: string; url: string; row_counts: Record<string, number>; file_size_bytes: number };
    },
    onSuccess: (data) => {
      toast.success(`Backup gerado — ${fmtBytes(data.file_size_bytes)}`);
      qc.invalidateQueries({ queryKey: ["db-backup-list"] });
      qc.invalidateQueries({ queryKey: ["db-backup-status"] });
      window.open(data.url, "_blank");
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao gerar backup"),
  });

  const downloadRun = async (path: string) => {
    const { data, error } = await invoke(`download&path=${encodeURIComponent(path)}`);
    if (error || !(data as any)?.url) { toast.error("Erro ao gerar link"); return; }
    window.open((data as any).url, "_blank");
  };

  const stats = statusData?.stats ?? {};
  const totalRows = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <AppLayout title="Banco de Dados" subtitle="Backup, restauração e monitoramento de dados">
      <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">

        {/* Header cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="rounded-card bg-card border-[hsl(var(--border-strong))]">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total de registros</p>
                  <p className="text-2xl font-bold">{totalRows.toLocaleString("pt-BR")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-card bg-card border-[hsl(var(--border-strong))]">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Último backup</p>
                  <p className="text-sm font-semibold">{fmtDate(statusData?.lastBackup?.finished_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-card bg-card border-[hsl(var(--border-strong))]">
            <CardContent className="pt-5 pb-5 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Backups realizados</p>
                <p className="text-2xl font-bold">{listData?.length ?? 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="status">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="export">Exportar</TabsTrigger>
            <TabsTrigger value="restore">Restaurar</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
            <TabsTrigger value="compare">Comparar</TabsTrigger>
          </TabsList>

          {/* ── STATUS ─────────────────────────────────────────────────────── */}
          <TabsContent value="status" className="mt-4">
            <Card className="rounded-card bg-card border-[hsl(var(--border-strong))]">
              <CardHeader>
                <CardTitle className="text-base">Registros por tabela</CardTitle>
                <CardDescription>Contagem filtrada por client_id</CardDescription>
              </CardHeader>
              <CardContent>
                {statusLoading ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="rounded-xl border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/40 text-muted-foreground text-xs">
                          <th className="text-left px-4 py-2">Tabela</th>
                          <th className="text-right px-4 py-2">Registros</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(stats).map(([t, n]) => (
                          <tr key={t} className="border-t hover:bg-muted/20">
                            <td className="px-4 py-2 font-mono text-xs">{t}</td>
                            <td className="px-4 py-2 text-right font-semibold">{n.toLocaleString("pt-BR")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── EXPORT ─────────────────────────────────────────────────────── */}
          <TabsContent value="export" className="mt-4">
            <Card className="rounded-card bg-card border-[hsl(var(--border-strong))]">
              <CardHeader>
                <CardTitle className="text-base">Exportar SQL dump</CardTitle>
                <CardDescription>
                  Gera um arquivo .sql com INSERT…ON CONFLICT para todos os dados do cliente. O arquivo fica disponível por 7 dias no Storage.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <span>Tabelas incluídas:</span>
                  {["leads","contacts","campaigns","automations","tasks","bots","messages"].map(t => (
                    <Badge key={t} variant="secondary">{t}</Badge>
                  ))}
                  <span className="text-xs">+ mais…</span>
                </div>
                <Separator />
                <Button
                  onClick={() => exportBackup.mutate()}
                  disabled={exportBackup.isPending}
                  size="lg"
                >
                  {exportBackup.isPending
                    ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Gerando backup…</>
                    : <><Download className="mr-2 h-4 w-4" />Gerar e baixar backup</>}
                </Button>
                {exportBackup.data && (
                  <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-sm space-y-1">
                    <p className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" /> Backup gerado com sucesso
                    </p>
                    <p>Arquivo: <span className="font-mono text-xs">{exportBackup.data.filename}</span></p>
                    <p>Tamanho: {fmtBytes(exportBackup.data.file_size_bytes)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── RESTORE ────────────────────────────────────────────────────── */}
          <TabsContent value="restore" className="mt-4">
            <Card className="rounded-card bg-card border-[hsl(var(--border-strong))]">
              <CardHeader>
                <CardTitle className="text-base">Restaurar backup</CardTitle>
                <CardDescription>
                  Faça upload de um arquivo .sql gerado pelo uPixel. Os dados serão inseridos via UPSERT (registros existentes com mesmo ID são atualizados).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RestoreWizard />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── HISTORY ────────────────────────────────────────────────────── */}
          <TabsContent value="history" className="mt-4">
            <Card className="rounded-card bg-card border-[hsl(var(--border-strong))]">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Histórico de backups</CardTitle>
                  <CardDescription>Últimos 50 backups realizados</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["db-backup-list"] })}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {listLoading ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !listData?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum backup registrado.</p>
                ) : (
                  <div className="rounded-xl border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/40 text-muted-foreground text-xs">
                          <th className="text-left px-4 py-2">Status</th>
                          <th className="text-left px-4 py-2">Tipo</th>
                          <th className="text-left px-4 py-2">Iniciado</th>
                          <th className="text-right px-4 py-2">Tamanho</th>
                          <th className="text-center px-4 py-2">Download</th>
                        </tr>
                      </thead>
                      <tbody>
                        {listData.map((run) => (
                          <tr key={run.id} className="border-t hover:bg-muted/20">
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <StatusDot status={run.status} />
                                <span className="capitalize">{run.status}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2 capitalize">{run.type}</td>
                            <td className="px-4 py-2 text-muted-foreground">{fmtDate(run.started_at)}</td>
                            <td className="px-4 py-2 text-right">
                              {run.file_size_bytes ? fmtBytes(run.file_size_bytes) : "—"}
                            </td>
                            <td className="px-4 py-2 text-center">
                              {run.storage_path && (
                                <Button variant="ghost" size="sm" onClick={() => downloadRun(run.storage_path!)}>
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── COMPARE ────────────────────────────────────────────────────── */}
          <TabsContent value="compare" className="mt-4">
            <Card className="rounded-card bg-card border-[hsl(var(--border-strong))]">
              <CardHeader>
                <CardTitle className="text-base">Comparar backup vs. banco atual</CardTitle>
                <CardDescription>
                  Faça upload de um arquivo de backup para ver a diferença de contagem de registros em cada tabela.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CompareTab />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ── Settings card ───────────────────────────────────────────────── */}
        <Card className="rounded-card bg-card border-[hsl(var(--border-strong))]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="h-4 w-4" /> Configurações de backup automático
            </CardTitle>
            <CardDescription>Backups automáticos requerem pg_cron habilitado no projeto Supabase.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-enabled">Habilitar backups automáticos</Label>
              <Switch
                id="auto-enabled"
                checked={config.enabled}
                onCheckedChange={(v) => setConfig((c) => ({ ...c, enabled: v }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="interval">Intervalo (horas)</Label>
                <Input
                  id="interval"
                  type="number"
                  min={1}
                  max={168}
                  value={config.interval_hours}
                  onChange={(e) => setConfig((c) => ({ ...c, interval_hours: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="retain">Manter últimos N backups</Label>
                <Input
                  id="retain"
                  type="number"
                  min={1}
                  max={30}
                  value={config.retain_count}
                  onChange={(e) => setConfig((c) => ({ ...c, retain_count: Number(e.target.value) }))}
                />
              </div>
            </div>
            <Button onClick={() => saveConfig.mutate()} disabled={saveConfig.isPending}>
              {saveConfig.isPending && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Salvar configuração
            </Button>
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}
