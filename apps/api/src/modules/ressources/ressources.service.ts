import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ErreurConflit, ErreurNonTrouve, ErreurValidation } from "../../utils/erreurs";

/** Statuts pour lesquels une réservation occupe encore sa table */
export const STATUTS_OCCUPANT_TABLE = ["EN_ATTENTE", "CONFIRMEE", "EN_COURS"];

export const MODE_TABLE = "TABLE";

type Client = Prisma.TransactionClient | typeof prisma;

async function exigerServicePrestataire(utilisateurId: string, serviceId: string) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) throw new ErreurNonTrouve("Profil prestataire non trouvé");
  const service = await prisma.serviceOffert.findUnique({ where: { id: serviceId } });
  if (!service || service.prestataireId !== prestataire.id) {
    throw new ErreurNonTrouve("Service non trouvé");
  }
  return service;
}

async function exigerRessourcePrestataire(utilisateurId: string, ressourceId: string) {
  const ressource = await prisma.ressource.findUnique({ where: { id: ressourceId } });
  if (!ressource) throw new ErreurNonTrouve("Table introuvable");
  await exigerServicePrestataire(utilisateurId, ressource.serviceId);
  return ressource;
}

/**
 * En mode TABLE, la capacité d'un créneau = nombre de tables actives.
 * On réaligne les créneaux à venir après chaque changement de tables
 * (sans jamais descendre sous le nombre de tables déjà réservées).
 */
export async function synchroniserCapaciteCreneaux(serviceId: string, client: Client = prisma) {
  const nombreTables = await client.ressource.count({ where: { serviceId, actif: true } });
  const creneaux = await client.creneau.findMany({
    where: { serviceId, debut: { gte: new Date() } },
    select: { id: true, capaciteTotale: true, capaciteReservee: true },
  });
  for (const c of creneaux) {
    const cible = Math.max(nombreTables, c.capaciteReservee, 1);
    if (cible !== c.capaciteTotale) {
      await client.creneau.update({ where: { id: c.id }, data: { capaciteTotale: cible } });
    }
  }
  return { nombreTables, creneauxMisAJour: creneaux.length };
}

/** Nombre de tables actives d'un service (utilisé à la création des créneaux) */
export function compterTablesActives(serviceId: string, client: Client = prisma) {
  return client.ressource.count({ where: { serviceId, actif: true } });
}

function nettoyerNom(nom: unknown): string {
  const valeur = String(nom ?? "").trim().slice(0, 60);
  if (valeur.length < 1) throw new ErreurValidation("Le nom de la table est requis");
  return valeur;
}

function nettoyerCapacite(capacite: unknown): number {
  const n = Math.round(Number(capacite));
  if (!Number.isFinite(n) || n < 1 || n > 50) {
    throw new ErreurValidation("La capacité d'une table doit être comprise entre 1 et 50 personnes");
  }
  return n;
}

/** [PRESTATAIRE] Liste les tables d'un service */
export async function listerRessources(utilisateurId: string, serviceId: string) {
  await exigerServicePrestataire(utilisateurId, serviceId);
  return prisma.ressource.findMany({
    where: { serviceId },
    orderBy: [{ actif: "desc" }, { capacite: "asc" }, { nom: "asc" }],
  });
}

/** [PRESTATAIRE] Ajoute une table */
export async function creerRessource(
  utilisateurId: string,
  input: { serviceId: string; nom: string; capacite: number }
) {
  await exigerServicePrestataire(utilisateurId, input.serviceId);
  const nom = nettoyerNom(input.nom);
  const existe = await prisma.ressource.findUnique({
    where: { serviceId_nom: { serviceId: input.serviceId, nom } },
  });
  if (existe) throw new ErreurConflit(`Une table nommée « ${nom} » existe déjà`);
  const ressource = await prisma.ressource.create({
    data: { serviceId: input.serviceId, nom, capacite: nettoyerCapacite(input.capacite) },
  });
  await synchroniserCapaciteCreneaux(input.serviceId);
  return ressource;
}

