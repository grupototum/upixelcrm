import { AlertCircle, Clipboard, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useShadowSdr } from "@/hooks/useShadowSdr";
import type { ShadowSdrConversationInput, ShadowSdrTemperature } from "@/types/shadow-sdr";

interface ShadowSdrPanelProps {
  input: ShadowSdrConversationInput | null;
}

const temperatureLabels: Record<ShadowSdrTemperature, string> = {
  frio: "Frio",
  morno: "Morno",
  quente: "Quente",
};

const temperatureClasses: Record<ShadowSdrTemperature, string> = {
  frio: "bg-slate-500/15 text-slate-600 border-slate-500/20",
  morno: "bg-amber-500/15 text-amber-600 border-amber-500/20",
  quente: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
};

function SmallList({ items }: { items: string[] }) {
  if (!items.length) return <p className="text-[10px] text-muted-foreground">Sem itens identificados.</p>;

  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item} className="text-[10px] leading-snug text-foreground/80">
          - {item}
        </li>
      ))}
    </ul>
  );
}

export function ShadowSdrPanel({ input }: ShadowSdrPanelProps) {
  const { analysis, loading, error, analyze } = useShadowSdr(input);

  const copyReply = async () => {
    if (!analysis?.suggestedReply) return;
    await navigator.clipboard.writeText(analysis.suggestedReply);
    toast.success("Rascunho copiado. Revise antes de enviar.");
  };

  return (
    <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5" /> SDR sombra
          </p>
          <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
            Sugestao interna. Nada sera enviado, movido ou salvo automaticamente.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 shrink-0 gap-1.5 rounded-xl text-[10px] font-bold"
          onClick={analyze}
          disabled={loading || !input}
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          {analysis ? "Regenerar" : "Gerar"}
        </Button>
      </div>

      {error && (
        <div className="flex gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-2 text-[10px] text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!analysis && !loading && (
        <div className="rounded-lg border border-dashed border-primary/20 bg-background/60 p-3 text-center">
          <p className="text-[10px] text-muted-foreground">
            Gere uma leitura SDR para resumo, temperatura, SPIN, BANT e rascunho copiavel.
          </p>
        </div>
      )}

      {analysis && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={`border text-[9px] font-black uppercase ${temperatureClasses[analysis.classification.temperature]}`}>
              {temperatureLabels[analysis.classification.temperature]}
            </Badge>
            <span className="text-[10px] font-bold text-muted-foreground">
              {Math.round(analysis.classification.confidence * 100)}% confianca
            </span>
            <span className="text-[9px] uppercase text-muted-foreground">fonte: {analysis.source}</span>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Resumo</p>
            <p className="text-[11px] leading-snug text-foreground/90">{analysis.summary}</p>
            <p className="text-[10px] leading-snug text-muted-foreground">{analysis.classification.reason}</p>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Proxima acao</p>
            <p className="text-[11px] leading-snug text-foreground/90">{analysis.nextAction}</p>
          </div>

          <div className="space-y-2 rounded-lg border border-[hsl(var(--border-strong))] bg-background p-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Resposta sugerida</p>
              <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-[10px]" onClick={copyReply}>
                <Clipboard className="h-3 w-3" /> Copiar
              </Button>
            </div>
            <p className="whitespace-pre-wrap text-[11px] leading-snug text-foreground">{analysis.suggestedReply}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1 rounded-lg bg-background/70 p-2">
              <p className="text-[9px] font-black uppercase text-muted-foreground">SPIN S/P</p>
              <SmallList items={[...analysis.spin.situation.slice(0, 1), ...analysis.spin.problem.slice(0, 1)]} />
            </div>
            <div className="space-y-1 rounded-lg bg-background/70 p-2">
              <p className="text-[9px] font-black uppercase text-muted-foreground">SPIN I/N</p>
              <SmallList items={[...analysis.spin.implication.slice(0, 1), ...analysis.spin.needPayoff.slice(0, 1)]} />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">BANT</p>
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <span><strong>Budget:</strong> {analysis.bant.budget}</span>
              <span><strong>Authority:</strong> {analysis.bant.authority}</span>
              <span><strong>Need:</strong> {analysis.bant.need}</span>
              <span><strong>Timeline:</strong> {analysis.bant.timeline}</span>
            </div>
          </div>

          {(analysis.missingInfo.length > 0 || analysis.risks.length > 0) && (
            <div className="space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Validar antes de usar</p>
              <SmallList items={[...analysis.missingInfo, ...analysis.risks]} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
