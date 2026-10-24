#!/usr/bin/env node
/**
 * Restaure les comptes prestataires réels anonymisés par erreur
 * (nom / PIN / déblocage). Téléphones temporaires uniques — à remplacer
 * ensuite par l'admin avec le vrai numéro.
 *
 * Env: RENDER_API_KEY
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://api.render.com/v1";
const require = createRequire(import.meta.url);

async function postgresUrl(schema = "core") {
  const key = process.env.RENDER_API_KEY;
  if (!key) throw new Error("RENDER_API_KEY requis");
  const headers = { Authorization: `Bearer ${key}`, Accept: "application/json" };
  const list = await fetch(`${API}/postgres?limit=50`, { headers }).then((r) => r.json());
  const hit = (Array.isArray(list) ? list : []).find((x) => (x.postgres || x).name === "reserva-db");
  const info = await fetch(`${API}/postgres/${(hit.postgres || hit).id}/connection-info`, { headers }).then((r) =>
    r.json()
  );
  const u = new URL(info.externalConnectionString);
  u.searchParams.set("schema", schema);
  return u.toString();
}

async function main() {
  const url = await postgresUrl("core");
  const { PrismaClient } = require(path.join(racine, "node_modules/@prisma/client"));
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const pinHash = await bcrypt.hash("1234", 10);

  try {
    const presta = await prisma.prestataire.findMany({
      where: {
        utilisateur: { nom: "Compte supprimé" },
        NOT: { nomEntreprise: { startsWith: "Smoke " } },
      },
      include: { utilisateur: true },
      orderBy: { creeLe: "asc" },
    });

    console.log(`→ ${presta.length} presta(s) à restaurer`);
    let i = 0;
    for (const p of presta) {
      // Téléphone temporaire unique (évite collision unique)
      const digits = String(10000000 + i).slice(-8);
      const telephone = `+243899${digits}`;
      i += 1;

      // Libère le téléphone factice soft-delete s'il bloque
      await prisma.utilisateur.update({
        where: { id: p.utilisateurId },
        data: {
          nom: p.nomEntreprise,
          role: "PRESTATAIRE",
          telephone,
          pinHash,
          bloqueJusquA: null,
          tentativesPin: 0,
          telephoneVerifie: true,
          deuxFAActif: false,
        },
      });
      console.log(`  ✓ ${p.statut} ${p.nomEntreprise} → ${telephone} (PIN 1234)`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("✗", e.message || e);
  process.exit(1);
});
