import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

const MENTION_REGEX = /@([a-zA-Z0-9_.\-]{2,32})/g;

export function extractMentions(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(MENTION_REGEX)) {
    found.add(match[1].toLowerCase());
  }
  return Array.from(found);
}

function buildSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 32);
}

interface NotifyMentionsParams {
  clientId: string;
  authorId: string | null | undefined;
  text: string;
  leadId?: string | null;
  leadName?: string | null;
}

export async function notifyMentions(params: NotifyMentionsParams): Promise<number> {
  const handles = extractMentions(params.text);
  if (handles.length === 0) return 0;

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, name, email")
    .eq("client_id", params.clientId);

  if (error) {
    logger.error("notifyMentions: profiles query failed", error);
    return 0;
  }

  const matched = (profiles ?? []).filter(p => {
    if (p.id === params.authorId) return false;
    const slug = buildSlug(p.name ?? "");
    const emailHandle = (p.email ?? "").split("@")[0]?.toLowerCase() ?? "";
    return handles.includes(slug) || handles.includes(emailHandle);
  });

  if (matched.length === 0) return 0;

  const rows = matched.map(p => ({
    client_id: params.clientId,
    user_id: p.id,
    title: params.leadName ? `Você foi mencionado em ${params.leadName}` : "Você foi mencionado",
    body: params.text.length > 200 ? `${params.text.slice(0, 200)}…` : params.text,
    type: "mention",
    lead_id: params.leadId ?? null,
  }));

  const { error: insertError } = await supabase.from("notifications").insert(rows);
  if (insertError) {
    logger.error("notifyMentions: insert failed", insertError);
    return 0;
  }
  return matched.length;
}
