import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import * as leadContactsRepo from "@/services/leadContacts";
import type { ContactRole, LeadContact } from "@/types";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { resolveClientId } from "@/lib/tenant-utils";

export function useLeadContacts(leadId: string | undefined) {
  const [contacts, setContacts] = useState<LeadContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { tenant } = useTenant();
  const { user } = useAuth();
  const clientId = resolveClientId(tenant?.id, user?.client_id);

  const fetchContacts = useCallback(async () => {
    if (!leadId) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const data = await leadContactsRepo.getLeadContacts(leadId);
      setContacts(data);
    } catch (error) {
      console.error("Error fetching lead contacts:", error);
    }
    setIsLoading(false);
  }, [leadId]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const addContact = useCallback(async (data: { name: string; role: ContactRole; phone?: string; email?: string; notes?: string }) => {
    if (!leadId || !clientId) { toast.error("Sem contexto de lead/cliente."); return; }
    try {
      const created = await leadContactsRepo.createLeadContact({
        leadId, clientId, tenantId: tenant?.id, ...data,
      });
      setContacts((prev) => [...prev, created]);
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error("Erro ao adicionar contato: " + message);
    }
  }, [leadId, clientId, tenant?.id]);

  const updateContact = useCallback(async (id: string, data: Partial<Pick<LeadContact, "name" | "role" | "phone" | "email" | "notes">>) => {
    try {
      await leadContactsRepo.updateLeadContact(id, data);
      setContacts((prev) => prev.map((c) => c.id === id ? { ...c, ...data } : c));
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error("Erro ao editar contato: " + message);
    }
  }, []);

  const removeContact = useCallback(async (id: string) => {
    try {
      await leadContactsRepo.deleteLeadContact(id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error("Erro ao remover contato: " + message);
    }
  }, []);

  return { contacts, isLoading, addContact, updateContact, removeContact };
}
