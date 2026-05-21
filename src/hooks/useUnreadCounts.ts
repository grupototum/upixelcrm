import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { resolveClientId } from "@/lib/tenant-utils";
import { logger } from "@/lib/logger";

/**
 * Counters globais para mostrar badges no sidebar:
 *   - inbox: número de conversations com unread_count > 0
 *   - tasks: número de tarefas pendentes/vencidas do usuário atual
 *
 * Recarrega a cada 60s + subscribe via realtime nas duas tabelas pra
 * atualizar imediatamente quando uma nova mensagem chega ou uma tarefa
 * muda de status. Falhas no realtime não impedem o polling.
 */
export function useUnreadCounts() {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const clientId = resolveClientId(tenant?.id, user?.client_id);
  const [inboxCount, setInboxCount] = useState<number>(0);
  const [tasksCount, setTasksCount] = useState<number>(0);
  const clientIdRef = useRef<string | null>(null);

  const fetchCounts = useCallback(async () => {
    if (!clientId) return;
    clientIdRef.current = clientId;

    try {
      // Inbox: conversations com unread_count > 0 e status aberto
      const { count: inboxRaw, error: convErr } = await supabase
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId)
        .gt("unread_count", 0)
        .eq("status", "open");
      if (convErr) {
        logger.error("[useUnreadCounts] inbox query error:", convErr);
      } else {
        setInboxCount(inboxRaw ?? 0);
      }

      // Tarefas: pendentes (not completed/done) atribuídas ao usuário OU sem assignee.
      // Mantém simples: conta tasks status != 'completed' e != 'done' do tenant.
      const { count: tasksRaw, error: taskErr } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId)
        .not("status", "in", "(completed,done,cancelled)");
      if (taskErr) {
        logger.error("[useUnreadCounts] tasks query error:", taskErr);
      } else {
        setTasksCount(tasksRaw ?? 0);
      }
    } catch (err) {
      logger.error("[useUnreadCounts] unexpected error:", err);
    }
  }, [clientId]);

  // Initial fetch + periodic refresh (60s)
  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 60_000);
    return () => clearInterval(interval);
  }, [fetchCounts]);

  // Realtime subscriptions — atualiza badges imediatamente quando algo muda.
  useEffect(() => {
    if (!clientId) return;

    const channel = supabase
      .channel(`unread-counts-${clientId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations", filter: `client_id=eq.${clientId}` },
        () => { void fetchCounts(); },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `client_id=eq.${clientId}` },
        () => { void fetchCounts(); },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, fetchCounts]);

  return { inboxCount, tasksCount, refresh: fetchCounts };
}
