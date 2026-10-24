#!/usr/bin/env node
/**
 * Retire les prestataires mock de l'admin prod (hard-delete si possible,
 * sinon anonymisation). Conserve les comptes réels + Smoke CI.
 *
 * Env: RENDER_API_KEY
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://api.render.com/v1";
const require = createRequire(import.meta.url);

const SEED_ENTREPRISES = new Set([
  "Clinique Bonne Santé",
  "Trans-Congo Voyages",
  "Hôtel Fleuve Congo",
]);

const GARDER = new Set([
  "Celestin Kasereka",
  "afriri",
  "mar",
  "Cls",
  "Clinique Espoir",
  "Smoke Clinique CI",
  "kakike Olivier kiza",
  "Restaurant Le Fleuve d'Or",
]);

/** Faker anglo typique : "Keith Bush", "Lynne Hanson"… */
const NOM_ANGLAIS = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}$/;

async function postgresUrl(schema = "core") {
  const key = process.env.RENDER_API_KEY;
  if (!key) throw new Error("RENDER_API_KEY requis");
  const headers = { Authorization: `Bearer ${key}`, Accept: "application/json" };
  const list = await fetch(`${API}/postgres?limit=50`, { headers }).then((r) => r.json());
  const hit = (Array.isArray(list) ? list : []).find((x) => (x.postgres || x).name === "reserva-db");
  const id = (hit?.postgres || hit)?.id;
  if (!id) throw new Error("Postgres reserva-db introuvable");
  const info = await fetch(`${API}/postgres/${id}/connection-info`, { headers }).then((r) => r.json());
  const u = new URL(info.externalConnectionString);
  u.searchParams.set("schema", schema);
  return u.toString();
}

function estMock(nom) {
  const n = String(nom || "").trim();
  if (!n) return false;
  if (GARDER.has(n)) return false;
  if (n.startsWith("Smoke ")) return false;
  if (SEED_ENTREPRISES.has(n)) return true;
  if (NOM_ANGLAIS.test(n)) return true;
  return false;
}

async function supprimerPrestataire(prisma, p) {
  const id = p.id;
  const userId = p.utilisateurId;

  // Ordre FK : avis → transactions → litiges → réservations → créneaux → services → presta → user
  const services = await prisma.serviceOffert.findMany({ where: { prestataireId: id }, select: { id: true } });
  const serviceIds = services.map((s) => s.id);

  const reservations = await prisma.reservation.findMany({
    where: { OR: [{ prestataireId: id }, { serviceId: { in: serviceIds } }] },
    select: { id: true },
  });
  const resaIds = reservations.map((r) => r.id);

  if (resaIds.length) {
    await prisma.avis.deleteMany({ where: { reservationId: { in: resaIds } } });
    await prisma.transaction.deleteMany({ where: { reservationId: { in: resaIds } } });
    await prisma.litige.deleteMany({ where: { reservationId: { in: resaIds } } }).catch(() => {});
    await prisma.notification.deleteMany({ where: { reservationId: { in: resaIds } } }).catch(() => {});
    await prisma.ecritureComptable.deleteMany({ where: { reservationId: { in: resaIds } } }).catch(() => {});
    await prisma.reservation.deleteMany({ where: { id: { in: resaIds } } });
  }

  if (serviceIds.length) {
    await prisma.creneau.deleteMany({ where: { serviceId: { in: serviceIds } } });
    await prisma.alerteDisponibilite.deleteMany({ where: { serviceId: { in: serviceIds } } }).catch(() => {});
    await prisma.listeAttente.deleteMany({ where: { serviceId: { in: serviceIds } } }).catch(() => {});
    await prisma.periodeIndisponible.deleteMany({ where: { serviceId: { in: serviceIds } } }).catch(() => {});
    await prisma.serviceOffert.deleteMany({ where: { id: { in: serviceIds } } });
  }

  await prisma.periodeIndisponible.deleteMany({ where: { prestataireId: id } }).catch(() => {});
  await prisma.abonnementPrestataire.deleteMany({ where: { prestataireId: id } }).catch(() => {});
  await prisma.versementPrestataire.deleteMany({ where: { prestataireId: id } }).catch(() => {});
  await prisma.packageService.deleteMany({ where: { prestataireId: id } }).catch(() => {});
  await prisma.avis.deleteMany({ where: { prestataireId: id } }).catch(() => {});
  await prisma.favori.deleteMany({ where: { prestataireId: id } }).catch(() => {});

  await prisma.prestataire.delete({ where: { id } });
  await prisma.utilisateur.delete({ where: { id: userId } }).catch(async () => {
    // Si FK ailleurs, anonymiser
    const suffix = userId.slice(0, 8).replace(/\D/g, "0").padEnd(8, "0").slice(0, 8);
    await prisma.utilisateur.update({
      where: { id: userId },
      data: {
        nom: "Compte supprimé",
        email: null,
        pinHash: null,
        bloqueJusquA: new Date("2099-12-31"),
        telephone: `+243000${suffix}`,
      },
    });
  });
}

async function main() {
  console.log("══ Purge mocks admin prod ══");
  const url = await postgresUrl("core");
  const { PrismaClient } = require(path.join(racine, "node_modules/@prisma/client"));
  const prisma = new PrismaClient({ datasources: { db: { url } } });

  try {
    const all = await prisma.prestataire.findMany({
      select: { id: true, nomEntreprise: true, statut: true, utilisateurId: true, categorie: true },
      orderBy: { creeLe: "desc" },
    });
    const mocks = all.filter((p) => estMock(p.nomEntreprise));
    console.log(`→ ${mocks.length} mock(s) / ${all.length} total`);

    let ok = 0;
    let fail = 0;
    for (const p of mocks) {
      try {
        await supprimerPrestataire(prisma, p);
        console.log(`  ✓ ${p.statut} ${p.nomEntreprise}`);
        ok += 1;
      } catch (e) {
        console.log(`  ✗ ${p.nomEntreprise}: ${e.message}`);
        fail += 1;
      }
    }

    const restants = await prisma.prestataire.findMany({
      select: { nomEntreprise: true, statut: true },
      orderBy: { creeLe: "desc" },
    });
    console.log(`✓ supprimés=${ok} échecs=${fail} restants=${restants.length}`);
    for (const p of restants) console.log(`  - ${p.statut} | ${p.nomEntreprise}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("✗", e.message || e);
  process.exit(1);
});