/** [PRESTATAIRE] Ajoute N tables identiques d'un coup (« Table 1 » … « Table N ») */
export async function creerRessourcesEnLot(
  utilisateurId: string,
  input: { serviceId: string; nombre: number; capacite: number; prefixe?: string }
) {
  await exigerServicePrestataire(utilisateurId, input.serviceId);
  const nombre = Math.round(Number(input.nombre));
  if (!Number.isFinite(nombre) || nombre < 1 || nombre > 100) {
    throw new ErreurValidation("Indiquez entre 1 et 100 tables");
  }
  const capacite = nettoyerCapacite(input.capacite);
  const prefixe = String(input.prefixe ?? "Table").trim().slice(0, 40) || "Table";

  const existantes = await prisma.ressource.findMany({
    where: { serviceId: input.serviceId },
    select: { nom: true },
  });
  const noms = new Set(existantes.map((r) => r.nom));
  const aCreer: { serviceId: string; nom: string; capacite: number }[] = [];
  let numero = 1;
  while (aCreer.length < nombre) {
    const nom = `${prefixe} ${numero}`;
    if (!noms.has(nom)) aCreer.push({ serviceId: input.serviceId, nom, capacite });
    numero++;
  }
  await prisma.ressource.createMany({ data: aCreer });
  await synchroniserCapaciteCreneaux(input.serviceId);
  return { nombreCrees: aCreer.length };
}

/** [PRESTATAIRE] Renomme, change la capacité ou (dés)active une table */
export async function modifierRessource(
  utilisateurId: string,
  ressourceId: string,
  input: { nom?: string; capacite?: number; actif?: boolean }
) {
  const ressource = await exigerRessourcePrestataire(utilisateurId, ressourceId);
  const data: Prisma.RessourceUpdateInput = {};
  if (input.nom !== undefined) {
    const nom = nettoyerNom(input.nom);
    if (nom !== ressource.nom) {
      const doublon = await prisma.ressource.findUnique({
        where: { serviceId_nom: { serviceId: ressource.serviceId, nom } },
      });
      if (doublon) throw new ErreurConflit(`Une table nommée « ${nom} » existe déjà`);
    }
    data.nom = nom;
  }
  if (input.capacite !== undefined) data.capacite = nettoyerCapacite(input.capacite);
  if (input.actif !== undefined) data.actif = Boolean(input.actif);

  const misAJour = await prisma.ressource.update({ where: { id: ressourceId }, data });
  if (input.actif !== undefined) await synchroniserCapaciteCreneaux(ressource.serviceId);
  return misAJour;
}

/**
 * [PRESTATAIRE] Retire une table. Elle est désactivée (et non supprimée)
 * afin de garder l'historique des réservations qui y étaient attribuées.
 */
export async function retirerRessource(utilisateurId: string, ressourceId: string) {
  const ressource = await exigerRessourcePrestataire(utilisateurId, ressourceId);
  const aVenir = await prisma.reservation.count({
    where: {
      ressourceId,
      statut: { in: STATUTS_OCCUPANT_TABLE },
      creneau: { fin: { gt: new Date() } },
    },
  });
  if (aVenir > 0) {
    throw new ErreurConflit(
      `Cette table a ${aVenir} réservation(s) à venir. Réattribuez-les avant de la retirer.`
    );
  }
  const misAJour = await prisma.ressource.update({ where: { id: ressourceId }, data: { actif: false } });
  await synchroniserCapaciteCreneaux(ressource.serviceId);
  return misAJour;
}

/** Tables libres (actives, sans réservation active qui chevauche la période), de la plus petite à la plus grande */
export async function listerTablesLibres(
  client: Client,
  params: { serviceId: string; debut: Date; fin: Date; exclureReservationId?: string }
) {
  return client.ressource.findMany({
    where: {
      serviceId: params.serviceId,
      actif: true,
      reservations: {
        none: {
          statut: { in: STATUTS_OCCUPANT_TABLE },
          creneau: { debut: { lt: params.fin }, fin: { gt: params.debut } },
          ...(params.exclureReservationId ? { id: { not: params.exclureReservationId } } : {}),
        },
      },
    },
    orderBy: [{ capacite: "asc" }, { nom: "asc" }],
  });
}

/** Choisit la plus petite table libre pouvant accueillir le groupe (fonction pure, testable) */
export function choisirTable<T extends { capacite: number }>(tablesLibres: T[], nombrePersonnes: number): T | null {
  return (
    [...tablesLibres]
      .sort((a, b) => a.capacite - b.capacite)
      .find((t) => t.capacite >= nombrePersonnes) ?? null
  );
}

/**
 * À appeler DANS la transaction de réservation. Verrouille le créneau (FOR UPDATE)
 * pour sérialiser les réservations concurrentes, puis attribue une table.
 * Renvoie null si le service n'est pas en mode TABLE.
 */
