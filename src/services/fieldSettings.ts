import { supabase } from "@/integrations/supabase/client";
import { tenantIdField } from "@/lib/tenant-utils";
import type { ClientFieldSettings, StandardFieldConfig } from "@/types";

export const DEFAULT_FIELD_CONFIG: StandardFieldConfig[] = [
  { key: "state", label: "Estado", enabled: true, order: 1 },
  { key: "city", label: "Cidade", enabled: true, order: 2 },
  { key: "neighborhood", label: "Bairro", enabled: false, order: 3 },
  { key: "address", label: "Endereço", enabled: false, order: 4 },
  { key: "zip_code", label: "CEP", enabled: false, order: 5 },
];

export async function getFieldSettings(clientId: string, tenantId?: string | null): Promise<StandardFieldConfig[]> {
  const { data, error } = await supabase
    .from("client_field_settings")
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle();
  if (error) throw error;
  if (data) return data.field_config as unknown as StandardFieldConfig[];

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
