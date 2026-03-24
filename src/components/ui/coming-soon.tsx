import { ReactNode } from "react";
import { Lock } from "lucide-react";

export function ComingSoonBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent/20 text-accent">
      <Lock className="h-3 w-3" />
      Em breve
    </span>
  );
}

export function ComingSoonOverlay({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className="relative">
      <div className="opacity-50 pointer-events-none select-none">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px] rounded-lg">
        <div className="flex flex-col items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
            <Lock className="h-5 w-5 text-accent" />
          </div>
          <span className="text-sm font-semibold text-foreground">{label || "Em breve"}</span>
          <span className="text-xs text-muted-foreground">Disponível na próxima versão</span>
        </div>
      </div>
    </div>
  );
}