export async function attribuerTable(
  tx: Prisma.TransactionClient,
  params: {
    service: { id: string; modeReservation: string };
    creneau: { id: string; debut: Date; fin: Date };
    nombrePersonnes: number;
    exclureReservationId?: string;
  }
) {
  if (params.service.modeReservation !== MODE_TABLE) return null;

  await tx.$queryRaw`SELECT "id" FROM "creneaux" WHERE "id" = ${params.creneau.id} FOR UPDATE`;

  const libres = await listerTablesLibres(tx, {
    serviceId: params.service.id,
    debut: params.creneau.debut,
    fin: params.creneau.fin,
    exclureReservationId: params.exclureReservationId,
  });
  const table = choisirTable(libres, params.nombrePersonnes);
  if (!table) {
    const capaciteMax = await tx.ressource.aggregate({
      where: { serviceId: params.service.id, actif: true },
      _max: { capacite: true },
    });
    const max = capaciteMax._max.capacite ?? 0;
    if (max === 0) {
      throw new ErreurConflit("Ce restaurant n'a pas encore configuré ses tables.");
    }
    if (params.nombrePersonnes > max) {
      throw new ErreurValidation(
        `La plus grande table accueille ${max} personne(s). Contactez le restaurant pour un groupe de ${params.nombrePersonnes}.`
      );
    }
    throw new ErreurConflit(
      `Plus de table libre pour ${params.nombrePersonnes} personne(s) sur ce créneau. Choisissez un autre horaire.`
    );
  }
  return table;
}

/** Résumé public de disponibilité par créneau : plus grande table encore libre */
export async function capaciteGroupeMaxParCreneau(
  serviceId: string,
  creneaux: { id: string; debut: Date; fin: Date }[]
): Promise<Map<string, number>> {
  const resultat = new Map<string, number>();
  if (creneaux.length === 0) return resultat;
  const tables = await prisma.ressource.findMany({
    where: { serviceId, actif: true },
    select: { id: true, capacite: true },
  });
  if (tables.length === 0) {
    for (const c of creneaux) resultat.set(c.id, 0);
    return resultat;
  }
  const debutMin = creneaux.reduce((m, c) => (c.debut < m ? c.debut : m), creneaux[0].debut);
  const finMax = creneaux.reduce((m, c) => (c.fin > m ? c.fin : m), creneaux[0].fin);
  const occupations = await prisma.reservation.findMany({
    where: {
      serviceId,
      ressourceId: { not: null },
      statut: { in: STATUTS_OCCUPANT_TABLE },
      creneau: { debut: { lt: finMax }, fin: { gt: debutMin } },
    },
    select: { ressourceId: true, creneau: { select: { debut: true, fin: true } } },
  });
  for (const c of creneaux) {
    const occupees = new Set(
      occupations
        .filter((o) => o.creneau.debut < c.fin && o.creneau.fin > c.debut)
        .map((o) => o.ressourceId)
    );
    const max = tables.filter((t) => !occupees.has(t.id)).reduce((m, t) => Math.max(m, t.capacite), 0);
    resultat.set(c.id, max);
  }
  return resultat;
}

/** [PRESTATAIRE] Change la table d'une réservation (ex. client arrivé à 5 au lieu de 4) */
export async function reattribuerTable(utilisateurId: string, reservationId: string, ressourceId: string) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) throw new ErreurNonTrouve("Profil prestataire non trouvé");
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { creneau: true },
  });
  if (!reservation || reservation.prestataireId !== prestataire.id) {
    throw new ErreurNonTrouve("Réservation non trouvée");
  }
  if (!STATUTS_OCCUPANT_TABLE.includes(reservation.statut)) {
    throw new ErreurValidation("Cette réservation n'est plus active");
  }
  const ressource = await prisma.ressource.findUnique({ where: { id: ressourceId } });
  if (!ressource || ressource.serviceId !== reservation.serviceId || !ressource.actif) {
    throw new ErreurNonTrouve("Table introuvable pour ce service");
  }

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "creneaux" WHERE "id" = ${reservation.creneauId} FOR UPDATE`;
    const libres = await listerTablesLibres(tx, {
      serviceId: reservation.serviceId,
      debut: reservation.creneau.debut,
      fin: reservation.creneau.fin,
      exclureReservationId: reservation.id,
    });
    if (!libres.some((t) => t.id === ressourceId)) {
      throw new ErreurConflit(`La table « ${ressource.nom} » est déjà occupée sur ce créneau`);
    }
    return tx.reservation.update({
      where: { id: reservationId },
      data: { ressourceId },
      include: { ressource: true },
    });
  });
}
