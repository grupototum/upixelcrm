import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Upload, FileSpreadsheet, ArrowRight, CheckCircle2, X,
  AlertCircle, Loader2, SkipForward, Plus, Sparkles, Download,
  Link2, Wand2, FileDown, History, Zap, PencilLine,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAppState } from "@/contexts/AppContext";
import * as leadsRepo from "@/services/leads";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useCustomFields } from "@/hooks/useCustomFields";
import type { CustomFieldType } from "@/types";
import { CSVPreview } from "@/components/import/CSVPreview";
import { TagRulesConfig } from "@/components/import/TagRulesConfig";
import { resolveClientId } from "@/lib/tenant-utils";
import * as importsRepo from "@/services/imports";
import * as automationsRepo from "@/services/automations";
import { fetchGoogleSheetsCSV } from "@/utils/googleSheets";
import { loadImportMapping, saveImportMapping, clearImportMapping } from "@/utils/importMapping";
import { normalizePhoneKey } from "@/utils/phone";
import { exportLeadsToCSV } from "@/lib/export";
import { loadTagRules, applyTagRules, suggestHeuristicTags, type TagRule } from "@/utils/tagRules";
import type { ComplexAutomation } from "@/types";

type DuplicateMode = "skip" | "update" | "merge";

interface DuplicatePreview {
  checked: boolean;
  duplicates: number;
  total: number;
}

interface ImportReport {
  byCity: { label: string; count: number }[];
  byOrigin: { label: string; count: number }[];
  byTag: { label: string; count: number }[];
}

interface TagSuggestion {
  tag: string;
  reason: string;
  leadIds: string[];
}

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

// Aliases usados tanto para auto-mapear quanto para DETECTAR a linha de cabeçalho.
// Mantido em módulo para reuso entre parseCSV, o path .xlsx e o auto-map.
const HEADER_ALIASES = [
  "nome", "name", "contato", "cliente", "razaosocial", "razao social", "clinica",
  "telefone", "phone", "tel", "celular", "fone", "whatsapp",
  "email", "e-mail", "mail",
  "empresa", "company", "negocio", "nomefantasia", "nome fantasia",
  "cidade", "city", "municipio",
  "estado", "uf",
  "cargo", "position", "funcao", "role",
  "origem", "origin", "fonte", "source",
  "tags", "etiquetas", "labels",
  "endereco", "endereço", "instagram", "site", "website", "observa",
];

const normalizeHeaderText = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

// Muitas planilhas de prospecção têm linhas de título/metadados ANTES do cabeçalho
// real (ex: "LISTA DE 50 CLÍNICAS..."). Pegar cegamente a 1ª linha como header gera
// colunas com nome vazio → o Radix Select quebra com value="" ("Algo deu errado").
// Aqui escolhemos, entre as primeiras linhas, a que mais parece um cabeçalho:
//  (1) maior nº de células que batem com aliases conhecidos; empatando/zerando →
//  (2) a primeira linha com o maior nº de células preenchidas (>= 2).
function detectHeaderIndex(rows: string[][]): number {
  const sample = rows.slice(0, 15);
  if (sample.length === 0) return 0;

  const aliasScore = (row: string[]) =>
    row.reduce((acc, cell) => {
      const c = normalizeHeaderText(cell);
      return acc + (c && HEADER_ALIASES.some((a) => c.includes(a)) ? 1 : 0);
    }, 0);

  const aliasScores = sample.map(aliasScore);
  const bestAlias = Math.max(...aliasScores);
  if (bestAlias >= 2) return aliasScores.indexOf(bestAlias);

  // Fallback: linha mais "cheia" (title rows têm 1 célula; header/data têm várias).
  const fillCounts = sample.map((r) => r.filter((c) => c.trim() !== "").length);
  const maxFill = Math.max(...fillCounts);
  if (maxFill <= 1) return 0;
  const idx = fillCounts.findIndex((c) => c >= maxFill);
  return idx < 0 ? 0 : idx;
}

// Garante que TODO header tenha nome não-vazio e único: célula vazia vira "Coluna N",
// duplicatas ganham sufixo. Blindagem contra o crash do Radix Select (value="") e
// contra keys duplicadas no React, mesmo se a planilha vier torta.
function normalizeHeaders(raw: string[]): string[] {
  const seen = new Map<string, number>();
  return raw.map((h, i) => {
    let name = h.trim() || `Coluna ${i + 1}`;
    const count = seen.get(name) ?? 0;
    seen.set(name, count + 1);
    if (count > 0) name = `${name} (${count + 1})`;
    return name;
  });
}

interface ImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  skippedNoName: number;
  skippedDuplicate: number;
  errors: number;
}

// Planilha padrão de importação — mesmo formato de docs/import-leads/modelo-importacao-leads.csv.
// Gerada no cliente (Blob) para o botão "Baixar modelo", sem depender de asset estático.
const TEMPLATE_HEADERS = ["Nome", "Telefone", "Email", "Empresa", "Cidade", "Cargo", "Origem", "Tags"];
const TEMPLATE_ROWS = [
  ["João da Silva", "(11) 98888-7777", "joao@empresa.com.br", "Empresa Exemplo Ltda", "São Paulo", "Diretor Comercial", "Landing Page", "VIP;Quente"],
  ["Maria Souza", "(21) 3333-4444", "maria@clinica.com.br", "Clínica Exemplo", "Rio de Janeiro", "Gerente", "Indicação", "Frio"],
];

