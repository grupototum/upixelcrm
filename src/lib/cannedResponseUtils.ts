export interface CannedResponseContext {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  company?: string | null;
}

export function interpolateCannedResponse(
  template: string,
  lead: CannedResponseContext | null | undefined,
  agentName?: string | null,
): string {
  if (!template) return template;

  const name = lead?.name?.trim() || "Cliente";
  const phone = lead?.phone?.trim() || "";
  const email = lead?.email?.trim() || "";
  const company = lead?.company?.trim() || "";
  const agent = agentName?.trim() || "Atendente";

  return template
    .replace(/\{\{\s*contact\.name\s*\}\}/g, name)
    .replace(/\{\{\s*lead\.name\s*\}\}/g, name)
    .replace(/\{\{\s*contact\.phone\s*\}\}/g, phone)
    .replace(/\{\{\s*lead\.phone\s*\}\}/g, phone)
    .replace(/\{\{\s*contact\.email\s*\}\}/g, email)
    .replace(/\{\{\s*lead\.email\s*\}\}/g, email)
    .replace(/\{\{\s*contact\.company\s*\}\}/g, company)
    .replace(/\{\{\s*lead\.company\s*\}\}/g, company)
    .replace(/\{\{\s*agent\.name\s*\}\}/g, agent);
}
