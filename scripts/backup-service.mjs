#!/usr/bin/env node
/**
 * Backup SQLite d'un service avant migration / db push.
 * Usage: node scripts/backup-service.mjs <core|hotels|booking|transport> [--allow-empty]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const allowEmpty = process.argv.includes("--allow-empty");
const service = process.argv.slice(2).find((a) => !a.startsWith("-"));

const catalogue = {
  core: {
    dir: path.join(racine, "apps/api/prisma"),
    files: ["dev.db", "dev.db-wal", "dev.db-shm"],
    backupDir: path.join(racine, "apps/api/backups"),
  },
  hotels: {
    dir: path.join(racine, "services/hotels/prisma"),
    files: ["hotels.db", "hotels.db-wal", "hotels.db-shm"],
    backupDir: path.join(racine, "services/hotels/backups"),
  },
  booking: {
    dir: path.join(racine, "services/booking/prisma"),
    files: ["booking.db", "booking.db-wal", "booking.db-shm"],
    backupDir: path.join(racine, "services/booking/backups"),
  },
  transport: {
    dir: path.join(racine, "services/transport/prisma"),
    files: ["transport.db", "transport.db-wal", "transport.db-shm"],
    backupDir: path.join(racine, "services/transport/backups"),
  },
};

if (!service || !catalogue[service]) {
  console.error("Usage: node scripts/backup-service.mjs <core|hotels|booking|transport> [--allow-empty]");
  process.exit(1);
}

const cfg = catalogue[service];
fs.mkdirSync(cfg.backupDir, { recursive: true });
const horodatage = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
let copies = 0;

for (const fichier of cfg.files) {
  const source = path.join(cfg.dir, fichier);
  if (!fs.existsSync(source)) continue;
  const dest = path.join(cfg.backupDir, `${service}_${horodatage}_${fichier}`);
  fs.copyFileSync(source, dest);
  copies++;
  console.log(`OK ${service}/${fichier} → ${dest}`);
}

if (copies === 0) {
  if (allowEmpty) {
    console.log(`Aucune base ${service} (premier déploiement) — backup ignoré.`);
    process.exit(0);
  }
  console.error(`Aucune base SQLite pour ${service}.`);
  process.exit(1);
}

const anciens = fs
  .readdirSync(cfg.backupDir)
  .map((f) => path.join(cfg.backupDir, f))
  .filter((p) => fs.statSync(p).isFile())
  .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

for (const ancien of anciens.slice(20)) {
  fs.unlinkSync(ancien);
}

console.log(`Backup ${service} terminé : ${copies} fichier(s)`);
