import { useState, useRef, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Upload, FileSpreadsheet, ArrowRight, CheckCircle2, X,
  AlertCircle, Loader2, SkipForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAppState } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { CSVPreview } from "@/components/import/CSVPreview";

const systemFields = [
  { key: "name", label: "Nome", required: true },
  { key: "phone", label: "Telefone", required: false },
  { key: "email", label: "Email", required: false },
  { key: "company", label: "Empresa", required: false },
  { key: "city", label: "Cidade", required: false },
  { key: "position", label: "Cargo", required: false },
  { key: "origin", label: "Origem", required: false },
  { key: "tags", label: "Tags (separadas por ;)", required: false },
];

interface CsvData {
  headers: string[];
  rows: string[][];
}

interface ImportResult {
  inserted: number;
  skipped: number;
  errors: number;
}

// Handles quoted fields, commas inside quotes, CRLF/LF, and UTF-8 BOM
function parseCSV(text: string): CsvData {
  const clean = text.replace(/^﻿/, "");
  const lines: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    const next = clean[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { cell += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { cell += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { row.push(cell.trim()); cell = ""; }
      else if (ch === '\r' && next === '\n') {
        row.push(cell.trim());
        if (row.some((c) => c !== "")) lines.push(row);
        row = []; cell = ""; i++;
      } else if (ch === '\n' || ch === '\r') {
        row.push(cell.trim());
        if (row.some((c) => c !== "")) lines.push(row);
        row = []; cell = "";
      } else {
        cell += ch;
      }
    }
  }
  if (cell || row.length > 0) {
    row.push(cell.trim());
    if (row.some((c) => c !== "")) lines.push(row);
  }

  if (lines.length === 0) return { headers: [], rows: [] };
  const [headers, ...rawRows] = lines;
  const rows = rawRows.map((r) => {
    const padded = [...r];
    while (padded.length < headers.length) padded.push("");
    return padded.slice(0, headers.length);
  });
  return { headers, rows };
}

export default function ImportPage() {
  const { pipelines, columns, leads, refreshData } = useAppState();
  const { user } = useAuth();
  const { tenant } = useTenant();

  const [step, setStep] = useState(1);
  const [csvData, setCsvData] = useState<CsvData | null>(null);
  const [fileName, setFileName] = useState("");
  const [pipelineId, setPipelineId] = useState("");
  const [column, setColumn] = useState("");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const availablePipelines = pipelines;
  const pipelineColumns = columns.filter((c) => c.pipeline_id === pipelineId);

  const readFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      toast.error("Apenas arquivos .csv são aceitos.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.headers.length === 0) {
        toast.error("Arquivo CSV vazio ou inválido.");
        return;
      }
      setCsvData(parsed);
      setFileName(file.name);
      // Auto-map: try to match CSV headers to system fields by name
      const autoMap: Record<string, string> = {};
      const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s|_/g, "");
      const aliases: Record<string, string[]> = {
        name: ["nome", "name", "contato", "cliente"],
        phone: ["telefone", "phone", "tel", "celular", "fone", "whatsapp"],
        email: ["email", "e-mail", "mail", "emailcontato"],
        company: ["empresa", "company", "negocio", "business"],
        city: ["cidade", "city", "municipio"],
        position: ["cargo", "position", "funcao", "role"],
        origin: ["origem", "origin", "fonte", "source"],
        tags: ["tags", "etiquetas", "labels"],
      };
      for (const field of systemFields) {
        const fieldAliases = aliases[field.key] || [field.key];
        const match = parsed.headers.find((h) =>
          fieldAliases.some((a) => normalize(h).includes(normalize(a)))
        );
        if (match) autoMap[field.key] = match;
      }
      setMapping(autoMap);
      // Auto-select first pipeline/column
      if (availablePipelines.length > 0 && !pipelineId) {
        const firstPipeline = availablePipelines[0];
        setPipelineId(firstPipeline.id);
        const firstCol = columns.filter((c) => c.pipeline_id === firstPipeline.id).sort((a, b) => a.order - b.order)[0];
        if (firstCol) setColumn(firstCol.id);
      }
      setStep(2);
      toast.success(`${parsed.rows.length} registros carregados de "${file.name}".`);
    };
    reader.readAsText(file, "UTF-8");
  }, [availablePipelines, columns, pipelineId]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFile(file);
  }, [readFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  }, [readFile]);

  const clearFile = () => {
    setCsvData(null);
    setFileName("");
    setImportResult(null);
    setStep(1);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handlePipelineChange = (pid: string) => {
    setPipelineId(pid);
    const firstCol = columns.filter((c) => c.pipeline_id === pid).sort((a, b) => a.order - b.order)[0];
    setColumn(firstCol?.id ?? "");
  };

  const handleImport = async () => {
    if (!csvData || !column) return;
    const clientId = user?.client_id ?? tenant?.id;
    if (!clientId) { toast.error("Sessão inválida. Faça login novamente."); return; }

    setImporting(true);

    // Build set of existing phone suffixes for deduplication
    const existingPhoneSuffixes = new Set(
      leads
        .filter((l) => l.phone)
        .map((l) => l.phone!.replace(/\D/g, "").slice(-8))
    );

    const getValue = (row: string[], fieldKey: string): string | null => {
      const csvCol = mapping[fieldKey];
      if (!csvCol || csvCol === "__skip") return null;
      const idx = csvData.headers.indexOf(csvCol);
      return idx >= 0 && row[idx] ? row[idx] : null;
    };

    const leadsToInsert: Record<string, any>[] = [];
    let skipped = 0;

    for (const row of csvData.rows) {
      const name = getValue(row, "name");
      if (!name) { skipped++; continue; }

      const phone = getValue(row, "phone");
      if (phone) {
        const suffix = phone.replace(/\D/g, "").slice(-8);
        if (existingPhoneSuffixes.has(suffix)) { skipped++; continue; }
        existingPhoneSuffixes.add(suffix);
      }

      const tagsRaw = getValue(row, "tags");
      const tags = tagsRaw ? tagsRaw.split(";").map((t) => t.trim()).filter(Boolean) : [];

      leadsToInsert.push({
        name,
        phone: phone || null,
        email: getValue(row, "email") || null,
        company: getValue(row, "company") || null,
        city: getValue(row, "city") || null,
        position: getValue(row, "position") || null,
        origin: getValue(row, "origin") || "Importação",
        tags,
        column_id: column,
        client_id: clientId,
        ...(tenant?.id ? { tenant_id: tenant.id } : {}),
      });
    }

    let inserted = 0;
    let errors = 0;
    const CHUNK = 100;

    for (let i = 0; i < leadsToInsert.length; i += CHUNK) {
      const chunk = leadsToInsert.slice(i, i + CHUNK);
      const { error } = await supabase.from("leads").insert(chunk);
      if (error) { console.error("Import error:", error); errors += chunk.length; }
      else inserted += chunk.length;
    }

    if (inserted > 0) await refreshData();

    setImportResult({ inserted, skipped, errors });
    setImporting(false);
    setStep(4);
  };

  const stepLabels = ["Upload", "Pipeline", "Mapeamento", "Confirmar"];
  const selectedPipeline = pipelines.find((p) => p.id === pipelineId);
  const selectedColumn = columns.find((c) => c.id === column);

  return (
    <AppLayout title="Importação de Leads" subtitle="Importe sua base de contatos via CSV">
      <div className="p-6 animate-fade-in max-w-3xl mx-auto">
        {/* Stepper */}
        <div className="flex items-center gap-1 mb-8">
          {stepLabels.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <button
                onClick={() => { if (i + 1 < step) setStep(i + 1); }}
                disabled={i + 1 > step}
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${step > i + 1 ? "bg-success text-success-foreground cursor-pointer" : step === i + 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                {step > i + 1 ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </button>
              <span className={`text-xs font-medium hidden sm:inline ${step === i + 1 ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
              {i < 3 && <ArrowRight className="h-3 w-3 text-muted-foreground mx-1" />}
            </div>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === 1 && (
          <div
            className={`bg-card border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleInputChange} />
            <Upload className={`h-12 w-12 mx-auto mb-4 transition-colors ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
            <h3 className="text-sm font-semibold text-foreground mb-1">Arraste seu arquivo CSV aqui</h3>
            <p className="text-xs text-muted-foreground mb-4">ou clique para selecionar um arquivo</p>
            <Button variant="outline" size="sm" className="text-xs">Selecionar Arquivo</Button>
          </div>
        )}

        {/* Step 2: Pipeline & Stage */}
        {step === 2 && (
          <div className="bg-card ghost-border rounded-xl p-6 space-y-5">
            <h3 className="text-sm font-semibold text-foreground">Selecione o Pipeline e Etapa Inicial</h3>

            {csvData && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted">
                <FileSpreadsheet className="h-5 w-5 text-success" />
                <span className="text-sm font-medium text-foreground">{fileName}</span>
                <Badge variant="outline" className="text-[10px] ml-auto">{csvData.rows.length} registros</Badge>
                <button onClick={clearFile} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Pipeline</Label>
                <Select value={pipelineId} onValueChange={handlePipelineChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione o pipeline" /></SelectTrigger>
                  <SelectContent>
                    {availablePipelines.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Etapa Inicial</Label>
                <Select value={column} onValueChange={setColumn} disabled={!pipelineId}>
                  <SelectTrigger><SelectValue placeholder="Selecione a etapa" /></SelectTrigger>
                  <SelectContent>
                    {pipelineColumns
                      .sort((a, b) => a.order - b.order)
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" className="text-xs" onClick={clearFile}>Voltar</Button>
              <Button
                size="sm"
                className="text-xs bg-primary hover:bg-primary-hover text-primary-foreground"
                onClick={() => setStep(3)}
                disabled={!column}
              >
                Continuar
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Mapping */}
        {step === 3 && csvData && (
          <div className="bg-card ghost-border rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Mapeamento de Colunas</h3>
              <p className="text-[11px] text-muted-foreground">Associe as colunas do CSV aos campos do sistema</p>
            </div>

            <div className="space-y-3">
              {systemFields.map((field) => (
                <div key={field.key} className="flex items-center gap-3">
                  <div className="w-36 flex items-center gap-1.5 shrink-0">
                    <span className="text-sm text-foreground">{field.label}</span>
                    {field.required && <span className="text-[10px] text-destructive">*</span>}
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  <Select
                    value={mapping[field.key] ?? "__skip"}
                    onValueChange={(v) => setMapping((p) => ({ ...p, [field.key]: v }))}
                  >
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__skip">— Ignorar —</SelectItem>
                      {csvData.headers.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Preview */}
            <CSVPreview
              csvHeaders={csvData.headers}
              csvRows={csvData.rows}
              mapping={mapping}
              previewCount={3}
            />

            {/* Dedup notice */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 ghost-border">
              <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">
                Leads com telefone já existente na base serão ignorados automaticamente.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setStep(2)}>Voltar</Button>
              <Button
                size="sm"
                className="text-xs bg-primary hover:bg-primary-hover text-primary-foreground"
                onClick={() => {
                  if (!mapping.name || mapping.name === "__skip") {
                    toast.error("O campo Nome é obrigatório.");
                    return;
                  }
                  handleImport();
                }}
                disabled={importing}
              >
                {importing ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Importando...</>
                ) : (
                  "Importar Leads"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Result */}
        {step === 4 && importResult && (
          <div className="bg-card ghost-border rounded-xl p-12 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Importação Concluída!</h3>
              <p className="text-sm text-muted-foreground">
                Pipeline: <span className="font-medium text-foreground">{selectedPipeline?.name}</span>
                {" · "}
                Etapa: <span className="font-medium text-foreground">{selectedColumn?.name}</span>
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
              <div className="bg-success/10 rounded-xl p-3">
                <p className="text-xl font-bold text-success">{importResult.inserted}</p>
                <p className="text-[11px] text-muted-foreground">Importados</p>
              </div>
              <div className="bg-muted rounded-xl p-3">
                <p className="text-xl font-bold text-foreground">{importResult.skipped}</p>
                <p className="text-[11px] text-muted-foreground">Ignorados</p>
              </div>
              <div className={`rounded-xl p-3 ${importResult.errors > 0 ? "bg-destructive/10" : "bg-muted"}`}>
                <p className={`text-xl font-bold ${importResult.errors > 0 ? "text-destructive" : "text-foreground"}`}>
                  {importResult.errors}
                </p>
                <p className="text-[11px] text-muted-foreground">Erros</p>
              </div>
            </div>

            {importResult.skipped > 0 && (
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <SkipForward className="h-3.5 w-3.5" />
                {importResult.skipped} lead(s) ignorado(s) por duplicata de telefone ou nome ausente.
              </p>
            )}

            <div className="flex justify-center gap-3 pt-2">
              <Button variant="outline" size="sm" className="text-xs" onClick={clearFile}>
                Nova Importação
              </Button>
              <Button size="sm" className="text-xs bg-primary hover:bg-primary-hover text-primary-foreground" asChild>
                <a href="/crm">Ver no CRM</a>
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
