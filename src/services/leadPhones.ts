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

/** Telefone extra reduzido ao que o card do Kanban precisa. */
export type BoardLeadPhone = Pick<LeadPhone, "lead_id" | "number" | "category">;

/**
 * Todos os telefones extras do tenant, paginados (RLS limita ao client).
 * Alimenta o botão de WhatsApp dos cards do board — 1 query em lote em vez
 * de 1 fetch por card. Order estável garante "primeiro telefone" consistente.
 */
export async function listLeadPhonesByClient(): Promise<BoardLeadPhone[]> {
  const PAGE = 1000;
  const all: BoardLeadPhone[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("lead_phones")
      .select("lead_id, number, category")
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    all.push(...((data ?? []) as BoardLeadPhone[]));
    if (!data || data.length < PAGE) break;
  }
  return all;
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
