#!/usr/bin/env node
/**
 * Recrée les comptes smoke CI (client + pro + service + créneaux)
 * sans re-polluer le catalogue hôtels/transport.
 *
 * Env: DATABASE_URL avec ?schema=core (Postgres Render reserva-db)
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";

const require = createRequire(import.meta.url);
const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Client généré via `npx prisma generate --schema=apps/api/prisma/schema.prisma`
const { PrismaClient } = require(path.join(racine, "node_modules/@prisma/client"));

const prisma = new PrismaClient();

async function upsertUser({ telephone, nom, role, pinHash }) {
  const exist = await prisma.utilisateur.findUnique({ where: { telephone } });
  if (exist) {
    return prisma.utilisateur.update({
      where: { id: exist.id },
      data: {
        nom,
        role,
        pinHash,
        telephoneVerifie: true,
        bloqueJusquA: null,
        tentativesPin: 0,
        deuxFAActif: false,
      },
    });
  }
  return prisma.utilisateur.create({
    data: {
      telephone,
      nom,
      role,
      pinHash,
      telephoneVerifie: true,
      codeParrainage: `SMK${role.slice(0, 1)}${Date.now().toString(36).toUpperCase().slice(-6)}`,
    },
  });
}

async function main() {
  const pinHash = await bcrypt.hash("1234", 10);

  const client = await upsertUser({
    telephone: "+243991234567",
    nom: "Smoke Client CI",
    role: "CLIENT",
    pinHash,
  });
  console.log("✓ client", client.telephone, client.id);

  const proUser = await upsertUser({
    telephone: "+243970000001",
    nom: "Smoke Pro CI",
    role: "PRESTATAIRE",
    pinHash,
  });
  console.log("✓ pro user", proUser.telephone, proUser.id);

  let presta = await prisma.prestataire.findUnique({ where: { utilisateurId: proUser.id } });
  if (!presta) {
    presta = await prisma.prestataire.create({
      data: {
        utilisateurId: proUser.id,
        nomEntreprise: "Smoke Clinique CI",
        categorie: "SANTE",
        ville: "Kinshasa",
        quartier: "Gombe",
        adresse: "Compte technique CI uniquement",
        description: "Prestataire technique pour smoke production (ne pas confondre avec métier réel).",
        statut: "APPROUVE",
        activationConfirmeeLe: new Date(),
        kycStatut: "VALIDE",
        noteMoyenne: 4.5,
        nombreAvis: 1,
      },
    });
  } else {
    presta = await prisma.prestataire.update({
      where: { id: presta.id },
      data: {
        nomEntreprise: "Smoke Clinique CI",
        statut: "APPROUVE",
        activationConfirmeeLe: new Date(),
        kycStatut: "VALIDE",
        categorie: "SANTE",
        ville: "Kinshasa",
      },
    });
  }
  console.log("✓ presta", presta.id, presta.statut);

  let service = await prisma.serviceOffert.findFirst({
    where: { prestataireId: presta.id, nom: "Consultation smoke CI" },
  });
  if (!service) {
    service = await prisma.serviceOffert.create({
      data: {
        prestataireId: presta.id,
        nom: "Consultation smoke CI",
        description: "Service technique smoke CI",
        dureeMinutes: 30,
        prix: 15000,
        devise: "CDF",
        actif: true,
      },
    });
  } else {
    service = await prisma.serviceOffert.update({
      where: { id: service.id },
      data: { actif: true, prix: 15000 },
    });
  }
  console.log("✓ service", service.id);

  const base = new Date();
  base.setUTCDate(base.getUTCDate() + 1);
  base.setUTCSeconds(0, 0);

  for (const h of [9, 10, 11, 14, 15]) {
    const debut = new Date(base);
    debut.setUTCHours(h, 0, 0, 0);
    const fin = new Date(debut);
    fin.setUTCMinutes(30);
    const exist = await prisma.creneau.findFirst({ where: { serviceId: service.id, debut } });
    if (!exist) {
      await prisma.creneau.create({
        data: { serviceId: service.id, debut, fin, capaciteTotale: 5, capaciteReservee: 0 },
      });
    }
  }
  console.log("✓ créneaux J+1");
}

main()
  .catch((e) => {
    console.error("✗", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
