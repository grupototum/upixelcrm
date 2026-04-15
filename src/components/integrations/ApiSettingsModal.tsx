import { logger } from "@/lib/logger";
import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, Copy, Trash2, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateSecureToken, hashToken } from "@/lib/crypto";
import type { ApiKey } from "@/types";

export function ApiSettingsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("api_keys").select("*").order("created_at", { ascending: false });
    if (error) {
      logger.error(error);
      toast.error("Erro ao carregar chaves de API");
    } else {
      setKeys(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) fetchKeys();
  }, [open, fetchKeys]);

  const generateToken = async () => {
    if (!newKeyName.trim()) {
      toast.error("Informe um nome para a chave.");
      return;
    }

    // FIX-02: Use crypto.getRandomValues() for cryptographically secure token generation.
    // FIX-03: Hash the token with SHA-256 before storing — btoa() is reversible Base64,
    // not a hash, and would expose plaintext tokens on a database breach.
    const token = generateSecureToken("sk_live_", 32);
    const preview = token.slice(0, 12) + "..." + token.slice(-4);
    const tokenHash = await hashToken(token);

    const { data: row, error } = await supabase.from("api_keys").insert({
      name: newKeyName,
      token_preview: preview,
      token_hash: tokenHash,
      active: true,
    }).select().single();

    if (error) {
      logger.error(error);
      toast.error("Erro ao criar chave de API.");
      return;
    }

    setKeys(prev => [row, ...prev]);
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

  const revokeKey = async (id: string) => {
    const { error } = await supabase.from("api_keys").update({ active: false }).eq("id", id);
    if (error) {
      logger.error(error);
      toast.error("Erro ao revogar chave.");
      return;
    }
    setKeys(keys.map(k => k.id === id ? { ...k, active: false } : k));
    toast.info("Chave revogada.");
  };

  const deleteKey = async (id: string) => {
    const { error } = await supabase.from("api_keys").delete().eq("id", id);
    if (error) {
      logger.error(error);
      toast.error("Erro ao excluir chave.");
      return;
    }
    setKeys(keys.filter(k => k.id !== id));
    toast.success("Chave removida.");
  };

  const activeKeys = keys.filter(k => k.active);
  const revokedKeys = keys.filter(k => !k.active);

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setGeneratedToken(null); }}>
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
                <p className="text-xs text-muted-foreground mt-1 mb-3">Copie e salve esta chave agora. Por segurança, você não poderá vê-la novamente.</p>
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

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Chaves Ativas ({activeKeys.length})
                </h3>
                <div className="divide-y divide-border border border-border rounded-lg overflow-hidden flex flex-col max-h-60 overflow-y-auto">
                  {activeKeys.length === 0 ? (
                    <p className="p-4 text-xs text-muted-foreground text-center bg-card">Nenhuma chave ativa encontrada.</p>
                  ) : (
                    activeKeys.map((key) => (
                      <div key={key.id} className="flex items-center justify-between p-3 bg-card hover:bg-card-hover transition-colors">
                        <div>
                          <p className="text-sm font-medium text-foreground">{key.name}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <code className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{key.token_preview}</code>
                            {key.last_used_at && <span className="text-[10px] text-muted-foreground">Último uso: {new Date(key.last_used_at).toLocaleDateString()}</span>}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => revokeKey(key.id)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="h-4 w-4 mr-1" /> Revogar
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                {revokedKeys.length > 0 && (
                  <>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4">
                      Chaves Revogadas ({revokedKeys.length})
                    </h3>
                    <div className="divide-y divide-border border border-border rounded-lg overflow-hidden flex flex-col max-h-40 overflow-y-auto opacity-60">
                      {revokedKeys.map(key => (
                        <div key={key.id} className="flex items-center justify-between p-3 bg-card">
                          <div>
                            <p className="text-sm font-medium text-foreground line-through">{key.name}</p>
                            <code className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{key.token_preview}</code>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => deleteKey(key.id)} className="text-muted-foreground hover:text-destructive h-7 text-[10px]">
                            <Trash2 className="h-3 w-3 mr-1" /> Excluir
                          </Button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
