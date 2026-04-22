#!/usr/bin/env node
/* eslint-disable */
/**
 * Exporta todos os dados do projeto Supabase antigo para arquivos JSON locais.
 *
 * Uso:
 *   node scripts/export-supabase.mjs
 *
 * Requer variáveis de ambiente:
 *   OLD_SUPABASE_URL                 — URL do projeto antigo
 *   OLD_SUPABASE_SERVICE_ROLE_KEY    — Service Role Key (NÃO a anon key!)
 *
 * Saída: ./migration-dump/<tabela>.json + ./migration-dump/auth-users.json
 */

import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const OLD_URL = process.env.OLD_SUPABASE_URL;
const OLD_KEY = process.env.OLD_SUPABASE_SERVICE_ROLE_KEY;

if (!OLD_URL || !OLD_KEY) {
  console.error("❌ Variáveis OLD_SUPABASE_URL e OLD_SUPABASE_SERVICE_ROLE_KEY são obrigatórias.");
  process.exit(1);
}

// Ordem respeita dependências de FK (pais primeiro)
const TABLES = [
  "tenants",
  "organizations",
  "role_permissions",
  "profiles",
  "pipelines",
  "pipeline_columns",
  "leads",
  "tasks",
  "timeline_events",
  "conversations",
  "messages",
  "conversation_labels",
  "conversation_label_assignments",
  "canned_responses",
  "automations",
  "automation_rules",
  "integrations",
  "webhook_endpoints",
  "webhook_deliveries",
  "api_keys",
  "client_credits",
  "recharge_intents",
  "whatsapp_templates",
  "push_subscriptions",
  "audit_log",
];

const DUMP_DIR = "./migration-dump";

const supabase = createClient(OLD_URL, OLD_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function exportTable(table) {
  const { data, error } = await supabase.from(table).select("*");
  if (error) {
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      console.log(`⊘  ${table.padEnd(35)} — tabela não existe, ignorando`);
      return { skipped: true };
    }
    console.error(`✗  ${table}: ${error.message}`);
    return { error };
  }
  await writeFile(join(DUMP_DIR, `${table}.json`), JSON.stringify(data, null, 2));
  console.log(`✓  ${table.padEnd(35)} ${data.length} rows`);
  return { count: data.length };
}

async function exportAuthUsers() {
  const allUsers = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error(`✗  auth.users: ${error.message}`);
      return;
    }
    allUsers.push(...data.users);
    if (data.users.length < perPage) break;
    page++;
  }

  // Remove objetos grandes e não-essenciais
  const slim = allUsers.map((u) => ({
    id: u.id,
    email: u.email,
    phone: u.phone,
    email_confirmed_at: u.email_confirmed_at,
    phone_confirmed_at: u.phone_confirmed_at,
    created_at: u.created_at,
    user_metadata: u.user_metadata,
    app_metadata: u.app_metadata,
  }));

  await writeFile(join(DUMP_DIR, "auth-users.json"), JSON.stringify(slim, null, 2));
  console.log(`✓  ${"auth.users".padEnd(35)} ${slim.length} users`);
}

async function main() {
  await mkdir(DUMP_DIR, { recursive: true });
  console.log(`\n📦 Exportando de ${OLD_URL}\n`);

  await exportAuthUsers();

  for (const table of TABLES) {
    await exportTable(table);
  }

  console.log(`\n✅ Export concluído em ${DUMP_DIR}/\n`);
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
