import { supabase } from "@/integrations/supabase/client";
import { tenantIdField } from "@/lib/tenant-utils";
import type { ClientFieldSettings, StandardFieldConfig } from "@/types";

export const DEFAULT_FIELD_CONFIG: StandardFieldConfig[] = [
  { key: "state", label: "Estado", enabled: true, order: 1 },
  { key: "city", label: "Cidade", enabled: true, order: 2 },
  { key: "neighborhood", label: "Bairro", enabled: false, order: 3 },
  { key: "address", label: "Endereço", enabled: false, order: 4 },
  { key: "zip_code", label: "CEP", enabled: false, order: 5 },
  // Segmento e Origem eram campos fixos do formulário (colunas leads.segmento
  // e leads.origin já existentes) — entram habilitados por padrão pra manter
  // o comportamento atual de "sempre visíveis".
  { key: "segmento", label: "Segmento", enabled: true, order: 6 },
  { key: "origin", label: "Origem", enabled: true, order: 7 },
];

export async function getFieldSettings(clientId: string, tenantId?: string | null): Promise<StandardFieldConfig[]> {
  const { data, error } = await supabase
    .from("client_field_settings")
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle();
  if (error) throw error;
  if (data) return mergeWithDefaults(data.field_config as unknown as StandardFieldConfig[]);

  const { error: upsertError } = await supabase
    .from("client_field_settings")
    .upsert({
      client_id: clientId,
      field_config: DEFAULT_FIELD_CONFIG as unknown as ClientFieldSettings["field_config"],
      ...tenantIdField(tenantId),
    }, { onConflict: "client_id" });
  if (upsertError) throw upsertError;
  return DEFAULT_FIELD_CONFIG;
}

/**
 * Tenants com field_config salvo antes desta feature não têm as keys novas
 * (segmento/origin) — sem isso, os campos somem do form pra quem já configurou
 * algo antes. Appenda só o que falta, sem alterar o que o tenant já escolheu.
 */
function mergeWithDefaults(saved: StandardFieldConfig[]): StandardFieldConfig[] {
  const savedKeys = new Set(saved.map((f) => f.key));
  const missing = DEFAULT_FIELD_CONFIG.filter((f) => !savedKeys.has(f.key));
  return missing.length > 0 ? [...saved, ...missing] : saved;
}

export async function saveFieldSettings(
  clientId: string,
  config: StandardFieldConfig[],
  tenantId?: string | null
): Promise<void> {
  const { error } = await supabase
    .from("client_field_settings")
    .upsert({
      client_id: clientId,
      field_config: config as unknown as ClientFieldSettings["field_config"],
      ...tenantIdField(tenantId),
    }, { onConflict: "client_id" });
  if (error) throw error;
}
