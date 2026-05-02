import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";

export interface MetaAdsCreds {
  access_token: string;
  ad_account_id: string;
}

export interface AdCampaign {
  id: string;
  client_id: string;
  platform: "meta" | "google";
  external_id: string;
  name: string;
  status: string;
  objective?: string;
  channel_type?: string;
  budget_daily?: number;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  cpc: number;
  ctr: number;
  cpm: number;
  conversions: number;
  leads_count: number;
  cost_per_lead: number;
  revenue: number;
  date_range?: { since: string; until: string };
  synced_at: string;
}

export function useMetaAds() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const clientId = tenant?.id ?? user?.client_id;

  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // ── Connection status ──────────────────────────────────────────
  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ["meta-ads-status", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("meta-ads?action=status");
      if (error) return { status: "disconnected", accessToken: null, adAccountId: null, tokenExpiresAt: null };
      return data as { status: string; accessToken: string | null; adAccountId: string | null; tokenExpiresAt: string | null };
    },
    enabled: !!clientId,
    staleTime: 60_000,
  });

  // ── Cached campaigns from DB ───────────────────────────────────
  const { data: campaigns = [], refetch: refetchCampaigns, isLoading: loadingCampaigns } = useQuery({
    queryKey: ["ad-campaigns-meta", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data } = await (supabase.from("ad_campaigns") as any)
        .select("*")
        .eq("client_id", clientId)
        .eq("platform", "meta")
        .order("spend", { ascending: false });
      return (data ?? []) as AdCampaign[];
    },
    enabled: !!clientId,
    staleTime: 5 * 60_000,
  });

  // ── Connect (save credentials) ────────────────────────────────
  const connect = useCallback(async (creds: MetaAdsCreds) => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-ads?action=save-credentials", {
        body: creds,
      });
      if (error || data?.error) throw new Error(data?.error ?? error?.message);
      toast.success(`Meta Ads conectado — ${data.account_name}`);
      await refetchStatus();
      return true;
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
      return false;
    } finally {
      setConnecting(false);
    }
  }, [refetchStatus]);

  // ── Disconnect ────────────────────────────────────────────────
  const disconnect = useCallback(async () => {
    await supabase.functions.invoke("meta-ads?action=disconnect");
    await refetchStatus();
    toast.success("Meta Ads desconectado");
  }, [refetchStatus]);

  // ── Sync data from Meta API to DB ─────────────────────────────
  const sync = useCallback(async (since?: string, until?: string) => {
    setSyncing(true);
    try {
      const body: Record<string, string> = {};
      if (since) body.since = since;
      if (until) body.until = until;

      const { data, error } = await supabase.functions.invoke("meta-ads?action=sync", { body });
      if (data?.token_expired) {
        toast.error("Token Meta Ads expirado — reconecte em Integrações → Meta Ads", { duration: 8000 });
        return 0;
      }
      if (error || data?.error) throw new Error(data?.error ?? error?.message);
      toast.success(`${data.synced} campanhas sincronizadas`);
      await refetchCampaigns();
      return data.synced as number;
    } catch (err: any) {
      toast.error(`Erro na sincronização: ${err.message}`);
      return 0;
    } finally {
      setSyncing(false);
    }
  }, [refetchCampaigns]);

  const isConnected = status?.status === "connected";

  const tokenExpiresAt = status?.tokenExpiresAt ?? null;
  const tokenDaysLeft = tokenExpiresAt
    ? Math.ceil((new Date(tokenExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const tokenExpiringSoon = tokenDaysLeft !== null && tokenDaysLeft <= 10;

  return {
    isConnected,
    status,
    campaigns,
    loadingCampaigns,
    connecting,
    syncing,
    tokenExpiresAt,
    tokenDaysLeft,
    tokenExpiringSoon,
    connect,
    disconnect,
    sync,
    refetchCampaigns,
  };
}