function downloadTemplateCSV() {
  const esc = (c: string) => (/[",\n;]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c);
  const csv = [TEMPLATE_HEADERS, ...TEMPLATE_ROWS].map((r) => r.map(esc).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "modelo-importacao-leads.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Handles quoted fields, commas inside quotes, CRLF/LF, and UTF-8 BOM
function parseCSV(text: string): CsvData {
  const clean = text.replace(/^\uFEFF/, "");
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
  const headerIdx = detectHeaderIndex(lines);
  const headers = normalizeHeaders(lines[headerIdx]);
  const rawRows = lines.slice(headerIdx + 1);
  const rows = rawRows.map((r) => {
    const padded = [...r];
    while (padded.length < headers.length) padded.push("");
    return padded.slice(0, headers.length);
  });
  return { headers, rows };
}

interface ImportPageProps {
  /** Quando true, não renderiza o AppLayout (modo embedded — usado dentro de modal/Dialog). */
  embedded?: boolean;
  /** Pré-seleciona o pipeline alvo. */
  initialPipelineId?: string;
  /** Pré-seleciona a coluna alvo. Se combinado com initialPipelineId, pula a tela de seleção. */
  initialColumnId?: string;
  /** Quando true + ambos initials acima, desabilita os selectors (usuário não pode trocar). */
  lockTarget?: boolean;
  /** Callback invocado após a importação terminar com sucesso (qualquer leads inserted > 0). */
  onComplete?: (result: ImportResult) => void;
}

export default function ImportPage({
  embedded = false,
  initialPipelineId,
  initialColumnId,
  lockTarget = false,
  onComplete,
}: ImportPageProps = {}) {
  const { pipelines, columns, leads, complexAutomations, refreshData } = useAppState();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const { definitions: customFieldDefs, createField, fetchDefinitions } = useCustomFields();

  const [step, setStep] = useState(1);
  const [csvData, setCsvData] = useState<CsvData | null>(null);
  const [fileName, setFileName] = useState("");
  const [pipelineId, setPipelineId] = useState(initialPipelineId ?? "");
  const [column, setColumn] = useState(initialColumnId ?? "");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // F12 — importar do Google Sheets por URL
  const [sheetUrl, setSheetUrl] = useState("");
  const [fetchingSheet, setFetchingSheet] = useState(false);

  // F4 — modo de duplicatas + F3 preview de duplicatas
  const [dupeMode, setDupeMode] = useState<DuplicateMode>("skip");
  const [dupPreview, setDupPreview] = useState<DuplicatePreview>({ checked: false, duplicates: 0, total: 0 });
  const [checkingDupes, setCheckingDupes] = useState(false);

  // F6 — mapeamento salvo por fingerprint
  const [savedMappingUsed, setSavedMappingUsed] = useState(false);

  // F9 — automação ao importar
  const [automationId, setAutomationId] = useState<string>("");

  // F10/F11 — regras de tag + sugestões heurísticas
  const [tagRules, setTagRules] = useState<TagRule[]>([]);
  const [applyRules, setApplyRules] = useState(true);
  const [showTagRules, setShowTagRules] = useState(false);
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [applyingTags, setApplyingTags] = useState(false);

  // F7 — relatório pós-importação + F14 export
  const [report, setReport] = useState<ImportReport | null>(null);
  const [lastBatchId, setLastBatchId] = useState<string>("");
  const [exporting, setExporting] = useState(false);

  const activeAutomations = useMemo(
    () => complexAutomations.filter((a) => a.status === "active"),
    [complexAutomations],
  );

  // New custom field modal state
  const [showCreateField, setShowCreateField] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>("text");
  const [newFieldHeader, setNewFieldHeader] = useState<string>("");
  const [newFieldOptions, setNewFieldOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [typeWasSuggested, setTypeWasSuggested] = useState(false);
  const [creatingField, setCreatingField] = useState(false);

  const availablePipelines = pipelines;
  const pipelineColumns = columns.filter((c) => c.pipeline_id === pipelineId);

  const clientId = useMemo(
    () => resolveClientId(tenant?.id, user?.client_id),
    [tenant?.id, user?.client_id],
  );

  // F11 — carrega regras de tag do tenant (localStorage).
  useEffect(() => {
    if (clientId) setTagRules(loadTagRules(clientId));
  }, [clientId]);

  const applyParsed = useCallback((parsed: CsvData, file: File) => {
    if (parsed.headers.length === 0) {
      toast.error("Arquivo vazio ou inválido.");
      return;
    }
    setCsvData(parsed);
    setFileName(file.name);
    // Auto-map: try to match headers to system fields by name
    const autoMap: Record<string, string> = {};
    const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s|_|\(|\)|-/g, "");
    const aliases: Record<string, string[]> = {
      name: ["nome", "name", "contato", "cliente", "razaosocial"],
      phone: ["telefone", "phone", "tel", "celular", "fone", "whatsapp", "telcomercial"],
      email: ["email", "e-mail", "mail", "emailcontato"],
      company: ["empresa", "company", "negocio", "business", "nomefantasia"],
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
    // F6 — se já houve um mapeamento salvo para estes mesmos cabeçalhos, reusa.
    const saved = loadImportMapping(parsed.headers);
    if (saved && Object.keys(saved).length > 0) {
      setMapping({ ...autoMap, ...saved });
      setSavedMappingUsed(true);
    } else {
      setMapping(autoMap);
      setSavedMappingUsed(false);
    }
    // Reset de estado por-importação (preview de duplicatas, relatório, sugestões).
    setDupPreview({ checked: false, duplicates: 0, total: 0 });
    setReport(null);
    setSuggestions([]);
    // Auto-select first pipeline/column
    if (availablePipelines.length > 0 && !pipelineId) {
      const firstPipeline = availablePipelines[0];
      setPipelineId(firstPipeline.id);
      const firstCol = columns.filter((c) => c.pipeline_id === firstPipeline.id).sort((a, b) => a.order - b.order)[0];
      if (firstCol) setColumn(firstCol.id);
    }
    // Quando o alvo (pipeline + coluna) já veio pré-definido, pula a tela 2 e vai
    // direto pro mapeamento — o usuário já decidiu onde os leads vão.
    const hasPreselectedTarget = !!(initialPipelineId && initialColumnId);
    setStep(hasPreselectedTarget ? 3 : 2);
    toast.success(`${parsed.rows.length} registros carregados de "${file.name}".`);
  }, [availablePipelines, columns, pipelineId, initialPipelineId, initialColumnId]);

  const readFile = useCallback((file: File) => {
    const name = file.name.toLowerCase();
    const isCsv = name.endsWith(".csv") || file.type === "text/csv";
    const isXlsx = name.endsWith(".xlsx") || name.endsWith(".xls");

    if (!isCsv && !isXlsx) {
      toast.error("Apenas arquivos .csv, .xlsx ou .xls são aceitos.");
      return;
    }

    if (isCsv) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        applyParsed(parseCSV(text), file);
      };
      reader.readAsText(file, "UTF-8");
      return;
    }

    // .xlsx / .xls — dynamic import keeps SheetJS out of the initial bundle
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const buf = e.target?.result as ArrayBuffer;
        const XLSX = await import("@e965/xlsx");
        const wb = XLSX.read(buf, { type: "array" });
        const firstSheetName = wb.SheetNames[0];
        if (!firstSheetName) {
          toast.error("Planilha sem abas.");
          return;
        }
        const sheet = wb.Sheets[firstSheetName];
        const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false }) as string[][];
        // Drop fully empty leading rows (some spreadsheets have title rows)
        const nonEmpty = matrix.filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
        if (nonEmpty.length === 0) {
          toast.error("Planilha vazia.");
          return;
        }
        const asStrings = nonEmpty.map((r) => r.map((c) => String(c ?? "").trim()));
        const headerIdx = detectHeaderIndex(asStrings);
        const headers = normalizeHeaders(asStrings[headerIdx]);
        const dataRows = asStrings.slice(headerIdx + 1);
        const rows = dataRows.map((r) => headers.map((_, i) => String(r[i] ?? "").trim()));
        applyParsed({ headers, rows }, file);
      } catch (err) {
        console.error("xlsx parse error", err);
        toast.error("Falha ao ler o arquivo Excel. Verifique se está corrompido.");
      }
    };
    reader.readAsArrayBuffer(file);
  }, [applyParsed]);

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

  // F12 — importar de uma planilha pública do Google Sheets por URL.
  const handleSheetImport = useCallback(async () => {
    const url = sheetUrl.trim();
    if (!url) { toast.error("Cole a URL da planilha do Google Sheets."); return; }
    setFetchingSheet(true);
    try {
      const text = await fetchGoogleSheetsCSV(url);
      const parsed = parseCSV(text);
      // applyParsed só usa file.name — passamos um pseudo-arquivo.
      applyParsed(parsed, { name: "Google Sheets.csv" } as File);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao importar do Google Sheets.");
    } finally {
      setFetchingSheet(false);
    }
  }, [sheetUrl, applyParsed]);

  // F3 — checa quantos contatos do arquivo já existem na base (telefone/email).
  const runDuplicateCheck = useCallback(async () => {
    if (!csvData || !clientId) return;
    setCheckingDupes(true);
    try {
      const { phones, emails } = await importsRepo.loadExistingContactKeys(clientId);
      const phoneIdx = mapping.phone ? csvData.headers.indexOf(mapping.phone) : -1;
      const emailIdx = mapping.email ? csvData.headers.indexOf(mapping.email) : -1;
      const seenInFile = new Set<string>();
      let duplicates = 0;
      for (const row of csvData.rows) {
        const phone = phoneIdx >= 0 ? (row[phoneIdx] ?? "").trim() : "";
        const email = emailIdx >= 0 ? (row[emailIdx] ?? "").trim().toLowerCase() : "";
        const pKey = phone ? normalizePhoneKey(phone) : "";
        const dupExisting = (pKey && phones.has(pKey)) || (email && emails.has(email));
        // também conta duplicatas dentro do próprio arquivo
        const fileKey = pKey || email;
        const dupInFile = fileKey ? seenInFile.has(fileKey) : false;
        if (fileKey) seenInFile.add(fileKey);
        if (dupExisting || dupInFile) duplicates++;
      }
      setDupPreview({ checked: true, duplicates, total: csvData.rows.length });
    } catch {
      toast.error("Não foi possível checar duplicatas agora.");
    } finally {
      setCheckingDupes(false);
    }
  }, [csvData, clientId, mapping]);

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

  // Suggests a field_type by sampling up to 20 non-empty values from the column.
  // Returns the type plus pre-populated options when select is suggested.
  const suggestFieldType = (
    csvHeader: string,
  ): { type: CustomFieldType; options: Array<{ label: string; value: string }> } => {
    const empty = { type: "text" as CustomFieldType, options: [] };
    if (!csvData) return empty;
    const idx = csvData.headers.indexOf(csvHeader);
    if (idx < 0) return empty;

    const headerNorm = csvHeader.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (/(data|nascimento|vencimento|aniversari)/.test(headerNorm)) return { type: "date", options: [] };
    if (/(link|url|site|website)/.test(headerNorm)) return { type: "link", options: [] };
    if (/(preco|valor|faturamento|receita|salari|renda|ticket|investimento|orcamento)/.test(headerNorm)) {
      return { type: "number", options: [] };
    }
    if (/(observa|descric|notas|coment)/.test(headerNorm)) return { type: "textarea", options: [] };

    const samples = csvData.rows
      .map((r) => (r[idx] ?? "").trim())
      .filter((v) => v !== "")
      .slice(0, 20);
    if (samples.length === 0) return empty;

    // Numeric detection: all values parse as numbers (after BR locale normalize)
    const numericish = samples.every((v) => {
      const n = Number(v.replace(/\./g, "").replace(",", "."));
      return !Number.isNaN(n);
    });
    if (numericish) return { type: "number", options: [] };

    // Low-cardinality → select
    const distinct = Array.from(new Set(samples));
    if (samples.length >= 5 && distinct.length <= 8) {
      return {
        type: "select",
        options: distinct.map((v) => ({ label: v, value: v })),
      };
    }

    return empty;
  };

  const openCreateFieldFor = (csvHeader?: string) => {
    setNewFieldName(csvHeader ?? "");
    setNewFieldHeader(csvHeader ?? "");
    if (csvHeader) {
      const { type, options } = suggestFieldType(csvHeader);
      setNewFieldType(type);
      setNewFieldOptions(options);
      setTypeWasSuggested(type !== "text" || options.length > 0);
    } else {
      setNewFieldType("text");
      setNewFieldOptions([]);
      setTypeWasSuggested(false);
    }
    setShowCreateField(true);
  };

  const handleCreateField = async () => {
    if (!newFieldName.trim()) {
      toast.error("Informe o nome do campo.");
      return;
    }
    setCreatingField(true);
    const created = await createField({
      name: newFieldName.trim(),
      field_type: newFieldType,
      is_required: false,
      options: newFieldType === "select" || newFieldType === "multi_select" ? newFieldOptions : [],
    });
    setCreatingField(false);
    if (created) {
      const slug = (created as { slug?: string }).slug;
      if (newFieldHeader && slug) {
        setMapping((prev) => ({ ...prev, [`cf:${slug}`]: newFieldHeader }));
      }
      // Refetch para garantir que customFieldDefs está sincronizado com o banco
      await fetchDefinitions();
      setShowCreateField(false);
      setNewFieldName("");
      setNewFieldHeader("");
      setNewFieldOptions([]);
      setTypeWasSuggested(false);
    }
  };

  // F10 — computa sugestões heurísticas de tag a partir dos leads do batch.
  const buildSuggestions = (
    batchLeads: { id: string; position?: string | null; phone?: string | null; email?: string | null; tags?: string[] | null }[],
  ): TagSuggestion[] => {
    const map = new Map<string, TagSuggestion>();
    for (const lead of batchLeads) {
      const already = new Set((lead.tags ?? []).map((t) => t.toLowerCase()));
      for (const { tag, reason } of suggestHeuristicTags(lead)) {
        if (already.has(tag.toLowerCase())) continue;
        const entry = map.get(tag) ?? { tag, reason, leadIds: [] };
        entry.leadIds.push(lead.id);
        map.set(tag, entry);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.leadIds.length - a.leadIds.length);
  };

  // F7 — computa o relatório (top 5 por cidade/origem/tag) dos leads inseridos.
  const buildReport = (rows: { city?: string | null; origin?: string | null; tags?: string[] | null }[]): ImportReport => {
    const top = (counts: Record<string, number>) =>
      Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([label, count]) => ({ label, count }));
    const cityC: Record<string, number> = {};
    const originC: Record<string, number> = {};
    const tagC: Record<string, number> = {};
    for (const r of rows) {
      const city = (r.city ?? "").trim() || "(sem cidade)";
      cityC[city] = (cityC[city] ?? 0) + 1;
      const origin = (r.origin ?? "").trim() || "(sem origem)";
      originC[origin] = (originC[origin] ?? 0) + 1;
      for (const t of r.tags ?? []) tagC[t] = (tagC[t] ?? 0) + 1;
    }
    return { byCity: top(cityC), byOrigin: top(originC), byTag: top(tagC) };
  };

  const handleImport = async () => {
    if (!csvData || !column) return;
    if (!clientId) { toast.error("Sessão inválida. Faça login novamente."); return; }

    setImporting(true);

    // F1/F2 — id do batch (gerado no cliente). A coluna leads.import_batch_id
    // pode ainda não existir; nesse caso NÃO enviamos o campo (não quebra o insert).
    const batchId = crypto.randomUUID();
    const batchAvailable = await importsRepo.hasImportBatchColumn();

    // F6 — persiste o mapeamento pra reuso em arquivos com os mesmos cabeçalhos.
    saveImportMapping(csvData.headers, mapping);

    // Re-fetch das definitions DIRETO do banco (evita race se o usuário criou campo agora).
    let freshDefs: any[] | null = null;
    try {
      freshDefs = await leadsRepo.listCustomFieldDefinitions(clientId);
    } catch (defsError) {
      console.error("Erro ao carregar definições de campos:", defsError);
    }
    const activeDefs = freshDefs ?? customFieldDefs;

    const getValue = (row: string[], fieldKey: string): string | null => {
      const csvCol = mapping[fieldKey];
      if (!csvCol || csvCol === "__skip") return null;
      const idx = csvData.headers.indexOf(csvCol);
      return idx >= 0 && row[idx] ? row[idx] : null;
    };

    const tenantField =
      tenant?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenant.id)
        ? { tenant_id: tenant.id }
        : {};

    const buildTags = (row: string[]): string[] => {
      const tagsRaw = getValue(row, "tags");
      const tags = tagsRaw ? tagsRaw.split(";").map((t) => t.trim()).filter(Boolean) : [];
      // F11 — regras de tag automáticas (client-side, determinístico).
      if (applyRules && tagRules.length > 0) {
        const fields = {
          name: getValue(row, "name"),
          company: getValue(row, "company"),
          city: getValue(row, "city"),
          position: getValue(row, "position"),
          origin: getValue(row, "origin"),
          email: getValue(row, "email"),
        };
        for (const t of applyTagRules(fields, tagRules)) if (!tags.includes(t)) tags.push(t);
      }
      return tags;
    };

    const buildCustomFields = (row: string[]): Record<string, any> => {
      const custom_fields: Record<string, any> = {};
      for (const def of activeDefs) {
        const raw = getValue(row, `cf:${def.slug}`);
        if (raw === null || raw === "") continue;
        if (def.field_type === "number") {
          const n = Number(raw.replace(",", "."));
          if (!Number.isNaN(n)) custom_fields[def.slug] = n;
        } else if (def.field_type === "checkbox") {
          custom_fields[def.slug] = ["true", "1", "sim", "yes"].includes(raw.toLowerCase());
        } else if (def.field_type === "multi_select") {
          custom_fields[def.slug] = raw.split(";").map((s) => s.trim()).filter(Boolean);
        } else {
          custom_fields[def.slug] = raw;
        }
      }
      return custom_fields;
    };

    // F4 — modo de duplicata. "skip" mantém o comportamento leve (só telefone).
    // "update"/"merge" carregam o índice completo de leads existentes.
    const useUpsert = dupeMode !== "skip";
    const existingPhoneKeys = new Set<string>();
    let existingIndex: { byPhone: Map<string, importsRepo.ExistingLead>; byEmail: Map<string, importsRepo.ExistingLead> } | null = null;

    if (useUpsert) {
      try {
        existingIndex = await importsRepo.loadExistingLeadsIndex(clientId);
      } catch {
        existingIndex = { byPhone: new Map(), byEmail: new Map() };
      }
    } else {
      try {
        const PAGE = 1000;
        for (let page = 0; page < 60; page++) {
          const from = page * PAGE;
          const to = from + PAGE - 1;
          const data = await leadsRepo.listLeadPhonesPage(clientId, from, to);
          if (!data || data.length === 0) break;
          for (const r of data) if (r.phone) existingPhoneKeys.add(normalizePhoneKey(r.phone));
          if (data.length < PAGE) break;
        }
      } catch {
        leads.filter((l) => l.phone).forEach((l) => existingPhoneKeys.add(normalizePhoneKey(l.phone!)));
      }
    }

    const insertObjs: Record<string, unknown>[] = [];
    const updateOps: { id: string; patch: Record<string, unknown> }[] = [];
    let skippedNoName = 0;
    let skippedDuplicate = 0;
    const seenInFile = new Set<string>();

    for (const row of csvData.rows) {
      const name = getValue(row, "name");
      if (!name) { skippedNoName++; continue; }

      const phone = getValue(row, "phone");
      const email = getValue(row, "email");
      const pKey = phone ? normalizePhoneKey(phone) : "";
      const eKey = email ? email.trim().toLowerCase() : "";
      const fileKey = pKey || eKey;

      // Deduplica dentro do próprio arquivo.
      if (fileKey && seenInFile.has(fileKey)) { skippedDuplicate++; continue; }
      if (fileKey) seenInFile.add(fileKey);

      if (!useUpsert) {
        if (pKey && existingPhoneKeys.has(pKey)) { skippedDuplicate++; continue; }
        if (pKey) existingPhoneKeys.add(pKey);
        insertObjs.push({
          name,
          phone: phone || null,
          email: email || null,
          company: getValue(row, "company") || null,
          city: getValue(row, "city") || null,
          position: getValue(row, "position") || null,
          origin: getValue(row, "origin") || "Importação",
          tags: buildTags(row),
          column_id: column,
          client_id: clientId,
          custom_fields: buildCustomFields(row),
          ...(batchAvailable ? { import_batch_id: batchId } : {}),
          ...tenantField,
        });
        continue;
      }

      // update / merge
      const existing =
        (pKey && existingIndex!.byPhone.get(pKey)) ||
        (eKey && existingIndex!.byEmail.get(eKey)) ||
        null;

      if (existing && existing.id) {
        const tags = buildTags(row);
        const mergedTags = Array.from(new Set([...(existing.tags ?? []), ...tags]));
        const csvFields: Record<string, string | null> = {
          name,
          phone: phone || null,
          email: email || null,
          company: getValue(row, "company") || null,
          city: getValue(row, "city") || null,
          position: getValue(row, "position") || null,
          origin: getValue(row, "origin") || null,
        };
        const patch: Record<string, unknown> = {};
        if (dupeMode === "update") {
          // Sobrescreve os campos do sistema vindos do CSV (não mexe em column_id
          // nem em custom_fields, pra não apagar dados não mapeados).
          for (const [k, v] of Object.entries(csvFields)) if (v !== null) patch[k] = v;
        } else {
          // merge — só preenche o que está em branco no lead existente.
          const blank = (v: unknown) => v === null || v === undefined || v === "";
          for (const [k, v] of Object.entries(csvFields)) {
            if (v !== null && blank((existing as any)[k])) patch[k] = v;
          }
        }
        patch.tags = mergedTags;
        updateOps.push({ id: existing.id, patch });
      } else {
        if (pKey) existingIndex!.byPhone.set(pKey, { id: "", phone } as importsRepo.ExistingLead);
        if (eKey) existingIndex!.byEmail.set(eKey, { id: "", email } as importsRepo.ExistingLead);
        insertObjs.push({
          name,
          phone: phone || null,
          email: email || null,
          company: getValue(row, "company") || null,
          city: getValue(row, "city") || null,
          position: getValue(row, "position") || null,
          origin: getValue(row, "origin") || "Importação",
          tags: buildTags(row),
          column_id: column,
          client_id: clientId,
          custom_fields: buildCustomFields(row),
          ...(batchAvailable ? { import_batch_id: batchId } : {}),
          ...tenantField,
        });
      }
    }

    let inserted = 0;
    let updated = 0;
    let errors = 0;
    const insertedIds: string[] = [];
    const CHUNK = 500;

    for (let i = 0; i < insertObjs.length; i += CHUNK) {
      const chunk = insertObjs.slice(i, i + CHUNK);
      const chunkNum = Math.floor(i / CHUNK) + 1;
      const totalChunks = Math.ceil(insertObjs.length / CHUNK);

      setImportResult({ inserted, updated, skipped: skippedNoName + skippedDuplicate, skippedNoName, skippedDuplicate, errors });

      let retries = 0;
      const maxRetries = 3;
      let success = false;

      while (retries < maxRetries && !success) {
        try {
          const { error, ids } = await leadsRepo.insertLeadsChunk(chunk);
          if (error) {
            console.error(`Chunk ${chunkNum}/${totalChunks} error:`, error);
            errors += chunk.length;
            if (error.code === "408" || error.code === "429") {
              retries++;
              if (retries < maxRetries) {
                await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retries) * 1000));
                continue;
              }
            }
          } else {
            inserted += chunk.length;
            insertedIds.push(...ids);
            success = true;
          }
          break;
        } catch (err: any) {
          console.error(`Chunk ${chunkNum}/${totalChunks} exception:`, err);
          errors += chunk.length;
          retries++;
          if (retries < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retries) * 1000));
          }
        }
      }
    }

    // F4 — executa updates (em lotes pequenos pra não sobrecarregar).
    for (let i = 0; i < updateOps.length; i += 20) {
      const batch = updateOps.slice(i, i + 20);
      const results = await Promise.allSettled(
        batch.map((op) => leadsRepo.updateLead(op.id, op.patch)),
      );
      for (const r of results) {
        if (r.status === "fulfilled") updated++;
        else errors++;
      }
      setImportResult({ inserted, updated, skipped: skippedNoName + skippedDuplicate, skippedNoName, skippedDuplicate, errors });
    }

    if (inserted > 0 || updated > 0) await refreshData();

    const skipped = skippedNoName + skippedDuplicate;
    setImportResult({ inserted, updated, skipped, skippedNoName, skippedDuplicate, errors });
    setLastBatchId(batchAvailable ? batchId : "");

    // F1 — grava o histórico (best-effort).
    await importsRepo.insertImportLog({
      client_id: clientId,
      ...tenantField,
      user_id: user?.id ?? null,
      batch_id: batchId,
      filename: fileName || null,
      total_rows: csvData.rows.length,
      inserted,
      updated,
      skipped,
      skipped_no_name: skippedNoName,
      skipped_duplicate: skippedDuplicate,
      errors,
    });

    // F7 — relatório (a partir dos objetos inseridos).
    setReport(inserted > 0 ? buildReport(insertObjs as any) : null);

    // F10 — sugestões heurísticas (precisa da coluna de batch pra ter ids reais).
    if (inserted > 0 && batchAvailable) {
      try {
        const batchLeads = await importsRepo.listLeadsByBatch(batchId, clientId);
        setSuggestions(buildSuggestions(batchLeads as any));
        setSelectedSuggestions(new Set());
      } catch {
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }

    // F9 — enfileira os leads inseridos numa automação (opcional).
    if (automationId && insertedIds.length > 0) {
      const auto = complexAutomations.find((a) => a.id === automationId);
      const triggerNode = (auto?.nodes as any[] | undefined)?.find((n) => n?.type === "trigger");
      if (auto && triggerNode) {
        toast.info(`Enfileirando ${insertedIds.length} lead(s) na automação "${auto.name}"...`);
        // Chunks de 10 em paralelo: bounded (não estoura rate-limit) mas ~10x
        // mais rápido que o disparo 1-a-1 sequencial anterior.
        (async () => {
          const CHUNK = 10;
          for (let i = 0; i < insertedIds.length; i += CHUNK) {
            await Promise.all(
              insertedIds.slice(i, i + CHUNK).map((leadId) =>
                automationsRepo
                  .triggerAutomationEngine({
                    automation_id: auto.id,
                    lead_id: leadId,
                    node_id: triggerNode.id,
                    context: { source: "import", column_id: column },
                  })
                  .catch((e) => console.error("Falha ao enfileirar lead na automação:", e))
              )
            );
          }
        })();
      } else {
        toast.error("Automação selecionada não tem um gatilho válido.");
      }
    }

    if (errors > 0) {
      toast.error(
        `⚠️ Importação parcial: ${inserted} importados${updated ? `, ${updated} atualizados` : ""}, ${errors} erros, ${skipped} ignorados. Veja o console.`,
      );
    }

    setImporting(false);
    setStep(4);

    if ((inserted > 0 || updated > 0) && onComplete) {
      onComplete({ inserted, updated, skipped, skippedNoName, skippedDuplicate, errors });
    }
  };

  // F14 — exporta os leads deste batch como CSV (tela de resultado).
  const handleExportBatch = async () => {
    if (!lastBatchId || !clientId) return;
    setExporting(true);
    try {
      const rows = await importsRepo.listLeadsByBatch(lastBatchId, clientId);
      exportLeadsToCSV(rows as any, `importacao-${lastBatchId.slice(0, 8)}.csv`);
    } catch {
      toast.error("Falha ao exportar os leads da importação.");
    } finally {
      setExporting(false);
    }
  };

  // F10 — aplica as tags sugeridas selecionadas aos leads do batch.
  const handleApplySuggestedTags = async () => {
    const chosen = suggestions.filter((s) => selectedSuggestions.has(s.tag));
    if (chosen.length === 0) return;
    setApplyingTags(true);
    try {
      let applied = 0;
      for (const s of chosen) {
        await leadsRepo.bulkAddTag(s.leadIds, s.tag);
        applied += s.leadIds.length;
      }
      toast.success(`Tags aplicadas em ${applied} atribuição(ões) de lead.`);
      setSuggestions((prev) => prev.filter((s) => !selectedSuggestions.has(s.tag)));
      setSelectedSuggestions(new Set());
      await refreshData();
    } catch {
      toast.error("Falha ao aplicar as tags sugeridas.");
    } finally {
      setApplyingTags(false);
    }
  };

  const stepLabels = ["Upload", "Pipeline", "Mapeamento", "Confirmar"];
  const selectedPipeline = pipelines.find((p) => p.id === pipelineId);
  const selectedColumn = columns.find((c) => c.id === column);

  const body = (
      <div className={`animate-fade-in ${embedded ? "max-w-3xl mx-auto" : "p-6 max-w-3xl mx-auto"}`}>
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
          <>
          {!embedded && (
            <div className="flex justify-end mb-3">
              <a
                href="/import/history"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <History className="h-3.5 w-3.5" /> Histórico de importações
              </a>
            </div>
          )}
          <Tabs defaultValue="file">
            <TabsList className="mb-4">
              <TabsTrigger value="file" className="text-xs gap-1.5"><Upload className="h-3.5 w-3.5" /> Arquivo</TabsTrigger>
              <TabsTrigger value="sheets" className="text-xs gap-1.5"><Link2 className="h-3.5 w-3.5" /> Google Sheets</TabsTrigger>
            </TabsList>

            <TabsContent value="file">
              <div
                className={`bg-card border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-[hsl(var(--border-strong))]"}`}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  className="hidden"
                  onChange={handleInputChange}
                />
                <Upload className={`h-12 w-12 mx-auto mb-4 transition-colors ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
                <h3 className="text-sm font-semibold text-foreground mb-1">Arraste seu arquivo aqui</h3>
                <p className="text-xs text-muted-foreground mb-1">ou clique para selecionar um arquivo</p>
                <p className="text-[10px] text-muted-foreground mb-4">Aceita .csv, .xlsx e .xls</p>
                <Button variant="outline" size="sm" className="text-xs">Selecionar Arquivo</Button>
              </div>
              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={downloadTemplateCSV}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Baixar modelo de planilha (.csv)
                </button>
              </div>
            </TabsContent>

            <TabsContent value="sheets">
              <div className="bg-card ghost-border rounded-xl p-6 space-y-3">
                <Label className="text-xs">URL da planilha do Google Sheets</Label>
                <Input
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                  className="h-9 text-sm"
                />
                <p className="text-[10px] text-muted-foreground">
                  A planilha precisa estar compartilhada como <strong>"qualquer pessoa com o link pode ver"</strong>.
                  Usamos a primeira aba (ou o <code>gid</code> presente na URL).
                </p>
                <div className="flex justify-end">
                  <Button size="sm" className="text-xs gap-1.5" onClick={handleSheetImport} disabled={fetchingSheet || !sheetUrl.trim()}>
                    {fetchingSheet ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                    Importar planilha
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          </>
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
                <Select
                  value={pipelineId}
                  onValueChange={handlePipelineChange}
                  disabled={lockTarget}
                >
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
                <Select
                  value={column}
                  onValueChange={setColumn}
                  disabled={!pipelineId || lockTarget}
                >
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
            {lockTarget && (
              <p className="text-[10px] text-muted-foreground italic">
                Pipeline e etapa pré-definidos pelo contexto. Para mudar, abra a importação pelo menu principal.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" className="text-xs" onClick={clearFile}>Voltar</Button>
              <Button
                size="sm"
                className="text-xs bg-primary hover:bg-[#e04400] text-primary-foreground"
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
              <p className="text-[11px] text-muted-foreground">Associe as colunas da planilha aos campos do sistema</p>
            </div>

            {/* F6 — mapeamento salvo detectado */}
            {savedMappingUsed && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Wand2 className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs text-foreground flex-1">
                  Mapeamento salvo detectado — usando a configuração anterior desta planilha.
                </span>
                <button
                  type="button"
                  onClick={() => { clearImportMapping(csvData.headers); setSavedMappingUsed(false); toast.success("Mapeamento salvo removido. Ajuste manualmente."); }}
                  className="text-[11px] font-medium text-primary hover:underline shrink-0"
                >
                  Editar mapeamento
                </button>
              </div>
            )}

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

            {/* Custom fields section */}
            <div className="pt-2 border-t border-[hsl(var(--border-strong))]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Campos Personalizados</h4>
                  <Badge variant="outline" className="text-[9px]">{customFieldDefs.length}</Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 text-[11px]"
                  onClick={() => openCreateFieldFor()}
                >
                  <Plus className="h-3 w-3" /> Novo Campo
                </Button>
              </div>

              {customFieldDefs.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic py-2">
                  Nenhum campo personalizado. Crie um para mapear colunas extras da planilha (ex: CPF, Renda, Origem do Anúncio).
                </p>
              ) : (
                <div className="space-y-3">
                  {customFieldDefs.map((def) => (
                    <div key={def.id} className="flex items-center gap-3">
                      <div className="w-36 flex items-center gap-1.5 shrink-0">
                        <span className="text-sm text-foreground truncate">{def.name}</span>
                        <Badge variant="outline" className="text-[8px] px-1 py-0">{def.field_type}</Badge>
                      </div>
                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      <Select
                        value={mapping[`cf:${def.slug}`] ?? "__skip"}
                        onValueChange={(v) => setMapping((p) => ({ ...p, [`cf:${def.slug}`]: v }))}
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
              )}

              {/* Unmapped CSV headers - quick create */}
              {(() => {
                const usedHeaders = new Set(Object.values(mapping).filter((v) => v && v !== "__skip"));
                const unmapped = csvData.headers.filter((h) => !usedHeaders.has(h));
                if (unmapped.length === 0) return null;
                return (
                  <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-dashed border-border">
                    <p className="text-[11px] text-muted-foreground mb-2">
                      Colunas da planilha não mapeadas ({unmapped.length}). Crie campos personalizados para incluí-las:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {unmapped.map((h) => (
                        <button
                          key={h}
                          onClick={() => openCreateFieldFor(h)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-card border border-border hover:border-primary hover:text-primary transition-colors"
                        >
                          <Plus className="h-2.5 w-2.5" /> {h}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Opções de importação (F4 duplicatas, F11 regras de tag, F9 automação) */}
            <div className="pt-2 border-t border-[hsl(var(--border-strong))] space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Opções de importação</h4>

              <div className="space-y-1.5">
                <Label className="text-xs">Ao encontrar leads duplicados</Label>
                <Select value={dupeMode} onValueChange={(v) => setDupeMode(v as DuplicateMode)}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip" className="text-xs">Ignorar (pula o lead já existente)</SelectItem>
                    <SelectItem value="update" className="text-xs">Atualizar (sobrescreve com os dados da planilha)</SelectItem>
                    <SelectItem value="merge" className="text-xs">Merge (preenche só os campos em branco)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">Duplicata detectada por telefone ou email.</p>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Switch id="tagrules" checked={applyRules} onCheckedChange={setApplyRules} />
                  <Label htmlFor="tagrules" className="text-xs flex items-center gap-1">
                    Aplicar regras de tag automáticas
                    {tagRules.length > 0 && <Badge variant="outline" className="text-[9px]">{tagRules.length}</Badge>}
                  </Label>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => setShowTagRules(true)}>
                  <PencilLine className="h-3 w-3" /> Configurar regras
                </Button>
              </div>

              {activeAutomations.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-primary" /> Iniciar automação ao importar (opcional)
                  </Label>
                  <Select value={automationId || "__none"} onValueChange={(v) => setAutomationId(v === "__none" ? "" : v)}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none" className="text-xs">Nenhuma</SelectItem>
                      {activeAutomations.map((a) => (
                        <SelectItem key={a.id} value={a.id} className="text-xs">{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">Os leads inseridos serão enfileirados na automação escolhida.</p>
                </div>
              )}
            </div>

            {/* Preview */}
            <CSVPreview
              csvHeaders={csvData.headers}
              csvRows={csvData.rows}
              mapping={mapping}
              previewCount={3}
            />

            {/* F3 — preview de duplicatas antes de confirmar */}
            <div className="p-3 rounded-xl bg-muted/50 ghost-border space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0" /> Cheque quantos contatos já existem na base antes de importar.
                </span>
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={runDuplicateCheck} disabled={checkingDupes}>
                  {checkingDupes ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null} Checar duplicatas
                </Button>
              </div>
              {dupPreview.checked && (
                <p className="text-xs text-foreground">
                  <strong>{dupPreview.duplicates}</strong> de {dupPreview.total} já existem na base
                  {dupeMode === "skip"
                    ? " e serão ignorados."
                    : dupeMode === "update"
                      ? " e serão atualizados com os dados da planilha."
                      : " e terão os campos em branco preenchidos."}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setStep(2)}>Voltar</Button>
              <Button
                size="sm"
                className="text-xs bg-primary hover:bg-[#e04400] text-primary-foreground"
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
          <div className="bg-card ghost-border rounded-xl p-8 space-y-5">
            <div className="text-center space-y-2">
              <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
              <h3 className="text-lg font-semibold text-foreground">Importação Concluída!</h3>
              <p className="text-sm text-muted-foreground">
                Pipeline: <span className="font-medium text-foreground">{selectedPipeline?.name}</span>
                {" · "}
                Etapa: <span className="font-medium text-foreground">{selectedColumn?.name}</span>
              </p>
            </div>

            <div className={`grid gap-4 max-w-lg mx-auto ${importResult.updated > 0 ? "grid-cols-4" : "grid-cols-3"}`}>
              <div className="bg-success/10 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-success">{importResult.inserted}</p>
                <p className="text-[11px] text-muted-foreground">Importados</p>
              </div>
              {importResult.updated > 0 && (
                <div className="bg-primary/10 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-primary">{importResult.updated}</p>
                  <p className="text-[11px] text-muted-foreground">Atualizados</p>
                </div>
              )}
              <div className="bg-muted rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-foreground">{importResult.skipped}</p>
                <p className="text-[11px] text-muted-foreground">Ignorados</p>
              </div>
              <div className={`rounded-xl p-3 text-center ${importResult.errors > 0 ? "bg-destructive/10" : "bg-muted"}`}>
                <p className={`text-xl font-bold ${importResult.errors > 0 ? "text-destructive" : "text-foreground"}`}>
                  {importResult.errors}
                </p>
                <p className="text-[11px] text-muted-foreground">Erros</p>
              </div>
            </div>

            {importResult.skipped > 0 && (
              <div className="text-xs text-muted-foreground flex flex-col items-center gap-1">
                <p className="flex items-center gap-1">
                  <SkipForward className="h-3.5 w-3.5" />
                  {importResult.skipped} lead(s) ignorado(s):
                </p>
                <ul className="list-disc pl-5 text-left">
                  {importResult.skippedDuplicate > 0 && (
                    <li><strong>{importResult.skippedDuplicate}</strong> duplicado(s) (telefone/email já na base ou repetido no arquivo)</li>
                  )}
                  {importResult.skippedNoName > 0 && (
                    <li><strong>{importResult.skippedNoName}</strong> sem nome (campo "Nome" não mapeado ou vazio na planilha)</li>
                  )}
                </ul>
              </div>
            )}

            {/* F7 — relatório pós-importação */}
            {report && importResult.inserted > 0 && (
              <div className="border-t border-[hsl(var(--border-strong))] pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                {[
                  { title: "Por cidade", data: report.byCity },
                  { title: "Por origem", data: report.byOrigin },
                  { title: "Por tag", data: report.byTag },
                ].map(({ title, data }) => (
                  <div key={title} className="space-y-1.5">
                    <h5 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h5>
                    {data.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground italic">—</p>
                    ) : (
                      data.map((d) => {
                        const max = data[0]?.count || 1;
                        return (
                          <div key={d.label} className="space-y-0.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="truncate text-foreground">{d.label}</span>
                              <span className="text-muted-foreground shrink-0 ml-2">{d.count}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full bg-primary/60 rounded-full" style={{ width: `${(d.count / max) * 100}%` }} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* F10 — sugestões heurísticas de tag */}
            {suggestions.length > 0 && (
              <div className="border-t border-[hsl(var(--border-strong))] pt-4 space-y-2 text-left">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-primary" />
                  <h5 className="text-xs font-semibold text-foreground">Sugestões de tags <span className="font-normal text-muted-foreground">(heurística — revise antes de aplicar)</span></h5>
                </div>
                <div className="space-y-1.5">
                  {suggestions.map((s) => (
                    <label key={s.tag} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                      <Checkbox
                        checked={selectedSuggestions.has(s.tag)}
                        onCheckedChange={(checked) =>
                          setSelectedSuggestions((prev) => {
                            const next = new Set(prev);
                            if (checked) next.add(s.tag); else next.delete(s.tag);
                            return next;
                          })
                        }
                      />
                      <Badge variant="outline" className="text-[10px]">{s.tag}</Badge>
                      <span className="text-[11px] text-muted-foreground flex-1">{s.reason}</span>
                      <span className="text-[11px] text-muted-foreground shrink-0">{s.leadIds.length} lead(s)</span>
                    </label>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Button size="sm" className="text-xs gap-1.5" onClick={handleApplySuggestedTags} disabled={applyingTags || selectedSuggestions.size === 0}>
                    {applyingTags ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                    Aplicar tags selecionadas
                  </Button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-3 pt-2 border-t border-[hsl(var(--border-strong))]">
              <Button variant="outline" size="sm" className="text-xs" onClick={clearFile}>
                Nova Importação
              </Button>
              {lastBatchId && (
                <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={handleExportBatch} disabled={exporting}>
                  {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                  Exportar CSV
                </Button>
              )}
              {!embedded && (
                <Button variant="outline" size="sm" className="text-xs gap-1.5" asChild>
                  <a href="/import/history"><History className="h-3.5 w-3.5" /> Histórico</a>
                </Button>
              )}
              <Button size="sm" className="text-xs bg-primary hover:bg-[#e04400] text-primary-foreground" asChild>
                {/* Abre o CRM JÁ no funil onde os leads foram importados. */}
                <a href={pipelineId ? `/crm?pipeline=${pipelineId}` : "/crm"}>Ver no CRM</a>
              </Button>
            </div>
          </div>
        )}

        {/* F11 — configuração de regras de tag automáticas */}
        <TagRulesConfig
          open={showTagRules}
          onOpenChange={setShowTagRules}
          rules={tagRules}
          onChange={(next) => {
            setTagRules(next);
            if (clientId) {
              // persistência é feita dentro do componente; aqui só sincroniza estado.
            }
          }}
          clientId={clientId ?? ""}
        />

        {/* Create custom field modal */}
        <Dialog open={showCreateField} onOpenChange={setShowCreateField}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>Criar Campo Personalizado</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome do Campo *</Label>
                <Input
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="Ex: CPF, Renda Mensal, Aniversário"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select
                  value={newFieldType}
                  onValueChange={(v) => {
                    setNewFieldType(v as CustomFieldType);
                    setTypeWasSuggested(false);
                  }}
                >
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Texto</SelectItem>
                    <SelectItem value="textarea">Texto longo</SelectItem>
                    <SelectItem value="number">Número</SelectItem>
                    <SelectItem value="date">Data</SelectItem>
                    <SelectItem value="datetime">Data e hora</SelectItem>
                    <SelectItem value="checkbox">Checkbox (sim/não)</SelectItem>
                    <SelectItem value="link">Link</SelectItem>
                    <SelectItem value="select">Lista (seleção única)</SelectItem>
                    <SelectItem value="multi_select">Múltipla escolha (separadas por ;)</SelectItem>
                  </SelectContent>
                </Select>
                {typeWasSuggested && (
                  <p className="text-[10px] text-primary flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5" />
                    Tipo sugerido com base nos valores da planilha. Ajuste se necessário.
                  </p>
                )}
              </div>
              {newFieldType === "select" && newFieldOptions.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground">
                    Opções detectadas ({newFieldOptions.length})
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    {newFieldOptions.map((opt) => (
                      <Badge key={opt.value} variant="outline" className="text-[10px]">
                        {opt.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {csvData && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Vincular à coluna da planilha (opcional)</Label>
                  <Select value={newFieldHeader || "__none"} onValueChange={(v) => setNewFieldHeader(v === "__none" ? "" : v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Selecione uma coluna" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">— Sem vínculo —</SelectItem>
                      {csvData.headers.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    Esse campo aparecerá no perfil dos leads após a importação.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setShowCreateField(false)} disabled={creatingField}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleCreateField} disabled={creatingField || !newFieldName.trim()}>
                {creatingField ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Criando...</> : "Criar Campo"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );

  if (embedded) return body;
  return (
    <AppLayout title="Importação de Leads" subtitle="Importe sua base de contatos via CSV ou Excel">
      <div className="p-6">{body}</div>
    </AppLayout>
  );
}
