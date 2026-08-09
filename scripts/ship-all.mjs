#!/usr/bin/env node
// ship:all — deploy unificado e otimizado.
//
// - Detecta edge functions modificadas via hash sha256 do dir + _shared/
// - Detecta se o FRONTEND mudou via hash de src/, public/, index.html, vite.config.ts, package.json
// - Edge functions deployadas em PARALELO (5 simultâneas) pra reduzir tempo
// - Skip do build/deploy do frontend se nada do frontend mudou desde o último ship
// - Edge functions vão SEMPRE antes do frontend (forward compat)

import { execSync, spawn } from "node:child_process";
import {
  existsSync, readFileSync, writeFileSync,
  statSync, readdirSync,
} from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const FUNCTIONS_DIR = "supabase/functions";
const SHARED_DIRNAME = "_shared";
const STATE_FILE = ".ship-state.json";
const PARALLEL_LIMIT = 5;

// Dirs/arquivos do frontend que disparam rebuild quando mudam
const FRONTEND_PATHS = [
  "src",
  "public",
  "index.html",
  "vite.config.ts",
  "tailwind.config.ts",
  "tsconfig.json",
  "package.json",
];

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

function hashPath(p) {
  // Aceita arquivo OU diretório
  if (!existsSync(p)) return "";
  const stat = statSync(p);
  if (stat.isFile()) {
    return createHash("sha256").update(readFileSync(p)).digest("hex");
  }
  const files = [];
  (function walk(d) {
    for (const f of readdirSync(d)) {
      const fp = path.join(d, f);
      if (statSync(fp).isDirectory()) walk(fp);
      else files.push(fp);
    }
  })(p);
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
  if (!existsSync(STATE_FILE)) return { functions: {}, frontend: "" };
  try {
    const s = JSON.parse(readFileSync(STATE_FILE, "utf-8"));
    return { functions: {}, frontend: "", ...s };
  } catch { return { functions: {}, frontend: "" }; }
}

function saveState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + "\n");
}

function deployFunctionAsync(fn) {
  return new Promise((resolve) => {
    const proc = spawn("supabase", ["functions", "deploy", fn, "--use-api"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    proc.stderr.on("data", (d) => { stderr += d.toString(); });
    proc.stdout.on("data", () => { /* descarta output verboso */ });
    proc.on("close", (code) => {
      if (code === 0) {
        log(`   ✓ ${fn}`, "green");
        resolve({ fn, ok: true });
      } else {
        log(`   ✗ ${fn}`, "red");
        resolve({ fn, ok: false, error: stderr.trim().split("\n").slice(-3).join(" | ") });
      }
    });
  });
}

async function deployInParallel(fns) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < fns.length) {
      const idx = i++;
      const r = await deployFunctionAsync(fns[idx]);
      results.push(r);
    }
  }
  await Promise.all(Array.from({ length: PARALLEL_LIMIT }, worker));
  return results;
}

// ──────────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────────

(async () => {
  log("\n🚀 uPixel CRM — ship:all\n", "bold");

  try { execSync("supabase --version", { stdio: "pipe" }); }
  catch {
    log("❌ supabase CLI não encontrado. brew install supabase/tap/supabase", "red");
    process.exit(1);
  }

  const dirty = gitOut("git status --porcelain");
  if (dirty) {
    log("❌ Working tree não está limpo:", "red");
    log(dirty, "yellow");
    process.exit(1);
  }

  try { run("git pull --ff-only origin main"); }
  catch { log("\n❌ git pull falhou.", "red"); process.exit(1); }

  // Detecta functions modificadas
  const sharedDir = path.join(FUNCTIONS_DIR, SHARED_DIRNAME);
  const sharedHash = existsSync(sharedDir) ? hashPath(sharedDir) : "";
  const state = loadState();
  const allFns = listFunctions();
  const changedFns = [];
  const newFnHashes = {};

  for (const fn of allFns) {
    const h = createHash("sha256");
    h.update(hashPath(path.join(FUNCTIONS_DIR, fn)));
    h.update(sharedHash);
    const digest = h.digest("hex");
    newFnHashes[fn] = digest;
    if (state.functions[fn] !== digest) changedFns.push(fn);
  }

  // Detecta mudanças no frontend
  const frontendHasher = createHash("sha256");
  for (const p of FRONTEND_PATHS) frontendHasher.update(hashPath(p));
  const newFrontendHash = frontendHasher.digest("hex");
  const frontendChanged = state.frontend !== newFrontendHash;

  log("\n📋 Plano de deploy:", "bold");
  log(`   Edge functions: ${changedFns.length} ${changedFns.length === 1 ? "modificada" : "modificadas"}`);
  if (changedFns.length > 0 && changedFns.length <= 8) {
    for (const fn of changedFns) log(`      • ${fn}`, "dim");
  }
  log(`   Frontend:       ${frontendChanged ? "modificado" : "não modificado (pula build)"}`);

  if (changedFns.length === 0 && !frontendChanged) {
    log("\n✓ Nada a deployar. Tudo já está em produção.\n", "green");
    return;
  }

  // Deploy paralelo de edge functions
  if (changedFns.length > 0) {
    log(`\n⚙️  Deployando ${changedFns.length} edge function(s) em paralelo (limite ${PARALLEL_LIMIT})…`, "cyan");
    const results = await deployInParallel(changedFns);
    const failed = results.filter((r) => !r.ok);
    if (failed.length > 0) {
      log(`\n❌ ${failed.length} edge function(s) falharam:`, "red");
      for (const f of failed) log(`   • ${f.fn}: ${f.error}`, "red");
      log("\n   As que passaram já estão em produção. Resolva e rode ship:all de novo.", "dim");
      // Atualiza hashes das que passaram pra evitar reenvio
      const okFns = new Set(results.filter((r) => r.ok).map((r) => r.fn));
      for (const fn of okFns) state.functions[fn] = newFnHashes[fn];
      saveState(state);
      process.exit(1);
    }
  }

  // Frontend
  if (frontendChanged) {
    try { run("npm run ship"); }
    catch {
      log("\n❌ Frontend falhou. Edge functions já deployadas.", "red");
      // Salva hashes das edge functions ok
      Object.assign(state.functions, newFnHashes);
      saveState(state);
      process.exit(1);
    }
  } else {
    log("\n⏭️  Frontend não mudou desde o último ship — skip do build (economiza ~5min).", "yellow");
  }

  // Salva estado
  state.functions = newFnHashes;
  state.frontend = newFrontendHash;
  state.lastShipAt = new Date().toISOString();
  state.lastShipCommit = gitOut("git rev-parse HEAD");
  saveState(state);

  const line = "═".repeat(52);
  log(`\n${line}`, "green");
  log("✅ Ship completo!", "bold");
  log(`   Edge functions: ${changedFns.length} deployada${changedFns.length === 1 ? "" : "s"}`, "green");
  log(`   Frontend:       ${frontendChanged ? "deployado" : "skipped (sem mudanças)"}`, "green");
  log(`   Commit:         ${state.lastShipCommit.slice(0, 7)}`, "green");
  log(`${line}\n`, "green");
})();
