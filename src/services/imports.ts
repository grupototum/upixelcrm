import { untypedFrom } from "@/lib/supabase-untyped";
import { normalizePhoneKey } from "@/utils/phone";

// Repositório do domínio "importação de leads": histórico (import_logs),
// rollback por batch, checagem de duplicatas e agregações de relatório.
//
// DEFENSIVO: a tabela import_logs e a coluna leads.import_batch_id só existem
// após aplicar as migrations 20260722120000 / 20260722120100. Enquanto não
// aplicadas, as funções de log/rollback/relatório degradam graciosamente
// (retornam vazio / no-op) SEM quebrar o fluxo de importação existente.

export interface ImportLogRow {
  id: string;
  client_id: string;
  tenant_id: string | null;
  user_id: string | null;
  batch_id: string;
  filename: string | null;
  total_rows: number;
  inserted: number;
  updated: number;
  skipped: number;
  skipped_no_name: number;
  skipped_duplicate: number;
  errors: number;
  rolled_back_at: string | null;
  created_at: string;
}

// Probes memoizadas — checam UMA vez por sessão se o schema novo existe.
let batchColumnAvailable: boolean | null = null;
let importLogsAvailable: boolean | null = null;

/** true se a coluna leads.import_batch_id já existe no banco. */
export async function hasImportBatchColumn(): Promise<boolean> {
  if (batchColumnAvailable !== null) return batchColumnAvailable;
  const { error } = await untypedFrom("leads").select("import_batch_id").limit(1);
  batchColumnAvailable = !error;
  return batchColumnAvailable;
}

/** true se a tabela import_logs já existe no banco. */
export async function hasImportLogsTable(): Promise<boolean> {
  if (importLogsAvailable !== null) return importLogsAvailable;
  const { error } = await untypedFrom("import_logs").select("id").limit(1);
  importLogsAvailable = !error;
  return importLogsAvailable;
}

/** Grava um registro de importação (best-effort — no-op se a tabela não existe). */
export async function insertImportLog(row: {
  client_id: string;
  tenant_id?: string | null;
  user_id?: string | null;
  batch_id: string;
  filename?: string | null;
  total_rows: number;
  inserted: number;
  updated?: number;
  skipped: number;
  skipped_no_name: number;
  skipped_duplicate: number;
  errors: number;
}): Promise<void> {
  if (!(await hasImportLogsTable())) return;
  try {
    await untypedFrom("import_logs").insert({ updated: 0, ...row });
  } catch {
    // silencioso — o histórico é auxiliar, não pode derrubar a importação.
  }
}

/** Lista o histórico de importações do tenant (paginado). */
export async function listImportLogs(
  clientId: string,
  masterView: boolean,
  from: number,
  to: number,
): Promise<{ rows: ImportLogRow[]; count: number }> {
  if (!(await hasImportLogsTable())) return { rows: [], count: 0 };
  let q = untypedFrom("import_logs").select("*", { count: "exact" });
  if (!masterView) q = q.eq("client_id", clientId);
  const { data, error, count } = await q
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw error;
  return { rows: (data as unknown as ImportLogRow[]) ?? [], count: count ?? 0 };
}

/**
 * Desfaz uma importação: deleta os leads do batch (escopo client_id) e marca
 * o log com rolled_back_at. Retorna quantos leads foram removidos.
 */
export async function rollbackImportBatch(
  batchId: string,
  clientId: string,
): Promise<number> {
  // Conta antes de deletar (para feedback).
  const { count } = await untypedFrom("leads")
    .select("id", { count: "exact", head: true })
    .eq("import_batch_id", batchId)
    .eq("client_id", clientId);

  const { error } = await untypedFrom("leads")
    .delete()
    .eq("import_batch_id", batchId)
    .eq("client_id", clientId);
  if (error) throw error;

  try {
    await untypedFrom("import_logs")
      .update({ rolled_back_at: new Date().toISOString() })
      .eq("batch_id", batchId)
      .eq("client_id", clientId);
  } catch {
    // se a atualização do log falhar, os leads já foram removidos — ok.
  }

  return count ?? 0;
}

/**
 * Checa quantos contatos do arquivo já existem na base (por telefone
 * normalizado ou email). Retorna as chaves que colidem para o preview.
 * Carrega telefones/emails existentes paginado (evita depender do estado local).
 */
export async function loadExistingContactKeys(
  clientId: string,
): Promise<{ phones: Set<string>; emails: Set<string> }> {
  const phones = new Set<string>();
  const emails = new Set<string>();
  const PAGE = 1000;
  for (let page = 0; page < 60; page++) {
    const from = page * PAGE;
    const to = from + PAGE - 1;
    const { data, error } = await untypedFrom("leads")
      .select("phone, email")
      .eq("client_id", clientId)
      .range(from, to);
    if (error) break;
    const rows = (data as unknown as { phone: string | null; email: string | null }[]) ?? [];
    if (rows.length === 0) break;
    for (const r of rows) {
      if (r.phone) phones.add(normalizePhoneKey(r.phone));
      if (r.email) emails.add(r.email.trim().toLowerCase());
    }
    if (rows.length < PAGE) break;
  }
  return { phones, emails };
}

export interface ExistingLead {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
  city: string | null;
  position: string | null;
  origin: string | null;
  tags: string[] | null;
}

/**
 * Índice de leads existentes por telefone/email (para upsert: atualizar/merge).
 * Carrega paginado. Só é chamado quando o modo de duplicata NÃO é "ignorar".
 */
export async function loadExistingLeadsIndex(
  clientId: string,
): Promise<{ byPhone: Map<string, ExistingLead>; byEmail: Map<string, ExistingLead> }> {
  const byPhone = new Map<string, ExistingLead>();
  const byEmail = new Map<string, ExistingLead>();
  const PAGE = 1000;
  for (let page = 0; page < 60; page++) {
    const from = page * PAGE;
    const to = from + PAGE - 1;
    const { data, error } = await untypedFrom("leads")
      .select("id, name, phone, email, company, city, position, origin, tags")
      .eq("client_id", clientId)
      .range(from, to);
    if (error) break;
    const rows = (data as unknown as ExistingLead[]) ?? [];
    if (rows.length === 0) break;
    for (const r of rows) {
      if (r.phone) {
        const k = normalizePhoneKey(r.phone);
        if (k && !byPhone.has(k)) byPhone.set(k, r);
      }
      if (r.email) {
        const e = r.email.trim().toLowerCase();
        if (!byEmail.has(e)) byEmail.set(e, r);
      }
    }
    if (rows.length < PAGE) break;
  }
  return { byPhone, byEmail };
}

/** Leads de um batch (para relatório e export). Inclui id para aplicar tags. */
export async function listLeadsByBatch(
  batchId: string,
  clientId: string,
): Promise<Record<string, unknown>[]> {
  const { data, error } = await untypedFrom("leads")
    .select("id, name, phone, email, company, city, position, origin, tags")
    .eq("import_batch_id", batchId)
    .eq("client_id", clientId);
  if (error) throw error;
  return (data as unknown as Record<string, unknown>[]) ?? [];
}
