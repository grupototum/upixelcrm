import { logger } from "@/lib/logger";
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FacebookPageIntegration {
  id: string;
  status: "disconnected" | "connected" | "error";
  page_id: string;
  page_name: string;
  page_category?: string | null;
  webhook_url?: string;
  connected_at?: string;
}

export function useFacebookPageIntegration() {
  const [pages, setPages] = useState<FacebookPageIntegration[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPages = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("client_id")
        .eq("id", session.user.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from("integrations")
        .select("id, status, config")
        .eq("provider", "facebook_page")
        .eq("client_id", profile.client_id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped: FacebookPageIntegration[] = (data ?? []).map((row) => {
        const cfg = (row.config ?? {}) as {
          page_id?: string;
          page_name?: string;
          page_category?: string | null;
          webhook_url?: string;
          connected_at?: string;
        };
        return {
          id: row.id,
          status: (row.status as FacebookPageIntegration["status"]) || "disconnected",
          page_id: cfg.page_id ?? "",
          page_name: cfg.page_name ?? "Sem nome",
          page_category: cfg.page_category ?? null,
          webhook_url: cfg.webhook_url,
          connected_at: cfg.connected_at,
        };
      });

      setPages(mapped);
    } catch (err) {
      logger.error("[useFacebookPageIntegration] fetchPages error:", err);
    }
  }, []);

  const disconnect = useCallback(
    async (integrationId: string) => {
      setLoading(true);
      try {
        const { error } = await supabase
          .from("integrations")
          .update({ status: "disconnected", updated_at: new Date().toISOString() })
          .eq("id", integrationId);
        if (error) throw error;
        toast.success("Página desconectada.");
        await fetchPages();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao desconectar.";
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [fetchPages],
  );

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  return {
    pages,
    loading,
    connectedCount: pages.filter((p) => p.status === "connected").length,
    fetchPages,
    disconnect,
  };
}
