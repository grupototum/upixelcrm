import { useState, useRef, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Upload, FileSpreadsheet, ArrowRight, CheckCircle2, X, AlertCircle, Table } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ComingSoonBadge } from "@/components/ui/coming-soon";
import { mockColumns } from "@/lib/mock-data";
import { toast } from "sonner";

const systemFields = [
  { key: "name", label: "Nome", required: true },
  { key: "phone", label: "Telefone", required: false },
  { key: "email", label: "Email", required: false },
  { key: "company", label: "Empresa", required: false },
  { key: "city", label: "Cidade", required: false },
  { key: "position", label: "Cargo", required: false },
  { key: "origin", label: "Origem", required: false },
  { key: "tags", label: "Tags", required: false },
];

// Simulated CSV parse
const mockCsvHeaders = ["nome_completo", "telefone", "email_contato", "empresa", "cidade", "cargo"];
const mockCsvRows = [
  ["Ana Paula", "+5511999990001", "ana@corp.com", "TechCo", "São Paulo", "CEO"],
  ["Bruno Lima", "+5521888880002", "bruno@startup.io", "StartupX", "Rio de Janeiro", "CTO"],
  ["Carla Souza", "+5531777770003", "carla@agencia.com", "Agência Max", "BH", "Diretora"],
  ["Diego Reis", "+5541666660004", "diego@digital.com", "Digital First", "Curitiba", "Gerente"],
  ["Elena Costa", "+5551555550005", "elena@saas.com", "SaaSPro", "Porto Alegre", "COO"],
];

export default function ImportPage() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<{ name: string; rows: number } | null>(null);
  const [pipeline, setPipeline] = useState("Vendas Principal");
  const [column, setColumn] = useState(mockColumns[0]?.id ?? "");
  const [mapping, setMapping] = useState<Record<string, string>>({
    name: "nome_completo", phone: "telefone", email: "email_contato",
    company: "empresa", city: "cidade", position: "cargo",
  });
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(() => {
    setFile({ name: "leads_importacao.csv", rows: mockCsvRows.length });
    setStep(2);
    toast.success("Arquivo carregado com sucesso.");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFile();
  }, [handleFile]);

  const clearFile = () => { setFile(null); setStep(1); };

  const stepLabels = ["Upload", "Pipeline", "Mapeamento", "Confirmar"];

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
            <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
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

            {file && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted">
                <FileSpreadsheet className="h-5 w-5 text-success" />
                <span className="text-sm font-medium text-foreground">{file.name}</span>
                <Badge variant="outline" className="text-[10px] ml-auto">{file.rows} leads</Badge>
                <button onClick={clearFile} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Pipeline</Label>
                <Select value={pipeline} onValueChange={setPipeline}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Vendas Principal">Vendas Principal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Etapa Inicial</Label>
                <Select value={column} onValueChange={setColumn}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {mockColumns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" className="text-xs" onClick={clearFile}>Voltar</Button>
              <Button size="sm" className="text-xs bg-primary hover:bg-primary-hover text-primary-foreground" onClick={() => setStep(3)}>Continuar</Button>
            </div>
          </div>
        )}

        {/* Step 3: Mapping */}
        {step === 3 && (
          <div className="bg-card ghost-border rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Mapeamento de Colunas</h3>
              <p className="text-[11px] text-muted-foreground">Associe as colunas do CSV aos campos do sistema</p>
            </div>

            <div className="space-y-3">
              {systemFields.map((field) => (
                <div key={field.key} className="flex items-center gap-3">
                  <div className="w-28 flex items-center gap-1.5">
                    <span className="text-sm text-foreground">{field.label}</span>
                    {field.required && <span className="text-[10px] text-destructive">*</span>}
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  <Select value={mapping[field.key] ?? "__skip"} onValueChange={(v) => setMapping(p => ({ ...p, [field.key]: v }))}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__skip">— Ignorar —</SelectItem>
                      {mockCsvHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Preview */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Table className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Preview dos dados</span>
              </div>
              <div className="ghost-border rounded-xl overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted">
                      {mockCsvHeaders.map(h => <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {mockCsvRows.slice(0, 3).map((row, i) => (
                      <tr key={i} className="hover:bg-card-hover">
                        {row.map((cell, j) => <td key={j} className="px-3 py-2 text-foreground">{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Mostrando 3 de {file?.rows ?? mockCsvRows.length} registros</p>
            </div>

            {/* Dedup coming soon */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 ghost-border">
              <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground flex-1">Deduplicação inteligente e parsing avançado</span>
              <ComingSoonBadge />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setStep(2)}>Voltar</Button>
              <Button
                size="sm" className="text-xs bg-primary hover:bg-primary-hover text-primary-foreground"
                onClick={() => {
                  if (!mapping.name || mapping.name === "__skip") { toast.error("O campo Nome é obrigatório."); return; }
                  setStep(4);
                }}
              >
                Importar Leads
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="bg-card ghost-border rounded-xl p-12 text-center">
            <CheckCircle2 className="h-16 w-16 text-success mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">Importação Concluída!</h3>
            <p className="text-sm text-muted-foreground mb-1">
              {file?.rows ?? mockCsvRows.length} leads foram importados com sucesso.
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              Pipeline: <span className="font-medium text-foreground">{pipeline}</span> · Etapa: <span className="font-medium text-foreground">{mockColumns.find(c => c.id === column)?.name}</span>
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => { clearFile(); setStep(1); }}>Nova Importação</Button>
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
