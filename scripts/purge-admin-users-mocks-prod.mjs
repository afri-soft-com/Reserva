#!/usr/bin/env node
/**
 * Soft-delete des utilisateurs mock (clients faker EN) dans l'admin prod.
 * Conserve smoke CI + noms non-faker.
 *
 * Env: RENDER_API_KEY
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://api.render.com/v1";
const require = createRequire(import.meta.url);

const GARDER_TELEPHONES = new Set([
  "+243900000001", // admin smoke
  "+243970000001", // pro smoke
  "+243991234567", // client smoke
]);

const GARDER_NOMS = new Set([
  "Compte supprimé", // déjà anonymisé — on les filtre côté liste
  "Smoke Pro CI",
  "Smoke Client CI",
  "Smoke Admin",
  "Celestin Kasereka",
  "afriri",
  "mar",
  "Cls",
  "Clinique Espoir",
  "kakike Olivier kiza",
  "Restaurant Le Fleuve d'Or",
]);

const NOM_ANGLAIS = /^[A-Z][a-z]+(?:\s+[A-Z][a-z'-]+){1,3}$/;

async function postgresUrl(schema = "core") {
  const key = process.env.RENDER_API_KEY;
  if (!key) throw new Error("RENDER_API_KEY requis");
  const headers = { Authorization: `Bearer ${key}`, Accept: "application/json" };
  const list = await fetch(`${API}/postgres?limit=50`, { headers }).then((r) => r.json());
  const hit = (Array.isArray(list) ? list : []).find((x) => (x.postgres || x).name === "reserva-db");
  const id = (hit?.postgres || hit)?.id;
  const info = await fetch(`${API}/postgres/${id}/connection-info`, { headers }).then((r) => r.json());
  const u = new URL(info.externalConnectionString);
  u.searchParams.set("schema", schema);
  return u.toString();
}

function estMockUser(u) {
  if (GARDER_TELEPHONES.has(u.telephone)) return false;
  if (u.role === "ADMIN") return false;
  if (GARDER_NOMS.has(u.nom)) return false;
  if (u.nom === "Compte supprimé") return true; // nettoyer orphelins
  if (NOM_ANGLAIS.test(String(u.nom || "").trim())) return true;
  return false;
}

async function main() {
  console.log("══ Purge users mock admin ══");
  const url = await postgresUrl("core");
  const { PrismaClient } = require(path.join(racine, "node_modules/@prisma/client"));
  const prisma = new PrismaClient({ datasources: { db: { url } } });

  try {
    const all = await prisma.utilisateur.findMany({
      select: { id: true, nom: true, telephone: true, role: true },
    });
    const mocks = all.filter(estMockUser);
    console.log(`→ ${mocks.length} mock(s) / ${all.length} total`);

    let ok = 0;
    for (const u of mocks) {
      const suffix = u.id.slice(0, 8).replace(/\D/g, "0").padEnd(8, "0").slice(0, 8);
      // Soft-delete : anonymise (conserve historique résa)
      await prisma.utilisateur.update({
        where: { id: u.id },
        data: {
          nom: "Compte supprimé",
          email: null,
          googleId: null,
          appleId: null,
          photoUrl: null,
          pinHash: null,
          bloqueJusquA: new Date("2099-12-31"),
          telephone: `+243000${suffix}`,
        },
      });
      console.log(`  ✓ ${u.role} ${u.nom} → anonymisé`);
      ok += 1;
    }

    const visibles = await prisma.utilisateur.count({
      where: { NOT: { nom: "Compte supprimé" } },
    });
    console.log(`✓ ${ok} anonymisé(s). Utilisateurs visibles restants ≈ ${visibles}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("✗", e.message || e);
  process.exit(1);
});
