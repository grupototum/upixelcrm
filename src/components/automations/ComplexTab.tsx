import { AutomationCanvas } from "./canvas/AutomationCanvas";

export function ComplexTab() {
  return (
    <div className="bg-card ghost-border rounded-xl shadow-card overflow-hidden">
      <div className="flex flex-col h-[calc(100vh-220px)] min-h-[600px]">
        {/* Header / Instructions */}
        <div className="px-6 py-4 border-b bg-card shrink-0 flex items-center justify-between z-10">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Automações Avançadas (Visual Builder)</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Crie fluxos condicionais e integrações arrastando e soltando módulos.
            </p>
          </div>
        </div>

        {/* The Canvas itself */}
        <div className="flex-1 relative">
          <AutomationCanvas />
        </div>
      </div>
    </div>
  );
}
