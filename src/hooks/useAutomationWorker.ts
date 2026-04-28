import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const POLL_INTERVAL_MS = 60_000; // 1 minuto

/**
 * Faz polling do edge function `automation-worker` enquanto o usuário
 * estiver autenticado. O worker processa itens pendentes da fila
 * `automation_queue` (delays, retries de fluxos complexos).
 *
 * Sem este polling, automações com delay ficam presas como "pending"
 * indefinidamente.
 *
 * Apenas uma instância do polling roda por sessão (evita duplicações
 * caso o hook seja montado em múltiplos componentes).
 */
let pollingInstanceCount = 0;

export function useAutomationWorker() {
  const { user } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;
    if (pollingInstanceCount > 0) return;
    pollingInstanceCount++;

    const tick = async () => {
      try {
        await supabase.functions.invoke("automation-worker", { body: {} });
      } catch (err) {
        // Silencioso: erros temporários não devem poluir o console
        console.debug("[automation-worker] tick error:", err);
      }
    };

    // Primeira execução com pequeno delay (3s) para não impactar o load inicial
    const initialTimeout = setTimeout(tick, 3000);
    intervalRef.current = setInterval(tick, POLL_INTERVAL_MS);

    return () => {
      pollingInstanceCount = Math.max(0, pollingInstanceCount - 1);
      clearTimeout(initialTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [user]);
}
