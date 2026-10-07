#!/usr/bin/env node
/**
 * Backup PostgreSQL (pg_dump) vers apps/api/backups/
 * Usage: DATABASE_URL=... npm run db:backup -w apps/api
 * Option: --allow-empty (pas de dump si URL absente / pg_dump indisponible en CI première fois)
 */
import { spawnSync } from "node:child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const allowEmpty = process.argv.includes("--allow-empty") || process.env.BACKUP_ALLOW_EMPTY === "1";
const ici = path.dirname(fileURLToPath(import.meta.url));
const racineApi = path.resolve(ici, "..");
const dossierBackups = path.join(racineApi, "backups");
const url = process.env.DATABASE_URL;

if (!url || url.startsWith("file:")) {
  if (allowEmpty) {
    console.log("DATABASE_URL Postgres absente — backup ignoré.");
    process.exit(0);
  }
  console.error("DATABASE_URL PostgreSQL requise pour le backup.");
  process.exit(1);
}

fs.mkdirSync(dossierBackups, { recursive: true });
const horodatage = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const dest = path.join(dossierBackups, `reserva_core_${horodatage}.sql`);

const result = spawnSync("pg_dump", [url, "--no-owner", "--no-acl", "-f", dest], {
  encoding: "utf8",
  shell: process.platform === "win32",
});

if (result.status !== 0) {
  if (allowEmpty) {
    console.log("pg_dump indisponible — backup ignoré (allow-empty).");
    console.log(result.stderr || result.error?.message || "");
    process.exit(0);
  }
  console.error(result.stderr || result.error?.message || "Échec pg_dump");
  process.exit(1);
}

console.log(`OK backup → ${dest}`);

const anciens = fs
  .readdirSync(dossierBackups)
  .map((f) => path.join(dossierBackups, f))
  .filter((p) => fs.statSync(p).isFile())
  .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

for (const ancien of anciens.slice(20)) {
  fs.unlinkSync(ancien);
}
