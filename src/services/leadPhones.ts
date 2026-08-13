import { supabase } from "@/integrations/supabase/client";
import { tenantIdField } from "@/lib/tenant-utils";
import type { LeadPhone, PhoneCategory } from "@/types";

export async function getLeadPhones(leadId: string): Promise<LeadPhone[]> {
  const { data, error } = await supabase
    .from("lead_phones")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as LeadPhone[];
}

export async function createLeadPhone(params: {
  leadId: string;
  clientId: string;
  tenantId?: string | null;
  number: string;
  category: PhoneCategory;
  label?: string;
}): Promise<LeadPhone> {
  const { data, error } = await supabase
    .from("lead_phones")
    .insert({
      lead_id: params.leadId,
      client_id: params.clientId,
      number: params.number,
      category: params.category,
      label: params.label || null,
      ...tenantIdField(params.tenantId),
    })
    .select()
    .single();
  if (error) throw error;
  return data as LeadPhone;
}

export async function updateLeadPhone(
  id: string,
  updates: Partial<Pick<LeadPhone, "number" | "category" | "label">>
): Promise<void> {
  const { error } = await supabase.from("lead_phones").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteLeadPhone(id: string): Promise<void> {
  const { error } = await supabase.from("lead_phones").delete().eq("id", id);
  if (error) throw error;
}
