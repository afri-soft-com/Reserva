#!/usr/bin/env node
/**
 * Backup PostgreSQL d'un schéma/service avant migration / db push.
 * Usage: node scripts/backup-service.mjs <core|hotels|booking|transport> [--allow-empty]
 * Env: DATABASE_URL (ou DATABASE_URL_CORE, etc.)
 */
import { spawnSync } from "node:child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const allowEmpty = process.argv.includes("--allow-empty");
const service = process.argv.slice(2).find((a) => !a.startsWith("-"));

const envKeys = {
  core: ["DATABASE_URL_CORE", "DATABASE_URL"],
  hotels: ["DATABASE_URL_HOTELS", "DATABASE_URL"],
  booking: ["DATABASE_URL_BOOKING", "DATABASE_URL"],
  transport: ["DATABASE_URL_TRANSPORT", "DATABASE_URL"],
};

if (!service || !envKeys[service]) {
  console.error("Usage: node scripts/backup-service.mjs <core|hotels|booking|transport> [--allow-empty]");
  process.exit(1);
}

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backupDir = path.join(racine, "backups");
fs.mkdirSync(backupDir, { recursive: true });

let url;
for (const k of envKeys[service]) {
  if (process.env[k]) {
    url = process.env[k];
    break;
  }
}

if (!url || url.startsWith("file:")) {
  if (allowEmpty) {
    console.log(`Aucune DATABASE_URL Postgres pour ${service} — backup ignoré.`);
    process.exit(0);
  }
  console.error(`DATABASE_URL Postgres manquante pour ${service}`);
  process.exit(1);
}

const horodatage = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const dest = path.join(backupDir, `${service}_${horodatage}.sql`);

const result = spawnSync("pg_dump", [url, "--no-owner", "--no-acl", "-f", dest], {
  encoding: "utf8",
  shell: process.platform === "win32",
});

if (result.status !== 0) {
  if (allowEmpty) {
    console.log(`pg_dump indisponible pour ${service} — backup ignoré.`);
    process.exit(0);
  }
  console.error(result.stderr || result.error?.message || "Échec pg_dump");
  process.exit(1);
}

console.log(`OK backup ${service} → ${dest}`);

const anciens = fs
  .readdirSync(backupDir)
  .map((f) => path.join(backupDir, f))
  .filter((p) => fs.statSync(p).isFile())
  .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

for (const ancien of anciens.slice(40)) {
  fs.unlinkSync(ancien);
}
