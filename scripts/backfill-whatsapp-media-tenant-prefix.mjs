#!/usr/bin/env node
/**
 * PC-038 (b) — Backfill: move mídia da raiz do bucket `whatsapp_media` para
 * `{client_id}/{filename}`.
 *
 * Contexto: até o commit 3dce29e todos os uploads gravavam na raiz do bucket,
 * sem prefixo de tenant. Sem prefixo, nenhuma policy de storage consegue dizer
 * de quem é o arquivo — `(storage.foldername(name))[1]` devolve NULL para objeto
 * na raiz. Este script atribui cada objeto ao seu tenant ANTES de o bucket ser
 * fechado (passos d/e), senão o histórico de mídia morre no instante do fecho.
 *
 * Como o objeto na raiz não carrega tenant nenhum, a atribuição é feita pelo
 * caminho inverso: acha a mensagem que referencia aquele arquivo e lê o
 * `client_id` dela.
 *
 * NÃO deleta o original. A cópia é aditiva e o rollback é reverter o banco
 * (ver --rollback-sql). A limpeza dos originais é um passo separado, posterior
 * à confirmação de que o bucket fechado funciona.
 *
 * Uso:
 *   node scripts/backfill-whatsapp-media-tenant-prefix.mjs             # dry-run (padrão)
 *   node scripts/backfill-whatsapp-media-tenant-prefix.mjs --apply     # executa
 *   node scripts/backfill-whatsapp-media-tenant-prefix.mjs --apply --limit 50
 *
 * Requer:
 *   SUPABASE_URL                — URL do projeto
 *   SUPABASE_SERVICE_ROLE_KEY   — Service Role Key (NÃO a anon key)
 *
 * Saída: ./migration-dump/backfill-whatsapp-media-<timestamp>.json
 */

import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "whatsapp_media";
const PAGE = 100;

if (!URL_ || !KEY) {
  console.error("❌ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.");
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");
const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;

const db = createClient(URL_, KEY, { auth: { persistSession: false } });

/** Extrai o nome do arquivo de uma URL pública ou de um path já prefixado. */
function basenameOf(value) {
  if (!value || typeof value !== "string") return null;
  const withoutQuery = value.split("?")[0];
  const marker = `/${BUCKET}/`;
  const idx = withoutQuery.indexOf(marker);
  const tail = idx > -1 ? withoutQuery.slice(idx + marker.length) : withoutQuery;
  // Já prefixado (tem barra) → não é candidato a backfill.
  if (tail.includes("/")) return null;
  return tail || null;
}

/** Lista TODOS os objetos na raiz do bucket (entradas sem barra no nome). */
async function listRootObjects() {
  const out = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await db.storage
      .from(BUCKET)
      .list("", { limit: PAGE, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`storage.list falhou: ${error.message}`);
    if (!data?.length) break;
    // Pastas vêm com id === null — descarta, só queremos arquivos da raiz.
    out.push(...data.filter((o) => o.id !== null).map((o) => o.name));
    if (data.length < PAGE) break;
  }
  return out;
}

/**
 * Mapeia arquivo-da-raiz → { client_id, messages[] }, lendo as mensagens que
 * referenciam a mídia. Uma mesma mídia pode ser citada por mais de uma mensagem.
 */
async function buildOwnershipMap() {
  const map = new Map();
  const conflicts = [];

  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("messages")
      .select("id, client_id, content, metadata")
      .not("metadata->>media_url", "is", null)
      .range(from, from + 999);
    if (error) throw new Error(`select messages falhou: ${error.message}`);
    if (!data?.length) break;

    for (const msg of data) {
      const mediaUrl = msg.metadata?.media_url;
      const file = basenameOf(mediaUrl);
      if (!file) continue;

      const entry = map.get(file);
      if (!entry) {
        map.set(file, {
          clientId: msg.client_id,
          messages: [{ id: msg.id, mediaUrl, contentMatches: msg.content === mediaUrl }],
        });
      } else if (entry.clientId !== msg.client_id) {
        // Dois tenants apontando pro mesmo arquivo: não dá pra atribuir com
        // segurança. Fica de fora e é reportado.
        conflicts.push({ file, clients: [entry.clientId, msg.client_id] });
      } else {
        entry.messages.push({ id: msg.id, mediaUrl, contentMatches: msg.content === mediaUrl });
      }
    }
    if (data.length < 1000) break;
  }

  for (const c of conflicts) map.delete(c.file);
  return { map, conflicts };
}

