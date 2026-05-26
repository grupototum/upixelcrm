#!/usr/bin/env node
// ship:all — deploy unificado: git pull → edge functions modificadas → frontend.
// Usado via `npm run ship:all`. Detecta quais functions mudaram desde o último
// ship usando hash de conteúdo (sha256 do dir + _shared) e só deploya o que
// mudou. Frontend continua sempre indo via `npm run ship` (build + deploy).
//
// Ordem importa: edge functions ANTES do frontend, porque o cliente novo
// pode chamar APIs que o backend antigo não conhece (já mordemos esse bug).

import { execSync } from "node:child_process";
import {
  existsSync, readFileSync, writeFileSync,
  statSync, readdirSync,
} from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const FUNCTIONS_DIR = "supabase/functions";
const SHARED_DIRNAME = "_shared";
const STATE_FILE = ".ship-state.json";

const c = {
  reset: "\x1b[0m", bold: "\x1b[1m",
  green: "\x1b[32m", red: "\x1b[31m",
  yellow: "\x1b[33m", cyan: "\x1b[36m", dim: "\x1b[2m",
};
const log = (msg, color = "reset") => console.log(`${c[color]}${msg}${c.reset}`);

function run(cmd) {
  log(`\n→ ${cmd}`, "cyan");
  execSync(cmd, { stdio: "inherit" });
}

function gitOut(cmd) {
  return execSync(cmd, { encoding: "utf-8" }).trim();
}

function hashDir(dir) {
  const files = [];
  (function walk(d) {
    for (const f of readdirSync(d)) {
      const p = path.join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else files.push(p);
    }
  })(dir);
  files.sort();
  const h = createHash("sha256");
  for (const f of files) {
    h.update(f);
    h.update(readFileSync(f));
  }
  return h.digest("hex");
}

function listFunctions() {
  if (!existsSync(FUNCTIONS_DIR)) return [];
  return readdirSync(FUNCTIONS_DIR).filter((d) => {
    const p = path.join(FUNCTIONS_DIR, d);
    return (
      statSync(p).isDirectory() &&
      !d.startsWith(".") &&
      d !== SHARED_DIRNAME &&
      existsSync(path.join(p, "index.ts"))
    );
  });
}

function loadState() {
  if (!existsSync(STATE_FILE)) return { functions: {} };
  try { return JSON.parse(readFileSync(STATE_FILE, "utf-8")); }
  catch { return { functions: {} }; }
}

function saveState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + "\n");
}

// ──────────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────────

log("\n🚀 uPixel CRM — ship:all\n", "bold");

// 0) supabase CLI
try { execSync("supabase --version", { stdio: "pipe" }); }
catch {
  log("❌ supabase CLI não encontrado.", "red");
  log("   Instale: brew install supabase/tap/supabase", "dim");
  process.exit(1);
}

// 1) Working tree limpo
const dirty = gitOut("git status --porcelain");
if (dirty) {
  log("❌ Working tree não está limpo:", "red");
  log(dirty, "yellow");
  log("\n   Commit ou stash antes de rodar ship:all.", "dim");
  process.exit(1);
}

// 2) Pull
try { run("git pull --ff-only origin main"); }
catch {
  log("\n❌ git pull falhou. Resolva manualmente e rode de novo.", "red");
  process.exit(1);
}

// 3) Detecta functions modificadas
const sharedDir = path.join(FUNCTIONS_DIR, SHARED_DIRNAME);
const sharedHash = existsSync(sharedDir) ? hashDir(sharedDir) : "";
const state = loadState();
const allFns = listFunctions();
const changed = [];
const newHashes = {};

for (const fn of allFns) {
  const h = createHash("sha256");
  h.update(hashDir(path.join(FUNCTIONS_DIR, fn)));
  h.update(sharedHash);
  const digest = h.digest("hex");
  newHashes[fn] = digest;
  if (state.functions[fn] !== digest) changed.push(fn);
}

log("\n📋 Edge functions modificadas desde o último ship:", "bold");
if (changed.length === 0) {
  log("   (nenhuma)", "dim");
} else {
  for (const fn of changed) log(`   • ${fn}`);
}

// 4) Edge functions PRIMEIRO (forward compat)
const fnErrors = [];
for (const fn of changed) {
  try {
    run(`supabase functions deploy ${fn} --use-api`);
  } catch (err) {
    fnErrors.push({ fn, msg: err.message });
    log(`❌ falhou: ${fn}`, "red");
  }
}

if (fnErrors.length > 0) {
  log(`\n❌ ${fnErrors.length} edge function(s) falharam. Abortando antes do frontend.`, "red");
  log("   Edge functions que falharam ficam com hash não atualizado e serão tentadas no próximo ship.", "dim");
  process.exit(1);
}

// 5) Frontend (reusa npm run ship que já existe)
try {
  run("npm run ship");
} catch {
  log("\n❌ Frontend falhou no build/deploy.", "red");
  log("   Edge functions já foram deployadas. Resolva e rode `npm run deploy` manualmente.", "dim");
  process.exit(1);
}

// 6) Salva estado
state.functions = newHashes;
state.lastShipAt = new Date().toISOString();
state.lastShipCommit = gitOut("git rev-parse HEAD");
saveState(state);

// 7) Resumo
const line = "═".repeat(52);
log(`\n${line}`, "green");
log("✅ Ship completo!", "bold");
log(`   Frontend:       deployado`, "green");
log(`   Edge functions: ${changed.length} ${changed.length === 1 ? "deployada" : "deployadas"}${changed.length ? " (" + changed.join(", ") + ")" : ""}`, "green");
log(`   Commit:         ${state.lastShipCommit.slice(0, 7)}`, "green");
log(`${line}\n`, "green");
