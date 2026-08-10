import { supabase } from "@/integrations/supabase/client";
import { untypedFrom } from "@/lib/supabase-untyped";
import { invokeEdge } from "@/lib/edge-invoke";

// Repositório do domínio broadcast (whatsapp_templates, broadcast_campaigns,
// campaign_dispatch_logs, créditos e edge whatsapp-templates). A orquestração
// do disparo (throttle, retry, interpolação) permanece no useBroadcast.

export interface WhatsAppTemplateRow {
  id: string;
  name: string;
  category: string;
  content: string;
  status: string;
}

export async function listWhatsAppTemplates(clientId: string): Promise<WhatsAppTemplateRow[]> {
  const { data, error } = await supabase
    .from("whatsapp_templates")
    .select("id, name, category, content, status")
    .eq("client_id", clientId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Só templates aprovados (usado no slash command picker do inbox). */
export async function listApprovedWhatsAppTemplates(clientId: string): Promise<WhatsAppTemplateRow[]> {
  const { data, error } = await supabase
    .from("whatsapp_templates")
    .select("id, name, category, content, status")
    .eq("client_id", clientId)
    .eq("status", "APPROVED");
  if (error) return [];
  return data ?? [];
}

/** Saldo de créditos do tenant (integrations.provider = client_credits). */
export async function getClientCredits(clientId: string): Promise<number> {
  // integrations.config sem tipo gerado para este provider (schema drift)
  const { data, error } = await untypedFrom("integrations")
    .select("config")
    .eq("provider", "client_credits")
    .eq("client_id", clientId)
    .maybeSingle();
  if (error) throw error;
  return (data?.config as { balance?: number } | null)?.balance || 0;
}

/** Integração WhatsApp conectada do tenant (rota free ou oficial). */
export async function getConnectedWhatsAppIntegration(
  clientId: string,
  provider: "whatsapp" | "whatsapp_official"
): Promise<{ config: Record<string, string>; access_token?: string } | null> {
  const { data, error } = await untypedFrom("integrations")
    .select(provider === "whatsapp_official" ? "config, access_token" : "config")
    .eq("client_id", clientId)
    .eq("provider", provider)
    .eq("status", "connected")
    .maybeSingle();
  if (error) throw error;
  return (data as { config: Record<string, string>; access_token?: string } | null) ?? null;
}

export async function insertBroadcastCampaign(row: Record<string, unknown>): Promise<void> {
  const { error } = await untypedFrom("broadcast_campaigns").insert(row);
  if (error) throw error;
}

/** Logs de disparo (CampaignsPage/BroadcastsTab). Tabela fora dos tipos gerados. */
export async function listCampaignDispatchLogs<T>(clientId: string, limit = 500): Promise<T[]> {
  const { data, error } = await untypedFrom("campaign_dispatch_logs")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error(error);
    return [];
  }
  return (data || []) as T[];
}

export async function updateBroadcastCampaign(id: string, updates: Record<string, unknown>): Promise<void> {
  const { error } = await untypedFrom("broadcast_campaigns").update(updates).eq("id", id);
  if (error) throw error;
}

export async function logCampaignDispatch(row: Record<string, unknown>): Promise<void> {
  const { error } = await untypedFrom("campaign_dispatch_logs").insert(row);
  if (error) throw error;
}

/** Edge whatsapp-templates (list/create na Meta Graph API). */
export async function invokeWhatsAppTemplates<T>(
  action: string,
  body: Record<string, unknown>
): Promise<{ data: T | null; error: Error | null }> {
  const { data, error } = await invokeEdge(`whatsapp-templates?action=${action}`, { body });
  return { data: data as T | null, error: (error as Error) ?? null };
}
