import { logger } from "@/lib/logger";
import { useState, useEffect, useCallback } from "react";
import { Cpu, Sparkles, Loader2, Save, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";

interface ProviderDef {
  /** Valor de `provider` na tabela integrations */
  key: string;
  label: string;
  description: string;
  placeholder: string;
  helpUrl: string;
  helpLabel: string;
  icon: typeof Cpu;
}

const PROVIDERS: ProviderDef[] = [
  {
    key: "nvidia_api",
    label: "NVIDIA NIM",
    description:
      "80+ modelos gratuitos (Llama 3.3, Nemotron, etc). A chave começa com nvapi-.",
    placeholder: "nvapi-...",
    helpUrl: "https://build.nvidia.com/",
    helpLabel: "Gerar chave em build.nvidia.com",
    icon: Cpu,
  },
  {
    key: "openai_api",
    label: "OpenAI",
    description: "Modelos GPT-4o e GPT-4o-mini. A chave começa com sk-.",
    placeholder: "sk-...",
    helpUrl: "https://platform.openai.com/api-keys",
    helpLabel: "Gerar chave em platform.openai.com",
    icon: Sparkles,
  },
];

export function AIProviderSettings() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const clientId = tenant?.id ?? user?.client_id;

  const [loading, setLoading] = useState(true);
  // provider.key -> tem chave salva?
  const [configured, setConfigured] = useState<Record<string, boolean>>({});
  // provider.key -> id da row integrations (para update)
  const [rowIds, setRowIds] = useState<Record<string, string>>({});
  // provider.key -> valor digitado
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const providerKeys = PROVIDERS.map((p) => p.key);
      const { data, error } = await supabase
        .from("integrations")
        .select("id, provider, config")
        .eq("client_id", clientId)
        .in("provider", providerKeys);

      if (error) throw error;

      const nextConfigured: Record<string, boolean> = {};
      const nextRowIds: Record<string, string> = {};
      (data || []).forEach((row: any) => {
        nextRowIds[row.provider] = row.id;
        nextConfigured[row.provider] = !!row.config?.api_key;
      });
      setConfigured(nextConfigured);
      setRowIds(nextRowIds);
    } catch (err) {
      logger.error("Error loading AI provider keys:", err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleSave = async (provider: ProviderDef) => {
    const value = (inputs[provider.key] || "").trim();
    if (!value) {
      toast.error("Insira a chave antes de salvar.");
      return;
    }
    if (!clientId) {
      toast.error("Não foi possível determinar o cliente. Faça login novamente.");
      return;
    }

    setSavingKey(provider.key);
    try {
      const existingId = rowIds[provider.key];
      if (existingId) {
        const { error } = await supabase
          .from("integrations")
          .update({ status: "connected", config: { api_key: value } })
          .eq("id", existingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("integrations")
          .insert({
            client_id: clientId,
            provider: provider.key,
            status: "connected",
            config: { api_key: value },
          })
          .select("id")
          .single();
        if (error) throw error;
        if (data) setRowIds((prev) => ({ ...prev, [provider.key]: data.id }));
      }

      setConfigured((prev) => ({ ...prev, [provider.key]: true }));
      setInputs((prev) => ({ ...prev, [provider.key]: "" }));
      setReveal((prev) => ({ ...prev, [provider.key]: false }));
      toast.success(`Chave da ${provider.label} salva com sucesso!`);
    } catch (err: any) {
      logger.error("Error saving AI provider key:", err);
      toast.error(err?.message || "Erro ao salvar a chave.");
    } finally {
      setSavingKey(null);
    }
  };

  const handleRemove = async (provider: ProviderDef) => {
    const existingId = rowIds[provider.key];
    if (!existingId) return;
    setSavingKey(provider.key);
    try {
      const { error } = await supabase
        .from("integrations")
        .update({ status: "disconnected", config: {} })
        .eq("id", existingId);
      if (error) throw error;
      setConfigured((prev) => ({ ...prev, [provider.key]: false }));
      toast.success(`Chave da ${provider.label} removida.`);
    } catch (err: any) {
      logger.error("Error removing AI provider key:", err);
      toast.error(err?.message || "Erro ao remover a chave.");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <p className="text-sm text-muted-foreground">
        Configure as chaves de API usadas pelo nó <strong>AI Assistant</strong> das
        automações. As chaves ficam isoladas por cliente e nunca são expostas
        publicamente.
      </p>

      {PROVIDERS.map((provider) => {
        const Icon = provider.icon;
        const isConfigured = configured[provider.key];
        const isSaving = savingKey === provider.key;
        const isRevealed = reveal[provider.key];

        return (
          <Card key={provider.key} className="rounded-card ghost-border bg-card">
            <CardHeader className="bg-primary/5 pb-6">
              <CardTitle className="text-lg font-bold flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <span className="flex items-center gap-2">
                  {provider.label}
                  {isConfigured && (
                    <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15 gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Configurada
                    </Badge>
                  )}
                </span>
              </CardTitle>
              <CardDescription className="text-xs">
                {provider.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">
                  {isConfigured ? "Substituir chave" : "Chave de API"}
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={isRevealed ? "text" : "password"}
                      autoComplete="off"
                      placeholder={isConfigured ? "•••••••• (deixe vazio para manter)" : provider.placeholder}
                      value={inputs[provider.key] || ""}
                      onChange={(e) =>
                        setInputs((prev) => ({ ...prev, [provider.key]: e.target.value }))
                      }
                      className="pr-10 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setReveal((prev) => ({ ...prev, [provider.key]: !prev[provider.key] }))
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button
                    onClick={() => handleSave(provider)}
                    disabled={isSaving || loading}
                    className="gap-1.5"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Salvar
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <a
                    href={provider.helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-primary hover:underline"
                  >
                    {provider.helpLabel} →
                  </a>
                  {isConfigured && (
                    <button
                      type="button"
                      onClick={() => handleRemove(provider)}
                      disabled={isSaving}
                      className="text-[11px] text-destructive hover:underline"
                    >
                      Remover chave
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
