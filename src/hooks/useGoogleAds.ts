import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import type { AdCampaign } from "./useMetaAds";

export interface GoogleAdsCreds {
  developer_token: string;
  customer_id: string;
}

export function useGoogleAds() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const clientId = tenant?.id ?? user?.client_id;

  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // ── Connection status ──────────────────────────────────────────
  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ["google-ads-status", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("google-ads?action=status");
      if (error) return { status: "disconnected", google_oauth_connected: false };
      return data as {
        status: string;
        developerToken: string | null;
        customerId: string | null;
        google_oauth_connected: boolean;
      };
    },
    enabled: !!clientId,
    staleTime: 60_000,
  });

  // ── Cached campaigns from DB ───────────────────────────────────
  const { data: campaigns = [], refetch: refetchCampaigns, isLoading: loadingCampaigns } = useQuery({
    queryKey: ["ad-campaigns-google", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data } = await (supabase.from("ad_campaigns") as any)
        .select("*")
        .eq("client_id", clientId)
        .eq("platform", "google")
        .order("spend", { ascending: false });
      return (data ?? []) as AdCampaign[];
    },
    enabled: !!clientId,
    staleTime: 5 * 60_000,
  });

  // ── Connect ───────────────────────────────────────────────────
  const connect = useCallback(async (creds: GoogleAdsCreds) => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-ads?action=save-credentials", {
        body: creds,
      });
      if (error || data?.error) throw new Error(data?.error ?? error?.message);
      toast.success(`Google Ads conectado — ${data.descriptive_name ?? creds.customer_id}`);
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
    await supabase.functions.invoke("google-ads?action=disconnect");
    await refetchStatus();
    toast.success("Google Ads desconectado");
  }, [refetchStatus]);

  // ── Sync ──────────────────────────────────────────────────────
  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-ads?action=sync");
      if (error || data?.error) throw new Error(data?.error ?? error?.message);
      toast.success(`${data.synced} campanhas Google sincronizadas`);
      await refetchCampaigns();
      return data.synced as number;
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
      return 0;
    } finally {
      setSyncing(false);
    }
  }, [refetchCampaigns]);

  const isConnected = status?.status === "connected";

  return {
    isConnected,
    status,
    campaigns,
    loadingCampaigns,
    connecting,
    syncing,
    connect,
    disconnect,
    sync,
    refetchCampaigns,
  };
}