async function main() {
  console.log(`\n${APPLY ? "🚀 APLICANDO" : "🔍 DRY-RUN (nada será alterado)"} — bucket ${BUCKET}\n`);

  const rootFiles = await listRootObjects();
  console.log(`objetos na raiz do bucket: ${rootFiles.length}`);

  const { map, conflicts } = await buildOwnershipMap();
  console.log(`arquivos referenciados por mensagens: ${map.size}`);
  if (conflicts.length) console.log(`⚠️  conflito de tenant (ignorados): ${conflicts.length}`);

  const planned = [];
  const orphans = [];
  for (const file of rootFiles) {
    const owner = map.get(file);
    if (!owner) { orphans.push(file); continue; }
    planned.push({
      from: file,
      to: `${owner.clientId}/${file}`,
      clientId: owner.clientId,
      messages: owner.messages,
    });
  }

  console.log(`\n📦 a migrar: ${planned.length}`);
  console.log(`🕳️  órfãos (sem mensagem — NÃO migrados): ${orphans.length}`);
  if (orphans.length) {
    console.log(`   ⚠️  Órfão não tem tenant identificável. Deixar na raiz significa que`);
    console.log(`      ele fica inacessível quando o bucket fechar. Revisar manualmente.`);
    console.log(`      Primeiros 10: ${orphans.slice(0, 10).join(", ")}`);
  }

  const results = { migrated: [], failed: [], skipped: orphans, conflicts };

  let count = 0;
  for (const item of planned) {
    if (count >= LIMIT) break;
    count++;

    if (!APPLY) {
      console.log(`  [dry] ${item.from} → ${item.to}  (${item.messages.length} msg)`);
      results.migrated.push(item);
      continue;
    }

    // 1) Copia o objeto. NÃO usa move() — o original fica para rollback.
    const { error: copyErr } = await db.storage.from(BUCKET).copy(item.from, item.to);
    if (copyErr && !/already exists|Duplicate/i.test(copyErr.message)) {
      console.error(`  ❌ copy ${item.from}: ${copyErr.message}`);
      results.failed.push({ ...item, error: copyErr.message });
      continue;
    }

    // 2) Atualiza cada mensagem: metadata.media_url passa a ser o PATH.
    //    `content` também guarda a URL quando é mensagem de mídia — só troca
    //    se for exatamente a mesma URL, para não sobrescrever legenda.
    let msgErr = null;
    for (const m of item.messages) {
      const { data: current, error: readErr } = await db
        .from("messages").select("metadata, content").eq("id", m.id).single();
      if (readErr) { msgErr = readErr.message; break; }

      const patch = { metadata: { ...current.metadata, media_url: item.to } };
      if (current.content === m.mediaUrl) patch.content = item.to;

      const { error: updErr } = await db.from("messages").update(patch).eq("id", m.id);
      if (updErr) { msgErr = updErr.message; break; }
    }

    if (msgErr) {
      console.error(`  ❌ update msg de ${item.from}: ${msgErr}`);
      results.failed.push({ ...item, error: msgErr });
      continue;
    }

    console.log(`  ✅ ${item.from} → ${item.to}`);
    results.migrated.push(item);
  }

  // Relatório em disco — é o insumo do rollback.
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  await mkdir("migration-dump", { recursive: true });
  const outFile = join("migration-dump", `backfill-whatsapp-media-${stamp}.json`);
  await writeFile(outFile, JSON.stringify({ apply: APPLY, ...results }, null, 2));

  console.log(`\n─────────────────────────────────────`);
  console.log(`migrados: ${results.migrated.length} | falhas: ${results.failed.length} | órfãos: ${orphans.length}`);
  console.log(`relatório: ${outFile}`);
  if (!APPLY) console.log(`\nNada foi alterado. Rode com --apply para executar.`);
  else console.log(`\nOriginais na raiz foram PRESERVADOS. Limpeza é passo separado.`);
}

main().catch((e) => { console.error("\n💥", e.message); process.exit(1); });
