import { useCallback, useEffect, useState } from "react";
import { Shield, Trash2, RefreshCw, Phone, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import * as integrationsRepo from "@/services/integrations";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface CloudInstance {
  id: string;
  status: string;
  created_at: string;
  config: {
    phone_number_id: string;
    business_account_id: string;
    display_phone_number?: string;
    display_name?: string;
  };
}

export function CloudInstanceList({ refreshKey }: { refreshKey?: number }) {
  const [instances, setInstances] = useState<CloudInstance[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-cloud-proxy?action=list-instances");
      if (error) throw new Error(error.message);
      setInstances((data?.instances ?? []) as CloudInstance[]);
    } catch (err: any) {
      console.error("Failed to list cloud instances:", err);
      setInstances([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const deleteInstance = async (id: string, name: string) => {
    try {
      const { error } = await supabase.functions.invoke(
        `whatsapp-cloud-proxy?action=delete-instance&integration_id=${id}`,
      );
      if (error) throw new Error(error.message);
      toast.success(`Instância "${name}" removida do uPixel.`);
      load();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  // Toggle ativar/desativar: alterna status entre 'connected' e 'paused'.
  // O webhook ignora mensagens quando status='paused' (preserva credenciais,
  // só pausa o processamento — pra desconectar de verdade, usar "Remover").
  const toggleInstance = async (id: string, currentStatus: string, name: string) => {
    const newStatus = currentStatus === "connected" ? "paused" : "connected";
    setInstances((prev) => prev.map((i) => i.id === id ? { ...i, status: newStatus } : i));
    try {
      await integrationsRepo.updateIntegration(id, { status: newStatus });
      toast.success(`"${name}" ${newStatus === "connected" ? "ativada" : "pausada"}.`);
    } catch (err: any) {
      setInstances((prev) => prev.map((i) => i.id === id ? { ...i, status: currentStatus } : i));
      toast.error(`Erro ao alterar status: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (instances.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-success" /> WhatsApp Cloud API (Meta Oficial)
        </h3>
        <Button variant="ghost" size="sm" onClick={load} className="h-7 px-2 text-xs gap-1">
          <RefreshCw className="h-3 w-3" /> Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {instances.map((inst) => {
          const display = inst.config.display_name || inst.config.display_phone_number || "WhatsApp Cloud";
          return (
            <div key={inst.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold truncate">{display}</p>
                    <Badge
                      variant="outline"
                      className={`text-[9px] gap-1 ${
                        inst.status === "connected"
                          ? "border-success/40 text-success"
                          : "border-muted-foreground/40 text-muted-foreground"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          inst.status === "connected" ? "bg-success animate-pulse" : "bg-muted-foreground"
                        }`}
                      />
                      {inst.status === "connected" ? "Conectado" : inst.status === "paused" ? "Pausado" : inst.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {inst.config.display_phone_number || `Phone ID: ${inst.config.phone_number_id.slice(0, 12)}…`}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70">Meta Cloud API · sem Evolution</p>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={inst.status === "connected"}
                    onCheckedChange={() => toggleInstance(inst.id, inst.status, display)}
                    aria-label={inst.status === "connected" ? "Pausar instância" : "Ativar instância"}
                  />
                  <span className="text-[11px] text-muted-foreground">
                    {inst.status === "connected" ? "Ativo" : "Pausado"}
                  </span>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive">
                      <Trash2 className="h-3 w-3 mr-1" /> Remover
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover {display}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Apenas remove a integração do uPixel. A conta na Meta segue ativa — pra desconectar de verdade
                        você precisa fazer no <strong>Meta Business Suite</strong>.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteInstance(inst.id, display)}>
                        Remover
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
