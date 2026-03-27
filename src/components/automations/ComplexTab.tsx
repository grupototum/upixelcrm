import { Zap, Cog, MessageSquare, GitBranch } from "lucide-react";
import { ComingSoonBadge } from "@/components/ui/coming-soon";

export function ComplexTab() {
  return (
    <div className="bg-card ghost-border rounded-xl overflow-hidden">
      <div className="h-96 relative bg-secondary/30 flex flex-col items-center justify-center">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(circle, hsl(var(--muted-foreground) / 0.3) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative z-10 text-center">
          <div className="h-14 w-14 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <GitBranch className="h-7 w-7 text-accent" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">Automações Complexas</h3>
          <p className="text-xs text-muted-foreground mb-4 max-w-xs">
            Canvas visual com nodes e conexões para criar fluxos avançados estilo n8n.
          </p>
          <ComingSoonBadge />
        </div>

        {/* Decorative nodes */}
        <div className="absolute top-12 left-16 h-10 w-28 bg-card ghost-border rounded-xl flex items-center gap-2 px-3 opacity-40">
          <Zap className="h-3 w-3 text-success" />
          <span className="text-[10px] text-foreground">Gatilho</span>
        </div>
        <div className="absolute top-32 left-56 h-10 w-28 bg-card ghost-border rounded-xl flex items-center gap-2 px-3 opacity-40">
          <Cog className="h-3 w-3 text-primary" />
          <span className="text-[10px] text-foreground">Ação</span>
        </div>
        <div className="absolute bottom-20 right-24 h-10 w-28 bg-card ghost-border rounded-xl flex items-center gap-2 px-3 opacity-40">
          <MessageSquare className="h-3 w-3 text-accent" />
          <span className="text-[10px] text-foreground">Mensagem</span>
        </div>
      </div>
    </div>
  );
}
