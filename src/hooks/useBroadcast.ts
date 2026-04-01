import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export type BroadcastRoute = "free" | "official";

export interface Template {
  id: string;
  name: string;
  category: "UTILITY" | "MARKETING";
  content: string;
}

const MOCK_TEMPLATES: Template[] = [
  { id: "1", name: "order_confirmation", category: "UTILITY", content: "Olá {{1}}, seu pedido {{2}} foi confirmado!" },
  { id: "2", name: "promotion_flash", category: "MARKETING", content: "Oferta imperdível! Use o cupom {{1}} e ganhe 20% OFF." },
];

export function useBroadcast() {
  const queryClient = useQueryClient();
  const [isInside24h, setIsInside24h] = useState(true);
  const [loading, setLoading] = useState(false);

  // Fetch real credits balance
  const { data: creditsData, isLoading: loadingCredits } = useQuery({
    queryKey: ["client-credits"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      
      const { data: profile } = await supabase.from("profiles").select("client_id").eq("id", user.id).single();
      if (!profile) return 0;

      const { data, error } = await supabase
        .from("client_credits")
        .select("balance")
        .eq("client_id", profile.client_id)
        .single();
      
      if (error && error.code !== "PGRST116") { // PGRST116 is "No rows found"
        console.error("Error fetching credits:", error);
        return 0;
      }
      
      return data?.balance || 0;
    }
  });

  const credits = creditsData ?? 0;

  const calculateCost = useCallback((count: number, route: BroadcastRoute) => {
    if (route === "free") return 0;
    return isInside24h ? 0 : count;
  }, [isInside24h]);

  const sendBroadcast = useCallback(async (
    count: number, 
    route: BroadcastRoute, 
    template?: Template
  ) => {
    const cost = calculateCost(count, route);

    if (credits < cost) {
      toast.error("Saldo de créditos insuficiente!");
      return false;
    }

    setLoading(true);
    
    try {
      // 1. Simulate Evolution API call or real broadcast
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 2. Debit credits if applicable
      if (cost > 0) {
         const { data: { user } } = await supabase.auth.getUser();
         const { data: profile } = await supabase.from("profiles").select("client_id").eq("id", user?.id).single();
         
         if (profile) {
           const { error } = await supabase.rpc("increment_client_credits", {
             client_id_param: profile.client_id,
             amount_param: -cost
           });
           if (error) throw error;
         }
      }

      queryClient.invalidateQueries({ queryKey: ["client-credits"] });
      toast.success(`${count} mensagens enviadas com sucesso!`);
      return true;
    } catch (error: any) {
      toast.error(`Erro ao enviar: ${error.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, [credits, calculateCost, queryClient]);

  return {
    credits,
    loadingCredits,
    isInside24h,
    setIsInside24h,
    loading,
    templates: MOCK_TEMPLATES,
    calculateCost,
    sendBroadcast
  };
}
