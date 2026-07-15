import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import type { AdCampaign } from "./useMetaAds";
import { invokeGoogleAds, listAdCampaigns } from "@/services/integrations";

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
      try {
        return await invokeGoogleAds<{
          status: string;
          developerToken: string | null;
          customerId: string | null;
          google_oauth_connected: boolean;
        }>("status");
      } catch {
        return { status: "disconnected", google_oauth_connected: false };
      }
    },
    enabled: !!clientId,
    staleTime: 60_000,
  });

  // ── Cached campaigns from DB ───────────────────────────────────
  // ad_campaigns ainda não existe em prod — query falha com 404 e retorna [].
  const { data: campaigns = [], refetch: refetchCampaigns, isLoading: loadingCampaigns } = useQuery({
    queryKey: ["ad-campaigns-google", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      return listAdCampaigns<AdCampaign>(clientId, "google");
    },
    enabled: !!clientId,
    staleTime: 5 * 60_000,
    retry: false,
  });

  // ── Connect ───────────────────────────────────────────────────
  const connect = useCallback(async (creds: GoogleAdsCreds) => {
    setConnecting(true);
    try {
      const data = await invokeGoogleAds<{ error?: string; descriptive_name?: string }>("save-credentials", creds);
      if (data?.error) throw new Error(data.error);
      toast.success(`Google Ads conectado — ${data.descriptive_name ?? creds.customer_id}`);
      await refetchStatus();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Erro: ${message}`);
      return false;
    } finally {
      setConnecting(false);
    }
  }, [refetchStatus]);

  // ── Disconnect ────────────────────────────────────────────────
  const disconnect = useCallback(async () => {
    try {
      await invokeGoogleAds("disconnect");
    } catch {
      // preserva comportamento original: falha no disconnect é ignorada
    }
    await refetchStatus();
    toast.success("Google Ads desconectado");
  }, [refetchStatus]);

  // ── Sync ──────────────────────────────────────────────────────
  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      const data = await invokeGoogleAds<{ error?: string; synced?: number }>("sync");
      if (data?.error) throw new Error(data.error);
      toast.success(`${data.synced} campanhas Google sincronizadas`);
      await refetchCampaigns();
      return data.synced as number;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Erro: ${message}`);
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
