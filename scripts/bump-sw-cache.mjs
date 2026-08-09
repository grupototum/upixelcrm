#!/usr/bin/env node
/**
 * Sincroniza CACHE_NAME do service worker (public/sw.js) com package.json.version.
 *
 * Uso:
 *   node scripts/bump-sw-cache.mjs           → só sincroniza (sem bumpar)
 *   node scripts/bump-sw-cache.mjs --patch   → bumpa patch no package.json E sincroniza
 *   node scripts/bump-sw-cache.mjs --minor   → bumpa minor no package.json E sincroniza
 *   node scripts/bump-sw-cache.mjs --major   → bumpa major no package.json E sincroniza
 *
 * O CACHE_NAME final fica como `upixel-v<package.json.version>` (ex.: upixel-v1.1.3).
 * Browser purga caches antigos no install do novo SW, evitando 404 em chunks lazy
 * de versões anteriores após cada deploy.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PKG_PATH = resolve(ROOT, "package.json");
const SW_PATH = resolve(ROOT, "public/sw.js");

const VALID_BUMPS = new Set(["patch", "minor", "major"]);
const bumpArg = process.argv.find(a => a.startsWith("--"))?.slice(2);
if (bumpArg && !VALID_BUMPS.has(bumpArg)) {
  console.error(`✖ Flag inválida: --${bumpArg}. Use --patch | --minor | --major (ou nada).`);
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(PKG_PATH, "utf-8"));
const [major, minor, patch] = pkg.version.split(".").map(n => parseInt(n, 10));
if ([major, minor, patch].some(n => Number.isNaN(n))) {
  console.error(`✖ package.json.version inválido: ${pkg.version} (esperado MAJOR.MINOR.PATCH).`);
  process.exit(1);
}

let nextVersion = pkg.version;
if (bumpArg === "patch") nextVersion = `${major}.${minor}.${patch + 1}`;
if (bumpArg === "minor") nextVersion = `${major}.${minor + 1}.0`;
if (bumpArg === "major") nextVersion = `${major + 1}.0.0`;

if (nextVersion !== pkg.version) {
  pkg.version = nextVersion;
  writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`✓ package.json: ${nextVersion}`);
}

const sw = readFileSync(SW_PATH, "utf-8");
const pattern = /const CACHE_NAME = ['"][^'"]+['"];/;
if (!pattern.test(sw)) {
  console.warn("⚠ Não achei a linha CACHE_NAME em public/sw.js — verifique se o padrão mudou.");
  process.exit(1);
}

const targetCacheName = `upixel-v${nextVersion}`;
const updated = sw.replace(pattern, `const CACHE_NAME = '${targetCacheName}';`);

if (updated === sw) {
  console.log(`✓ public/sw.js: CACHE_NAME já está em ${targetCacheName} (nada a fazer)`);
} else {
  writeFileSync(SW_PATH, updated);
  console.log(`✓ public/sw.js: CACHE_NAME = ${targetCacheName}`);
}
