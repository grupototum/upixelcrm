import { logger } from "@/lib/logger";
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getProfileClientId } from "@/services/users";
import { listIntegrations, updateIntegration } from "@/services/integrations";

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

      const clientId = await getProfileClientId(session.user.id);
      if (!clientId) return;

      const data = await listIntegrations(clientId, "facebook_page");

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
        await updateIntegration(integrationId, { status: "disconnected" });
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
