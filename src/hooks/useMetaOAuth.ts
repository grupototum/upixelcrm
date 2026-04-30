import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type MetaIntegrationType = "whatsapp" | "instagram" | "ads" | "all";

export interface DiscoveredAccounts {
  whatsapp?: Array<{
    id: string;
    name: string;
    business_id: string;
    business_name: string;
    ownership: "owned" | "client";
    currency?: string;
    timezone_id?: string;
    phone_numbers: Array<{
      id: string;
      display_phone_number: string;
      verified_name: string;
      quality_rating?: string;
      code_verification_status?: string;
    }>;
  }>;
  instagram?: Array<{
    ig_account_id: string;
    ig_username: string;
    ig_name: string;
    ig_picture?: string;
    ig_followers?: number;
    page_id: string;
    page_name: string;
    page_access_token: string;
  }>;
  ads?: Array<{
    id: string;
    account_id: string;
    name: string;
    currency: string;
    status: number;
    business_name?: string;
  }>;
}

const STORAGE_KEY = "upixel:meta_oauth_pending";

interface PendingOAuth {
  type: MetaIntegrationType;
  return_to: string;
  started_at: number;
}

export function useMetaOAuth() {
  const [loading, setLoading] = useState(false);

  // Step 1: kick off the OAuth flow
  const startOAuth = useCallback(async (type: MetaIntegrationType, returnTo?: string) => {
    setLoading(true);
    try {
      // Capture current tenant subdomain to redirect back correctly
      const tenant = window.location.hostname.split(".")[0];

      // Stash where to come back after the user picks an account
      const pending: PendingOAuth = {
        type,
        return_to: returnTo || window.location.pathname,
        started_at: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));

      const { data, error } = await supabase.functions.invoke("meta-oauth?action=init", {
        body: { type, tenant },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);

      window.location.href = data.auth_url;
    } catch (err: any) {
      toast.error(`Erro ao iniciar OAuth: ${err.message}`);
      setLoading(false);
    }
  }, []);

  // Step 2: exchange code on root-domain callback (no auth)
  const exchangeCode = useCallback(async (code: string, state: string) => {
    const { data, error } = await supabase.functions.invoke("meta-oauth?action=exchange", {
      body: { code, state },
    });
    if (error || data?.error) throw new Error(data?.error || error?.message);
    return data as { oauth_session_id: string; tenant_subdomain: string; type: MetaIntegrationType };
  }, []);

  // Step 3: fetch discovered accounts on tenant subdomain (auth required)
  const fetchDiscovered = useCallback(async (oauth_session_id: string) => {
    const { data, error } = await supabase.functions.invoke("meta-oauth?action=fetch", {
      body: { oauth_session_id },
    });
    if (error || data?.error) throw new Error(data?.error || error?.message);
    return data as { type: MetaIntegrationType; discovered: DiscoveredAccounts };
  }, []);

  // Step 4: save the chosen account
  const saveSelection = useCallback(
    async (
      oauth_session_id: string,
      provider: "whatsapp_official" | "instagram" | "meta_ads",
      selection: any
    ) => {
      const { data, error } = await supabase.functions.invoke("meta-oauth?action=save", {
        body: { oauth_session_id, provider, selection },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      return data;
    },
    []
  );

  return {
    loading,
    startOAuth,
    exchangeCode,
    fetchDiscovered,
    saveSelection,
    getPending: (): PendingOAuth | null => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as PendingOAuth;
      } catch {
        return null;
      }
    },
    clearPending: () => localStorage.removeItem(STORAGE_KEY),
  };
}
