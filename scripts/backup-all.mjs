#!/usr/bin/env node
/**
 * Backup SQLite de tous les services marketplace.
 * Usage: npm run db:backup:all
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dossierBackups = path.join(racine, "backups");
fs.mkdirSync(dossierBackups, { recursive: true });

const horodatage = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

const sources = [
  { nom: "core", dir: path.join(racine, "apps/api/prisma"), files: ["dev.db", "dev.db-wal", "dev.db-shm"] },
  { nom: "hotels", dir: path.join(racine, "services/hotels/prisma"), files: ["hotels.db", "hotels.db-wal", "hotels.db-shm"] },
  { nom: "booking", dir: path.join(racine, "services/booking/prisma"), files: ["booking.db", "booking.db-wal", "booking.db-shm"] },
  { nom: "transport", dir: path.join(racine, "services/transport/prisma"), files: ["transport.db", "transport.db-wal", "transport.db-shm"] },
];

let copies = 0;
for (const src of sources) {
  if (!fs.existsSync(src.dir)) continue;
  for (const fichier of src.files) {
    const source = path.join(src.dir, fichier);
    if (!fs.existsSync(source)) continue;
    const dest = path.join(dossierBackups, `${src.nom}_${horodatage}_${fichier}`);
    fs.copyFileSync(source, dest);
    copies++;
    console.log(`OK ${src.nom}/${fichier}`);
  }
}

if (copies === 0) {
  console.error("Aucune base SQLite trouvée.");
  process.exit(1);
}

const anciens = fs
  .readdirSync(dossierBackups)
  .map((f) => path.join(dossierBackups, f))
  .filter((p) => fs.statSync(p).isFile())
  .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

for (const ancien of anciens.slice(40)) {
  fs.unlinkSync(ancien);
}

console.log(`Backup marketplace terminé : ${copies} fichier(s) → ${dossierBackups}`);
