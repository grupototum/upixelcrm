import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Merge, AlertTriangle } from "lucide-react";
import { useAppState } from "@/contexts/AppContext";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface MergeLeadsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceLead: { id: string; name: string } | null;
  onMerge: (sourceId: string, targetId: string) => Promise<void>;
}

export function MergeLeadsModal({ open, onOpenChange, sourceLead, onMerge }: MergeLeadsModalProps) {
  const { leads } = useAppState();
  const [search, setSearch] = useState("");
  const [targetId, setTargetId] = useState("");
  const [loading, setLoading] = useState(false);

  const filteredLeads = leads
    .filter(l => l.id !== sourceLead?.id)
    .filter(l => l.name.toLowerCase().includes(search.toLowerCase()) || (l.phone || "").includes(search))
    .slice(0, 5);

  const handleMerge = async () => {
    if (!sourceLead || !targetId) return;
    
    setLoading(true);
    try {
      await onMerge(sourceLead.id, targetId);
      onOpenChange(false);
      setTargetId("");
      setSearch("");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border-none shadow-2xl bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Merge className="h-5 w-5 text-primary" /> Mesclar Perfis
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 leading-relaxed">
              Esta ação moverá todas as conversas, tarefas e notas de <strong>{sourceLead?.name}</strong> para o perfil de destino selecionado e excluirá o perfil original. Esta ação não pode ser desfeita.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Perfil de Destino (Manter)</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nome ou telefone..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-11 rounded-xl bg-secondary/30 border-none"
              />
            </div>
            
            <div className="mt-3 space-y-1.5">
              {filteredLeads.map(lead => (
                <button
                  key={lead.id}
                  onClick={() => setTargetId(lead.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                    targetId === lead.id 
                      ? "bg-primary/10 border-primary text-primary shadow-sm" 
                      : "bg-background border-border/50 hover:border-primary/30"
                  }`}
                >
                  <div className="text-left">
                    <p className="text-xs font-bold">{lead.name}</p>
                    <p className="text-[10px] text-muted-foreground">{lead.phone || "Sem telefone"}</p>
                  </div>
                  {targetId === lead.id && <div className="h-2 w-2 rounded-full bg-primary" />}
                </button>
              ))}
              {search && filteredLeads.length === 0 && (
                <p className="text-center py-4 text-xs text-muted-foreground italic">Nenhum perfil encontrado.</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">Cancelar</Button>
          <Button 
            onClick={handleMerge} 
            disabled={!targetId || loading} 
            className="rounded-xl bg-primary hover:bg-primary-hover px-8 gap-2 shadow-lg shadow-primary/20"
          >
            {loading ? "Mesclando..." : "Mesclar Agora"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
