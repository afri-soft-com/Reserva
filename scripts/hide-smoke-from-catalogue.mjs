#!/usr/bin/env node
/**
 * Masque le service technique CI du catalogue client (actif=false).
 * Le smoke réactive via PATCH /prestataires/moi/services/:id si besoin.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://api.render.com/v1";

async function postgresUrl(schema = "core") {
  const key = process.env.RENDER_API_KEY;
  if (!key) throw new Error("RENDER_API_KEY requis");
  const headers = { Authorization: `Bearer ${key}`, Accept: "application/json" };
  const list = await fetch(`${API}/postgres?limit=50`, { headers }).then((r) => r.json());
  const arr = Array.isArray(list) ? list : [];
  const hit = arr.find((x) => (x.postgres || x).name === "reserva-db");
  const id = (hit?.postgres || hit)?.id;
  if (!id) throw new Error("Postgres reserva-db introuvable");
  const info = await fetch(`${API}/postgres/${id}/connection-info`, { headers }).then((r) => r.json());
  if (!info.externalConnectionString) throw new Error("externalConnectionString manquant");
  const u = new URL(info.externalConnectionString);
  u.searchParams.set("schema", schema);
  return u.toString();
}

const SEED_ENTREPRISES = ["Clinique Bonne Santé", "Trans-Congo Voyages", "Hôtel Fleuve Congo"];

async function main() {
  const url = await postgresUrl("core");
  spawnSync("npx", ["prisma", "generate", "--schema=apps/api/prisma/schema.prisma"], {
    cwd: racine,
    encoding: "utf8",
    shell: true,
    stdio: "inherit",
  });
  const { createRequire } = await import("node:module");
  const require = createRequire(import.meta.url);
  const { PrismaClient } = require(path.join(racine, "node_modules/@prisma/client"));
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const smoke = await prisma.serviceOffert.updateMany({
      where: {
        OR: [
          { nom: { startsWith: "Consultation smoke" } },
          { prestataire: { nomEntreprise: { startsWith: "Smoke " } } },
        ],
      },
      data: { actif: false },
    });
    const seed = await prisma.serviceOffert.updateMany({
      where: { prestataire: { nomEntreprise: { in: SEED_ENTREPRISES } } },
      data: { actif: false },
    });
    await prisma.prestataire.updateMany({
      where: { nomEntreprise: { in: SEED_ENTREPRISES }, statut: { not: "SUSPENDU" } },
      data: { statut: "SUSPENDU" },
    });
    console.log(`✓ smoke=${smoke.count} seed=${seed.count} désactivés`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
