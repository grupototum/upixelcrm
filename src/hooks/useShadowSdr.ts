import { useCallback, useState } from "react";
import { toast } from "sonner";
import { analyzeShadowSdr } from "@/services/shadow-sdr/shadowSdrService";
import type {
  ShadowSdrAnalysis,
  ShadowSdrConversationInput,
} from "@/types/shadow-sdr";

export function useShadowSdr(input: ShadowSdrConversationInput | null) {
  const [analysis, setAnalysis] = useState<ShadowSdrAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async () => {
    if (!input) return;

    setLoading(true);
    setError(null);

    try {
      const result = await analyzeShadowSdr(input);
      setAnalysis(result);
    } catch (err: any) {
      const message = err?.message || "Erro ao gerar analise SDR.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [input]);

  const reset = useCallback(() => {
    setAnalysis(null);
    setError(null);
  }, []);

  return {
    analysis,
    loading,
    error,
    analyze,
    reset,
  };
}
