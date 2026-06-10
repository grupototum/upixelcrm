import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Acesso a tabelas que ainda NÃO existem nos tipos gerados
 * (src/integrations/supabase/types.ts) — criadas depois da última
 * geração de tipos (ex.: instagram_auto_replies, ad_campaigns, notes)
 * ou com schema divergente (ex.: tags.client_id).
 *
 * Ao regerar os tipos do Supabase, migre as chamadas de volta para
 * `supabase.from(...)` tipado e remova o uso deste helper.
 */
const untypedClient = supabase as unknown as SupabaseClient;

export function untypedFrom(table: string) {
  return untypedClient.from(table);
}
