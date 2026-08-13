import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import * as leadPhonesRepo from "@/services/leadPhones";
import type { LeadPhone, PhoneCategory } from "@/types";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { resolveClientId } from "@/lib/tenant-utils";

export function useLeadPhones(leadId: string | undefined) {
  const [phones, setPhones] = useState<LeadPhone[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { tenant } = useTenant();
  const { user } = useAuth();
  const clientId = resolveClientId(tenant?.id, user?.client_id);

  const fetchPhones = useCallback(async () => {
    if (!leadId) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const data = await leadPhonesRepo.getLeadPhones(leadId);
      setPhones(data);
    } catch (error) {
      console.error("Error fetching lead phones:", error);
    }
    setIsLoading(false);
  }, [leadId]);

  useEffect(() => { fetchPhones(); }, [fetchPhones]);

  const addPhone = useCallback(async (data: { number: string; category: PhoneCategory; label?: string }) => {
    if (!leadId || !clientId) { toast.error("Sem contexto de lead/cliente."); return; }
    try {
      const created = await leadPhonesRepo.createLeadPhone({
        leadId, clientId, tenantId: tenant?.id, ...data,
      });
      setPhones((prev) => [...prev, created]);
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error("Erro ao adicionar telefone: " + message);
    }
  }, [leadId, clientId, tenant?.id]);

  const updatePhone = useCallback(async (id: string, data: Partial<Pick<LeadPhone, "number" | "category" | "label">>) => {
    try {
      await leadPhonesRepo.updateLeadPhone(id, data);
      setPhones((prev) => prev.map((p) => p.id === id ? { ...p, ...data } : p));
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error("Erro ao editar telefone: " + message);
    }
  }, []);

  const removePhone = useCallback(async (id: string) => {
    try {
      await leadPhonesRepo.deleteLeadPhone(id);
      setPhones((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error("Erro ao remover telefone: " + message);
    }
  }, []);

  return { phones, isLoading, addPhone, updatePhone, removePhone };
}
