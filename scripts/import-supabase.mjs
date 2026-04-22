#!/usr/bin/env node
/* eslint-disable */
/**
 * Importa os dados exportados para o projeto Supabase NOVO.
 *
 * Uso:
 *   node scripts/import-supabase.mjs
 *
 * Requer variáveis de ambiente:
 *   NEW_SUPABASE_URL                 — URL do projeto novo
 *   NEW_SUPABASE_SERVICE_ROLE_KEY    — Service Role Key
 *
 * IMPORTANTE:
 *   1. Aplique TODAS as migrations SQL no projeto novo ANTES de rodar este script
 *   2. Usuários serão recriados com nova senha aleatória — eles precisarão
 *      usar "Esqueci minha senha" para redefinir
 *   3. Este script faz UPSERT por id — roda idempotente
 */

import { createClient } from "@supabase/supabase-js";
import { readFile, access } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

const NEW_URL = process.env.NEW_SUPABASE_URL;
const NEW_KEY = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY;

if (!NEW_URL || !NEW_KEY) {
  console.error("❌ Variáveis NEW_SUPABASE_URL e NEW_SUPABASE_SERVICE_ROLE_KEY são obrigatórias.");
  process.exit(1);
}

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

const supabase = createClient(NEW_URL, NEW_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function importAuthUsers() {
  const path = join(DUMP_DIR, "auth-users.json");
  if (!(await fileExists(path))) {
    console.log("⊘  auth-users.json não encontrado, ignorando");
    return;
  }

  const users = JSON.parse(await readFile(path, "utf-8"));
  let created = 0;
  let skipped = 0;

  for (const u of users) {
    // Senha temporária aleatória — o usuário deve redefinir via "Esqueci senha"
    const tempPassword = randomBytes(32).toString("hex");

    const { error } = await supabase.auth.admin.createUser({
      id: u.id,              // preserva o UUID para manter FKs intactas
      email: u.email,
      phone: u.phone ?? undefined,
      password: tempPassword,
      email_confirm: !!u.email_confirmed_at,
      phone_confirm: !!u.phone_confirmed_at,
      user_metadata: u.user_metadata ?? {},
      app_metadata: u.app_metadata ?? {},
    });

    if (error) {
      if (error.message?.includes("already") || error.status === 422) {
        skipped++;
      } else {
        console.error(`  ✗  ${u.email}: ${error.message}`);
      }
    } else {
      created++;
    }
  }

  console.log(`✓  auth.users              ${created} criados, ${skipped} já existiam`);
}

async function importTable(table) {
  const path = join(DUMP_DIR, `${table}.json`);
  if (!(await fileExists(path))) {
    console.log(`⊘  ${table.padEnd(35)} — arquivo não encontrado, ignorando`);
    return;
  }

  const rows = JSON.parse(await readFile(path, "utf-8"));
  if (!rows.length) {
    console.log(`-  ${table.padEnd(35)} 0 rows`);
    return;
  }

  // Upsert em lotes para tabelas grandes
  const BATCH_SIZE = 500;
  let total = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from(table).upsert(batch, { onConflict: "id" });
    if (error) {
      console.error(`✗  ${table}: ${error.message}`);
      return;
    }
    total += batch.length;
  }
  console.log(`✓  ${table.padEnd(35)} ${total} rows`);
}

async function main() {
  console.log(`\n📥 Importando para ${NEW_URL}\n`);

  // 1) Recriar usuários auth primeiro (profiles dependem deles)
  await importAuthUsers();

  // 2) Tabelas públicas em ordem de dependência
  for (const table of TABLES) {
    await importTable(table);
  }

  console.log(`\n✅ Import concluído!\n`);
  console.log("ATENÇÃO: todos os usuários receberam senhas temporárias aleatórias.");
  console.log('Instrua-os a usar "Esqueci minha senha" para redefinir.\n');
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
