import { supabase } from "@/integrations/supabase/client";
import { tenantIdField } from "@/lib/tenant-utils";
import type { ContactRole, LeadContact } from "@/types";

export async function getLeadContacts(leadId: string): Promise<LeadContact[]> {
  const { data, error } = await supabase
    .from("lead_contacts")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as LeadContact[];
}

export async function getLeadContactsForLeads(leadIds: string[]): Promise<LeadContact[]> {
  if (leadIds.length === 0) return [];
  const { data, error } = await supabase
    .from("lead_contacts")
    .select("*")
    .in("lead_id", leadIds);
  if (error) throw error;
  return (data ?? []) as LeadContact[];
}

export async function createLeadContact(params: {
  leadId: string;
  clientId: string;
  tenantId?: string | null;
  name: string;
  role: ContactRole;
  phone?: string;
  email?: string;
  notes?: string;
}): Promise<LeadContact> {
  const { data, error } = await supabase
    .from("lead_contacts")
    .insert({
      lead_id: params.leadId,
      client_id: params.clientId,
      name: params.name,
      role: params.role,
      phone: params.phone || null,
      email: params.email || null,
      notes: params.notes || null,
      ...tenantIdField(params.tenantId),
    })
    .select()
    .single();
  if (error) throw error;
  return data as LeadContact;
}

export async function updateLeadContact(
  id: string,
  updates: Partial<Pick<LeadContact, "name" | "role" | "phone" | "email" | "notes">>
): Promise<void> {
  const { error } = await supabase.from("lead_contacts").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteLeadContact(id: string): Promise<void> {
  const { error } = await supabase.from("lead_contacts").delete().eq("id", id);
  if (error) throw error;
}
