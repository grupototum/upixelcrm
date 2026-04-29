import { useCallback, useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ConversationWindow {
  conversationId: string;
  isWithin24h: boolean;
  remainingSeconds: number | null;
  costPerMessage: number;
  requiresCredit: boolean;
}

// Meta rates for out-of-window messages
const META_RATES: Record<string, number> = {
  MARKETING: 1.24,
  UTILITY: 0.70,
  AUTHENTICATION: 0.60,
  SERVICE: 0.60,
};

export function useConversationWindow(conversationId?: string | null) {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [window, setWindow] = useState<ConversationWindow | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [loadingWindow, setLoadingWindow] = useState(false);

  const clientId = user?.client_id || tenant?.id;

  // Fetch window status and remaining time
  const fetchWindowStatus = useCallback(async () => {
    if (!conversationId || !clientId) return;
    setLoadingWindow(true);
    try {
      const [windowRes, secondsRes] = await Promise.all([
        supabase.rpc("is_within_24h_window", { conv_id: conversationId }),
        supabase.rpc("get_window_remaining_seconds", { conv_id: conversationId }),
      ]);

      const isWithin = (windowRes.data as boolean) || false;
      const remaining = (secondsRes.data as number | null) || null;

      setWindow({
        conversationId,
        isWithin24h: isWithin,
        remainingSeconds: remaining,
        costPerMessage: isWithin ? 0 : META_RATES.UTILITY, // Default to UTILITY
        requiresCredit: !isWithin,
      });
    } catch (err) {
      console.error("Error fetching window status:", err);
    } finally {
      setLoadingWindow(false);
    }
  }, [conversationId, clientId]);

  // Fetch current credit balance
  const fetchCredits = useCallback(async () => {
    if (!clientId) return;
    try {
      const { data, error } = await supabase
        .from("client_credits")
        .select("balance")
        .eq("client_id", clientId)
        .single();

      if (!error && data) {
        setCredits(data.balance || 0);
      }
    } catch (err) {
      console.error("Error fetching credits:", err);
    }
  }, [clientId]);

  // Load window status and credits on mount
  useEffect(() => {
    if (conversationId) fetchWindowStatus();
  }, [conversationId, fetchWindowStatus]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  // Poll every 10 seconds if within window to update countdown
  useEffect(() => {
    if (!window?.isWithin24h || !window?.remainingSeconds) return;
    const interval = setInterval(() => fetchWindowStatus(), 10000);
    return () => clearInterval(interval);
  }, [window?.isWithin24h, window?.remainingSeconds, fetchWindowStatus]);

  // Deduct credits after sending a message
  const deductCredits = useCallback(
    async (amount: number) => {
      if (!clientId) return false;
      try {
        const { error } = await supabase.rpc("increment_client_credits", {
          client_id_param: clientId,
          amount_param: -amount,
        });

        if (error) {
          toast.error("Erro ao descontar créditos: " + error.message);
          return false;
        }

        await fetchCredits();
        return true;
      } catch (err: any) {
        toast.error("Erro ao descontar créditos");
        return false;
      }
    },
    [clientId, fetchCredits]
  );

  // Check if user has enough credits
  const hasEnoughCredits = useMemo(() => {
    if (!window || window.isWithin24h) return true;
    if (credits === null) return false;
    return credits >= window.costPerMessage;
  }, [window, credits]);

  return {
    window,
    credits,
    loadingWindow,
    hasEnoughCredits,
    fetchWindowStatus,
    fetchCredits,
    deductCredits,
  };
}

// Format remaining time as readable string
export function formatWindowTime(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return "Janela expirada";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
