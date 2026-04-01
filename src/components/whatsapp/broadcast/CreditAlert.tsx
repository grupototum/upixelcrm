import { AlertTriangle, Plus, LayoutPanelTop, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CreditAlert() {
  return (
    <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-5 space-y-4 shadow-sm animate-in fade-in duration-500">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 min-w-10 rounded-full bg-destructive/20 flex items-center justify-center">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-destructive flex items-center gap-1.5">
             ⚠️ Você não tem créditos suficientes!
          </h3>
          <p className="text-xs text-destructive/80 font-medium leading-tight">
            Responder agora custa 1 crédito (R$ 0,50)
          </p>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 pt-1">
        <Button size="sm" className="h-8 bg-destructive hover:bg-destructive/90 text-white text-[11px] gap-1.5 font-bold">
          <Plus className="h-3 w-3" /> COMPRAR CRÉDITOS
        </Button>
        <Button size="sm" variant="outline" className="h-8 border-destructive/30 text-destructive hover:bg-destructive/5 text-[11px] gap-1.5 font-bold">
          <LayoutPanelTop className="h-3 w-3" /> VER PLANOS
        </Button>
      </div>

      <div className="bg-success/10 rounded-lg p-3 flex items-center gap-2 border border-success/20">
        <Lightbulb className="h-4 w-4 text-success" />
        <p className="text-[10px] text-success font-semibold italic">
          💡 Dica: Responder dentro de 24h é GRÁTIS!
        </p>
      </div>
    </div>
  );
}
