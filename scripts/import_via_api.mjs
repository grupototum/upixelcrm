#!/usr/bin/env node
/**
 * Importa os dados restantes (conversations, messages, tasks, timeline_events,
 * integrations, automations, automation_rules) no projeto Supabase novo.
 *
 * Pré-requisitos:
 *   - Node 18+ (tem fetch nativo)
 *   - Já ter rodado os blocos:
 *       1. scripts/import_users_v2.sql        (users + orgs + profiles)
 *       2. primeira parte do import_full_data.sql (pipelines + columns + leads)
 *
 * Uso:
 *   SUPABASE_URL=https://xusdhzwfkzufupjwbebt.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node scripts/import_via_api.mjs
 *
 * Ou: cria .env.migration com NEW_SUPABASE_URL + NEW_SUPABASE_SERVICE_ROLE_KEY
 * e roda sem variáveis.
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// ─── Config ────────────────────────────────────────────────────────────
async function loadEnv() {
  const envFromShell = {
    url: process.env.SUPABASE_URL || process.env.NEW_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEW_SUPABASE_SERVICE_ROLE_KEY,
  };
  if (envFromShell.url && envFromShell.key) return envFromShell;

  try {
    const text = await readFile(resolve(process.cwd(), '.env.migration'), 'utf8');
    const out = {};
    for (const line of text.split('\n')) {
      const m = line.match(/^([A-Z_]+)=(.+)$/);
      if (m) out[m[1]] = m[2].trim();
    }
    return {
      url: out.NEW_SUPABASE_URL,
      key: out.NEW_SUPABASE_SERVICE_ROLE_KEY,
    };
  } catch {
    return envFromShell;
  }
}

const { url, key } = await loadEnv();
if (!url || !key) {
  console.error('ERRO: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou crie .env.migration)');
  process.exit(1);
}

// ─── Carrega o dump JSON ───────────────────────────────────────────────
const dumpPath = resolve(process.cwd(), 'scripts', 'dump_data.json');
let dump;
try {
  dump = JSON.parse(await readFile(dumpPath, 'utf8'));
} catch (e) {
  console.error(`ERRO: não consegui ler ${dumpPath}`);
  console.error('Rode primeiro: node scripts/prepare_dump.mjs (ou peça ao Claude pra recriar)');
  process.exit(1);
}

// ─── Redaciona secrets nas integrations ────────────────────────────────
const SECRET_KEYS = new Set([
  'google_client_id', 'google_client_secret', 'access_token',
  'client_secret', 'api_key', 'refresh_token',
]);
for (const intg of dump.integrations || []) {
  intg.access_token = null;
  intg.refresh_token = null;
  intg.token_expires_at = null;
  const cfg = intg.config || {};
  for (const k of Object.keys(cfg)) {
    if (SECRET_KEYS.has(k)) cfg[k] = 'REDACTED';
  }
  intg.config = cfg;
  if (intg.status === 'connected') intg.status = 'needs_reconfig';
}

// ─── Upsert via PostgREST ──────────────────────────────────────────────
async function upsert(table, rows) {
  if (!rows || rows.length === 0) {
    console.log(`  ${table}: 0 rows (skip)`);
    return { ok: true, count: 0 };
  }
  const res = await fetch(`${url}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`  ✗ ${table}: ${res.status} ${err}`);
    return { ok: false, count: 0, error: err };
  }
  console.log(`  ✓ ${table}: ${rows.length} rows`);
  return { ok: true, count: rows.length };
}

// ─── Ordem correta de import (FK deps) ─────────────────────────────────
const order = [
  'pipelines',
  'pipeline_columns',
  'leads',
  'conversations',
  'messages',
  'tasks',
  'timeline_events',
  'integrations',
  'automations',
  'automation_rules',
];

console.log(`Destino: ${url}\n`);
let totalOk = 0;
let totalFail = 0;
for (const table of order) {
  const rows = dump[table] || [];
  const result = await upsert(table, rows);
  if (result.ok) totalOk += result.count;
  else totalFail++;
}

console.log(`\nTotal: ${totalOk} rows inseridas/atualizadas, ${totalFail} erros`);
process.exit(totalFail > 0 ? 1 : 0);
