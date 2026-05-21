import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, MessageCircle, Instagram, Facebook, Mail, Bot, Loader2, Search, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

interface IntegrationRow {
  id: string;
  provider: string;
  status: string;
  client_id: string;
  tenant_id: string | null;
  config: Record<string, unknown> | null;
  created_at: string;
}

interface TenantRow {
  id: string;
  name: string;
  subdomain: string;
}

const providerIcon = (provider: string) => {
  if (provider === "facebook_page") return <Facebook className="h-4 w-4 text-blue-600" />;
  if (provider === "instagram") return <Instagram className="h-4 w-4 text-pink-600" />;
  if (provider === "whatsapp" || provider === "whatsapp_official" || provider === "whatsapp_cloud")
    return <MessageCircle className="h-4 w-4 text-green-600" />;
  if (provider === "google" || provider === "google_credentials")
    return <Mail className="h-4 w-4 text-red-500" />;
  return <Bot className="h-4 w-4 text-muted-foreground" />;
};

const providerLabel = (provider: string) => {
  const map: Record<string, string> = {
    whatsapp: "WhatsApp Lite (Evolution)",
    whatsapp_official: "WhatsApp Oficial (Meta)",
    whatsapp_cloud: "WhatsApp Cloud API",
    facebook_page: "Facebook Page",
    instagram: "Instagram",
    google: "Google OAuth",
    google_credentials: "Google Ads",
  };
  return map[provider] ?? provider;
};

export default function MasterIntegrationsPage() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: tns }, { data: ints }] = await Promise.all([
        supabase.from("tenants").select("id, name, subdomain").order("name"),
        supabase
          .from("integrations")
          .select("id, provider, status, client_id, tenant_id, config, created_at")
          .order("provider")
          .order("created_at", { ascending: false }),
      ]);
      setTenants((tns ?? []) as TenantRow[]);
      setIntegrations((ints ?? []) as unknown as IntegrationRow[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Falha ao carregar: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Master users only (defense-in-depth — rota também tem checagem)
  if (user && user.role !== "master") {
    return <Navigate to="/" replace />;
  }

  const toggleStatus = async (int: IntegrationRow) => {
    const newStatus = int.status === "connected" ? "paused" : "connected";
    setIntegrations((prev) => prev.map((i) => i.id === int.id ? { ...i, status: newStatus } : i));
    const { error } = await supabase
      .from("integrations")
      .update({ status: newStatus })
      .eq("id", int.id);
    if (error) {
      setIntegrations((prev) => prev.map((i) => i.id === int.id ? { ...i, status: int.status } : i));
      toast.error(`Erro: ${error.message}`);
      return;
    }
    toast.success(newStatus === "connected" ? "Ativada." : "Pausada.");
  };

  // Agrupa por tenant. Integrações órfãs (tenant_id null ou não existe em tenants) ficam num grupo "Órfãs".
  const byTenant = new Map<string, IntegrationRow[]>();
  const orphans: IntegrationRow[] = [];
  const knownTenantIds = new Set(tenants.map((t) => t.id));

  for (const int of integrations) {
    const tid = int.tenant_id;
    if (!tid || !knownTenantIds.has(tid)) {
      orphans.push(int);
      continue;
    }
    if (!byTenant.has(tid)) byTenant.set(tid, []);
    byTenant.get(tid)!.push(int);
  }

  const filterMatch = (int: IntegrationRow) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const cfg = (int.config as Record<string, string>) ?? {};
    return (
      providerLabel(int.provider).toLowerCase().includes(q) ||
      int.provider.toLowerCase().includes(q) ||
      (cfg.instance_name?.toLowerCase().includes(q) ?? false) ||
      (cfg.page_name?.toLowerCase().includes(q) ?? false) ||
      (cfg.display_name?.toLowerCase().includes(q) ?? false) ||
      (cfg.phone_number_id?.toLowerCase().includes(q) ?? false)
    );
  };

  const renderIntegration = (int: IntegrationRow) => {
    const cfg = (int.config as Record<string, string>) ?? {};
    const display = cfg.display_name || cfg.page_name || cfg.instance_name || cfg.phone_number_id || int.provider;
    return (
      <div key={int.id} className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {providerIcon(int.provider)}
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">{display}</p>
            <p className="text-[10px] text-muted-foreground">
              {providerLabel(int.provider)} · criada {new Date(int.created_at).toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={`text-[9px] ${
            int.status === "connected" ? "border-success/40 text-success"
            : int.status === "paused" ? "border-muted-foreground/40 text-muted-foreground"
            : "border-destructive/40 text-destructive"
          }`}
        >
          {int.status}
        </Badge>
        {(int.status === "connected" || int.status === "paused") && (
          <Switch
            checked={int.status === "connected"}
            onCheckedChange={() => toggleStatus(int)}
            aria-label="Pausar/Ativar"
          />
        )}
      </div>
    );
  };

  const tenantHasMatch = (tid: string) => byTenant.get(tid)?.some(filterMatch) ?? false;

  return (
    <AppLayout title="Integrações (Master)" subtitle="Visão global de instâncias por tenant">
      <div className="space-y-4 max-w-5xl">
        <div className="flex items-center gap-2 bg-success/5 border border-success/20 rounded-lg px-3 py-2 text-xs text-success">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          Esta página é exclusiva do usuário master. Mostra TODAS as integrações de TODOS os tenants.
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por provider, número, page name, instance..."
            className="pl-9"
          />
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && tenants.map((t) => {
          const items = (byTenant.get(t.id) ?? []).filter(filterMatch);
          if (search && items.length === 0 && !tenantHasMatch(t.id)) return null;
          return (
            <Card key={t.id} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold">{t.name}</h3>
                  <p className="text-[10px] text-muted-foreground font-mono">{t.subdomain}.upixel.app</p>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  {byTenant.get(t.id)?.length ?? 0} integraç{(byTenant.get(t.id)?.length ?? 0) === 1 ? "ão" : "ões"}
                </Badge>
              </div>
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Nenhuma integração</p>
              ) : (
                <div className="space-y-0">{items.map(renderIntegration)}</div>
              )}
            </Card>
          );
        })}

        {!loading && orphans.filter(filterMatch).length > 0 && (
          <Card className="p-4 border-destructive/30 bg-destructive/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <h3 className="text-sm font-bold text-destructive">Integrações órfãs</h3>
              </div>
              <Badge variant="destructive" className="text-[10px]">
                {orphans.length}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3">
              Integrações sem <code>tenant_id</code> válido. Provavelmente criadas antes do fix de
              isolamento. Revisar manualmente ou deletar.
            </p>
            <div className="space-y-0">{orphans.filter(filterMatch).map(renderIntegration)}</div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
