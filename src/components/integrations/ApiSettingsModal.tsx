import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, Copy, AlertCircle, Trash2, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { ApiKey } from "@/types";

// Mock data init
const initialKeys: ApiKey[] = [
  { id: "ak1", client_id: "c1", name: "Integração ERP", token_preview: "sk_live_...9a8f", last_used_at: "2026-03-27T10:00:00Z", created_at: "2026-01-10T14:00:00Z", active: true },
  { id: "ak2", client_id: "c1", name: "Typeform Leads", token_preview: "sk_live_...2b1c", created_at: "2026-02-15T09:30:00Z", active: false },
];

export function ApiSettingsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);

  const generateToken = () => {
    if (!newKeyName.trim()) {
      toast.error("Informe um nome para a chave.");
      return;
    }
    const token = "sk_live_" + Array.from({ length: 32 }, () => Math.random().toString(36)[2] || '0').join('');
    const preview = token.slice(0, 12) + "..." + token.slice(-4);
    
    const newKey: ApiKey = {
      id: "ak" + Date.now(),
      client_id: "c1",
      name: newKeyName,
      token_preview: preview,
      created_at: new Date().toISOString(),
      active: true,
    };

    setKeys([...keys, newKey]);
    setGeneratedToken(token);
    setNewKeyName("");
    toast.success("Chave de API gerada com sucesso!");
  };

  const copyToClipboard = () => {
    if (generatedToken) {
      navigator.clipboard.writeText(generatedToken);
      toast.success("Copiado para a área de transferência!");
    }
  };

  const revokeKey = (id: string) => {
    setKeys(keys.map(k => k.id === id ? { ...k, active: false } : k));
    toast.info("Chave revogada.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" /> Configurações de API REST
          </DialogTitle>
          <DialogDescription>
            Gerencie as chaves de API secretas para conectar sistemas externos.
          </DialogDescription>
        </DialogHeader>

        {generatedToken && (
          <div className="bg-success/10 border border-success/30 rounded-lg p-4 my-2">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-success mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Sua nova chave de API</p>
                <p className="text-xs text-muted-foreground mt-1 mb-3">Copy e salve esta chave agora. Por segurança, você não poderá vê-la novamente.</p>
                <div className="flex items-center gap-2 bg-background border border-border rounded-md p-1.5 pl-3">
                  <code className="text-xs text-foreground flex-1 break-all">{generatedToken}</code>
                  <Button variant="secondary" size="icon" onClick={copyToClipboard} className="h-7 w-7 shrink-0">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button size="sm" onClick={() => setGeneratedToken(null)}>Entendi, já anotei</Button>
            </div>
          </div>
        )}

        {!generatedToken && (
          <>
            <div className="bg-secondary/30 border border-border rounded-lg p-4 mb-2 flex items-end gap-3">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs font-semibold">Nova chave de API</Label>
                <Input 
                  placeholder="Ex: Integração ERP Financeiro" 
                  value={newKeyName} 
                  onChange={(e) => setNewKeyName(e.target.value)} 
                  maxLength={50}
                />
              </div>
              <Button onClick={generateToken} disabled={!newKeyName.trim()}>Criar chave secreta</Button>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Chaves Ativas ({keys.filter(k => k.active).length})</h3>
              <div className="divide-y divide-border border border-border rounded-lg overflow-hidden flex flex-col max-h-60 overflow-y-auto">
                {keys.filter(k => k.active).length === 0 ? (
                  <p className="p-4 text-xs text-muted-foreground text-center bg-card">Nenhuma chave ativa encontrada.</p>
                ) : (
                  keys.map((key) => (
                    <div key={key.id} className="flex items-center justify-between p-3 bg-card hover:bg-card-hover transition-colors">
                      <div>
                        <p className="text-sm font-medium text-foreground">{key.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <code className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{key.token_preview}</code>
                          {key.last_used_at && <span className="text-[10px] text-muted-foreground">Último uso: {new Date(key.last_used_at).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      {key.active && (
                        <Button variant="ghost" size="sm" onClick={() => revokeKey(key.id)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="h-4 w-4 mr-1" /> Revogar
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
