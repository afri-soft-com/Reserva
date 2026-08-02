#!/usr/bin/env node
// Sauvegarde automatique de la base SQLite (dev.db + journaux WAL) vers backups/.
// Usage : npm run db:backup
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ici = path.dirname(fileURLToPath(import.meta.url));
const racineApi = path.resolve(ici, "..");
const dossierDb = path.join(racineApi, "prisma");
const dossierBackups = path.join(racineApi, "backups");

if (!fs.existsSync(dossierDb)) {
  console.error("Dossier prisma introuvable :", dossierDb);
  process.exit(1);
}

fs.mkdirSync(dossierBackups, { recursive: true });

const maintenant = new Date();
const horodatage = [
  maintenant.getFullYear(),
  String(maintenant.getMonth() + 1).padStart(2, "0"),
  String(maintenant.getDate()).padStart(2, "0"),
  "_",
  String(maintenant.getHours()).padStart(2, "0"),
  String(maintenant.getMinutes()).padStart(2, "0"),
  String(maintenant.getSeconds()).padStart(2, "0"),
].join("");

const fichiers = ["dev.db", "dev.db-wal", "dev.db-shm"];
let copies = 0;

for (const fichier of fichiers) {
  const source = path.join(dossierDb, fichier);
  if (!fs.existsSync(source)) continue;
  const destination = path.join(dossierBackups, `reserva_${horodatage}_${fichier.replace("dev.db", "dev")}`);
  fs.copyFileSync(source, destination);
  copies++;
  console.log(`OK ${fichier} -> ${destination}`);
}

if (copies === 0) {
  console.error("Aucune base trouvée dans", dossierDb);
  process.exit(1);
}

// Ne conserver que les 20 sauvegardes les plus récentes
const anciens = fs
  .readdirSync(dossierBackups)
  .map((f) => path.join(dossierBackups, f))
  .filter((p) => fs.statSync(p).isFile())
  .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

for (const ancien of anciens.slice(20)) {
  fs.unlinkSync(ancien);
  console.log(`Nettoyé : ${ancien}`);
}

console.log(`Backup terminé : ${copies} fichier(s) -> ${dossierBackups}`);
