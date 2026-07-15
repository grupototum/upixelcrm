import { supabase } from "@/integrations/supabase/client";
import { untypedFrom } from "@/lib/supabase-untyped";
import { invokeEdge } from "@/lib/edge-invoke";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

// Repositório do domínio integrations (integrations, api_keys, webhook_endpoints,
// ad_campaigns e edge functions de provedores). Funções puras de acesso a dados;
// toast/estado ficam nos hooks e componentes.

export type IntegrationRow = Tables<"integrations">;

// ---- integrations ----

export async function listIntegrations(clientId: string, provider: string): Promise<IntegrationRow[]> {
  const { data, error } = await supabase
    .from("integrations")
    .select("*")
    .eq("provider", provider)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function insertIntegration(row: TablesInsert<"integrations">): Promise<IntegrationRow> {
  const { data, error } = await supabase.from("integrations").insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function updateIntegration(id: string, updates: TablesUpdate<"integrations">): Promise<void> {
  const { error } = await supabase
    .from("integrations")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteIntegration(id: string): Promise<void> {
  const { error } = await supabase.from("integrations").delete().eq("id", id);
  if (error) throw error;
}

// ---- ad_campaigns ----
// ponytail: tabela ainda não existe em prod nem nos tipos gerados — em erro
// (404) retorna [] e o cache passa a popular quando a tabela for criada.

export async function listAdCampaigns<T>(clientId: string, platform: "meta" | "google"): Promise<T[]> {
  try {
    const { data, error } = await untypedFrom("ad_campaigns")
      .select("*")
      .eq("client_id", clientId)
      .eq("platform", platform)
      .order("spend", { ascending: false });
    if (error) return [];
    return (data ?? []) as T[];
  } catch {
    return [];
  }
}

// ---- api_keys / webhook_endpoints ----
// Tabelas fora dos tipos gerados (schema drift) — via untypedFrom.

export async function listApiKeys<T>(): Promise<T[]> {
  const { data, error } = await untypedFrom("api_keys")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as T[];
}

export async function createApiKey<T>(row: Record<string, unknown>): Promise<T> {
  const { data, error } = await untypedFrom("api_keys").insert(row).select().single();
  if (error) throw error;
  return data as T;
}

export async function deactivateApiKey(id: string): Promise<void> {
  const { error } = await untypedFrom("api_keys").update({ active: false }).eq("id", id);
  if (error) throw error;
}

export async function deleteApiKey(id: string): Promise<void> {
  const { error } = await untypedFrom("api_keys").delete().eq("id", id);
  if (error) throw error;
}

export async function listWebhookEndpoints<T>(): Promise<T[]> {
  const { data, error } = await untypedFrom("webhook_endpoints")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as T[];
}

export async function createWebhookEndpoint<T>(row: Record<string, unknown>): Promise<T> {
  const { data, error } = await untypedFrom("webhook_endpoints").insert(row).select().single();
  if (error) throw error;
  return data as T;
}

export async function updateWebhookEndpoint(id: string, updates: Record<string, unknown>): Promise<void> {
  const { error } = await untypedFrom("webhook_endpoints").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteWebhookEndpoint(id: string): Promise<void> {
  const { error } = await untypedFrom("webhook_endpoints").delete().eq("id", id);
  if (error) throw error;
}

// ---- edge functions de provedores ----
// invokeEdge cuida de refresh de sessão e retry em 401.

export async function invokeWhatsAppProxy<T>(
  action: string,
  opts: { type: "normal" | "official"; instanceName?: string },
  body?: Record<string, unknown>
): Promise<T> {
  const params = new URLSearchParams({ action, type: opts.type });
  if (opts.instanceName) params.set("instance_name", opts.instanceName);
  const { data, error } = await invokeEdge(`whatsapp-proxy?${params}`, body ? { body } : undefined);
  if (error) throw new Error(error.message || "Request failed");
  return data as T;
}

export async function invokeMetaAds<T>(action: string, body?: Record<string, unknown>): Promise<T> {
  const { data, error } = await invokeEdge(`meta-ads?action=${action}`, body ? { body } : undefined);
  if (error) throw error;
  return data as T;
}

export async function invokeGoogleAds<T>(action: string, body?: Record<string, unknown>): Promise<T> {
  const { data, error } = await invokeEdge(`google-ads?action=${action}`, body ? { body } : undefined);
  if (error) throw error;
  return data as T;
}
