import { supabase } from "@/integrations/supabase/client";
import { untypedFrom } from "@/lib/supabase-untyped";

export interface SavedView {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  is_shared: boolean;
  user_id: string | null;
}

/** Views do escopo, do tenant atual. RLS já filtra próprias + compartilhadas. */
export async function listSavedViews(clientId: string, scope = "crm"): Promise<SavedView[]> {
  const { data, error } = await untypedFrom("saved_views")
    .select("id, name, filters, is_shared, user_id")
    .eq("client_id", clientId)
    .eq("scope", scope)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data as SavedView[]) ?? [];
}

export async function createSavedView(row: {
  client_id: string;
  tenant_id?: string | null;
  name: string;
  filters: Record<string, unknown>;
  is_shared?: boolean;
  scope?: string;
}): Promise<SavedView> {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await untypedFrom("saved_views")
    .insert({ ...row, scope: row.scope ?? "crm", user_id: auth.user?.id })
    .select("id, name, filters, is_shared, user_id")
    .single();
  if (error) throw error;
  return data as SavedView;
}

export async function deleteSavedView(id: string): Promise<void> {
  const { error } = await untypedFrom("saved_views").delete().eq("id", id);
  if (error) throw error;
}
