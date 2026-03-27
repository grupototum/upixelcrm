import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AutomationCanvas } from "@/components/automations/canvas/AutomationCanvas";
import { ReactFlowProvider, useReactFlow } from "reactflow";
import { useAppState } from "@/contexts/AppContext";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function BuilderHeader({ id }: { id: string }) {
  const navigate = useNavigate();
  const { complexAutomations, updateAutomationNodes } = useAppState();
  const { getNodes, getEdges } = useReactFlow();
  const [isSaving, setIsSaving] = useState(false);

  const auto = complexAutomations.find((a) => a.id === id);

  const handleSave = async () => {
    if (!auto) return;
    setIsSaving(true);
    try {
      await updateAutomationNodes(id, getNodes(), getEdges());
    } finally {
      setIsSaving(false);
    }
  };

  if (!auto && id !== "novo") return null;

  return (
      <header className="h-16 shrink-0 bg-card border-b border-border px-4 flex items-center justify-between z-20 shadow-sm relative">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/automations?tab=complex")}
            className="text-muted-foreground hover:bg-secondary"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-foreground">{auto?.name || "Novo Fluxo"}</h1>
              <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-medium">
                {auto?.status === 'active' ? 'Ativo' : 'Edição'}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              ID: {id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="h-8 gap-2">
            <Play className="h-3.5 w-3.5" />
            Testar Fluxo
          </Button>
          <Button size="sm" className="h-8 gap-2" onClick={handleSave} disabled={isSaving || !auto}>
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Salvar e Publicar
          </Button>
        </div>
      </header>
  );
}

export default function AutomationBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <ReactFlowProvider>
      <div className="w-full h-screen flex flex-col bg-background overflow-hidden">
        <BuilderHeader id={id!} />

        <div className="flex-1 w-full bg-secondary relative">
          <AutomationCanvas automationId={id!} />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
