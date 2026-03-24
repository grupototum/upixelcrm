import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Upload, FileSpreadsheet, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockColumns } from "@/lib/mock-data";

export default function ImportPage() {
  const [step, setStep] = useState(1);

  return (
    <AppLayout title="Importação de Leads" subtitle="Importe sua base de contatos">
      <div className="p-6 animate-fade-in max-w-2xl mx-auto">
        {/* Steps */}
        <div className="flex items-center gap-2 mb-8">
          {["Upload", "Pipeline", "Mapeamento", "Confirmar"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold ${step > i + 1 ? "bg-success text-success-foreground" : step === i + 1 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                {step > i + 1 ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-xs font-medium ${step === i + 1 ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
              {i < 3 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="bg-card border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary transition-colors cursor-pointer" onClick={() => setStep(2)}>
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-sm font-semibold text-foreground mb-1">Arraste seu arquivo CSV aqui</h3>
            <p className="text-xs text-muted-foreground mb-4">ou clique para selecionar</p>
            <Button variant="outline" size="sm" className="text-xs">Selecionar Arquivo</Button>
          </div>
        )}

        {step === 2 && (
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Selecione o Pipeline e Etapa</h3>
            <div className="flex items-center gap-2 p-3 rounded-md bg-secondary">
              <FileSpreadsheet className="h-5 w-5 text-success" />
              <span className="text-sm text-foreground">leads_importacao.csv</span>
              <span className="text-xs text-muted-foreground ml-auto">142 linhas</span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Pipeline</label>
                <select className="w-full bg-secondary text-foreground text-sm rounded-md px-3 py-2 border-0 outline-none focus:ring-1 focus:ring-primary">
                  <option>Vendas Principal</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Etapa Inicial</label>
                <select className="w-full bg-secondary text-foreground text-sm rounded-md px-3 py-2 border-0 outline-none focus:ring-1 focus:ring-primary">
                  {mockColumns.map((c) => <option key={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setStep(1)}>Voltar</Button>
              <Button size="sm" className="text-xs bg-primary hover:bg-primary-hover text-primary-foreground" onClick={() => setStep(3)}>Continuar</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Mapeamento de Colunas</h3>
            <div className="space-y-3">
              {["Nome", "Telefone", "Email", "Empresa", "Cidade"].map((field) => (
                <div key={field} className="flex items-center gap-3">
                  <span className="text-sm text-foreground w-24">{field}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <select className="flex-1 bg-secondary text-foreground text-sm rounded-md px-3 py-2 border-0 outline-none focus:ring-1 focus:ring-primary">
                    <option>{field.toLowerCase()}</option>
                    <option>campo_1</option>
                    <option>campo_2</option>
                  </select>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setStep(2)}>Voltar</Button>
              <Button size="sm" className="text-xs bg-primary hover:bg-primary-hover text-primary-foreground" onClick={() => setStep(4)}>Importar</Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <CheckCircle2 className="h-16 w-16 text-success mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">Importação Concluída!</h3>
            <p className="text-sm text-muted-foreground mb-4">142 leads foram importados com sucesso para o pipeline Vendas Principal.</p>
            <Button size="sm" className="text-xs bg-primary hover:bg-primary-hover text-primary-foreground" onClick={() => setStep(1)}>Nova Importação</Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
