import { supabase } from "@/integrations/supabase/client";

// Repositório do edge database-backup (DatabaseBackupPage). Wrapper fino sobre
// supabase.functions.invoke — mesma assinatura de retorno ({data, error}) do
// SDK, então os callers mantêm exatamente o mesmo tratamento de erro.

function invokeBackup(action: string, body?: BodyInit, contentType?: string) {
  return supabase.functions.invoke(`database-backup?action=${action}`, {
    body,
    headers: contentType ? { "Content-Type": contentType } : undefined,
  });
}

export function getBackupStatus() {
  return invokeBackup("status");
}

export function listBackupRuns() {
  return invokeBackup("list");
}

export function saveBackupConfig(config: unknown) {
  return invokeBackup("config-save", JSON.stringify(config), "application/json");
}

export function exportBackup() {
  return invokeBackup("export");
}

export function getBackupDownloadUrl(path: string) {
  return invokeBackup(`download&path=${encodeURIComponent(path)}`);
}

export function validateRestoreFile(file: File) {
  const form = new FormData();
  form.append("file", file);
  return supabase.functions.invoke("database-backup?action=restore-validate", { body: form });
}

export function executeRestore(file: File) {
  const form = new FormData();
  form.append("file", file);
  return supabase.functions.invoke("database-backup?action=restore-execute", { body: form });
}

export function compareBackupSchema(file: File) {
  const form = new FormData();
  form.append("file", file);
  return supabase.functions.invoke("database-backup?action=schema-compare", { body: form });
}
