import { prisma } from "../config/prisma";
import {
  ErreurConflit,
  ErreurInterdit,
  ErreurNonTrouve,
  ErreurValidation,
  nuitsEntre,
  parserJour,
} from "@reserva/service-kit";
import { modifierHotelAdmin } from "./hotels.service";

/**
 * Espace prestataire hôtelier : gestion de SES hôtels, types de chambre,
 * plans tarifaires et inventaire jour par jour.
 * Propriété : Hotel.prestataireId = utilisateurId du JWT (cf. POST /api/hotels).
 */
export interface Proprietaire {
  utilisateurId: string;
  role: string;
}

const MAX_JOURS_INVENTAIRE = 366;

function estAdmin(p: Proprietaire) {
  return p.role === "ADMIN";
}

async function exigerHotel(p: Proprietaire, hotelId: string) {
  const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
  if (!hotel) throw new ErreurNonTrouve("Hôtel introuvable");
  if (!estAdmin(p) && hotel.prestataireId !== p.utilisateurId) {
    throw new ErreurInterdit("Cet hôtel ne vous appartient pas");
  }
  return hotel;
}

async function exigerChambre(p: Proprietaire, typeChambreId: string) {
  const chambre = await prisma.typeChambre.findUnique({ where: { id: typeChambreId } });
  if (!chambre) throw new ErreurNonTrouve("Type de chambre introuvable");
  await exigerHotel(p, chambre.hotelId);
  return chambre;
}

async function exigerTarif(p: Proprietaire, tarifId: string) {
  const tarif = await prisma.planTarif.findUnique({ where: { id: tarifId } });
  if (!tarif) throw new ErreurNonTrouve("Plan tarifaire introuvable");
  await exigerChambre(p, tarif.typeChambreId);
  return tarif;
}

function texte(valeur: unknown, max: number): string {
  return String(valeur ?? "").trim().slice(0, max);
}

function liste(valeur: unknown): string {
  return JSON.stringify(Array.isArray(valeur) ? valeur.map((v) => texte(v, 300)).filter(Boolean).slice(0, 30) : []);
}

/** Ajoute 1 jour à une date AAAA-MM-JJ (borne « au » inclusive → exclusive) */
function lendemain(jour: string): string {
  const d = parserJour(jour);
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Jours de la période [du, au] inclusive, filtrés par jours de semaine (0 = dimanche) */
export function joursPeriode(du: string, au: string, joursSemaine?: number[]): string[] {
  let jours: string[];
  try {
    jours = nuitsEntre(du, lendemain(au));
  } catch {
    throw new ErreurValidation("La date de fin doit être égale ou postérieure à la date de début");
  }
  if (jours.length > MAX_JOURS_INVENTAIRE) {
    throw new ErreurValidation(`Période trop longue (${MAX_JOURS_INVENTAIRE} jours maximum)`);
  }
  if (joursSemaine && joursSemaine.length > 0) {
    jours = jours.filter((j) => joursSemaine.includes(parserJour(j).getDay()));
  }
  return jours;
}

// ---------------------------------------------------------------------------
// Hôtels
// ---------------------------------------------------------------------------

export async function listerMesHotels(p: Proprietaire) {
  const hotels = await prisma.hotel.findMany({
    where: estAdmin(p) ? undefined : { prestataireId: p.utilisateurId },
    orderBy: { nom: "asc" },
    include: {
      chambres: {
        orderBy: { nom: "asc" },
        include: { tarifs: { orderBy: { prixParNuit: "asc" } } },
      },
    },
  });
  return hotels.map((h) => ({
    ...h,
    commodites: JSON.parse(h.commodites || "[]"),
    photos: JSON.parse(h.photos || "[]"),
    chambres: h.chambres.map((c) => ({
      ...c,
      commodites: JSON.parse(c.commodites || "[]"),
      photos: JSON.parse(c.photos || "[]"),
    })),
  }));
}

export async function modifierMonHotel(
  p: Proprietaire,
  hotelId: string,
  input: Parameters<typeof modifierHotelAdmin>[1] & {
    politiqueAnnul?: string;
    checkInHeure?: string;
    checkOutHeure?: string;
    commodites?: string[];
    photos?: string[];
  }
) {
  await exigerHotel(p, hotelId);
  // Le prix « rapide » de l'admin écrase le premier tarif : le prestataire passe par les plans tarifaires.
  const { prixParNuit: _prix, devise: _devise, ...reste } = input;
  await modifierHotelAdmin(hotelId, reste);
  const data: Record<string, string> = {};
  if (input.politiqueAnnul != null) data.politiqueAnnul = texte(input.politiqueAnnul, 500);
  if (input.checkInHeure != null) data.checkInHeure = texte(input.checkInHeure, 5);
  if (input.checkOutHeure != null) data.checkOutHeure = texte(input.checkOutHeure, 5);
  if (input.commodites != null) data.commodites = liste(input.commodites);
  if (input.photos != null) data.photos = liste(input.photos);
  if (Object.keys(data).length > 0) {
    return prisma.hotel.update({ where: { id: hotelId }, data });
  }
  return prisma.hotel.findUnique({ where: { id: hotelId } });
}

// ---------------------------------------------------------------------------
// Types de chambre
// ---------------------------------------------------------------------------

export interface SaisieChambre {
  nom?: string;
  description?: string | null;
  capaciteAdultes?: number;
  capaciteEnfants?: number;
  superficieM2?: number | null;
  lits?: string;
  commodites?: string[];
  photos?: string[];
  actif?: boolean;
}

function donneesChambre(input: SaisieChambre) {
  const data: Record<string, unknown> = {};
  if (input.nom != null) {
    const nom = texte(input.nom, 120);
    if (nom.length < 2) throw new ErreurValidation("Le nom de la chambre est trop court");
    data.nom = nom;
  }
  if (input.description !== undefined) data.description = texte(input.description, 2000) || null;
  if (input.capaciteAdultes != null) data.capaciteAdultes = input.capaciteAdultes;
  if (input.capaciteEnfants != null) data.capaciteEnfants = input.capaciteEnfants;
  if (input.superficieM2 !== undefined) data.superficieM2 = input.superficieM2;
  if (input.lits != null) data.lits = texte(input.lits, 120) || "1 lit double";
  if (input.commodites != null) data.commodites = liste(input.commodites);
  if (input.photos != null) data.photos = liste(input.photos);
  if (input.actif != null) data.actif = input.actif;
  return data;
}

export async function creerChambre(p: Proprietaire, hotelId: string, input: SaisieChambre) {
  await exigerHotel(p, hotelId);
  if (!input.nom) throw new ErreurValidation("Le nom de la chambre est requis");
  return prisma.typeChambre.create({
    data: { hotelId, ...(donneesChambre(input) as { nom: string }) },
  });
}

export async function modifierChambre(p: Proprietaire, typeChambreId: string, input: SaisieChambre) {
  await exigerChambre(p, typeChambreId);
  return prisma.typeChambre.update({ where: { id: typeChambreId }, data: donneesChambre(input) });
}

// ---------------------------------------------------------------------------
// Plans tarifaires
// ---------------------------------------------------------------------------

export interface SaisieTarif {
  nom?: string;
  prixParNuit?: number;
  devise?: "USD" | "CDF";
  petitDejeuner?: boolean;
  remboursable?: boolean;
  delaiAnnulHeures?: number;
  actif?: boolean;
}

function donneesTarif(input: SaisieTarif) {
  const data: Record<string, unknown> = {};
  if (input.nom != null) {
    const nom = texte(input.nom, 80);
    if (nom.length < 2) throw new ErreurValidation("Le nom du tarif est trop court");
    data.nom = nom;
  }
  if (input.prixParNuit != null) data.prixParNuit = input.prixParNuit;
  if (input.devise != null) data.devise = input.devise;
  if (input.petitDejeuner != null) data.petitDejeuner = input.petitDejeuner;
  if (input.remboursable != null) data.remboursable = input.remboursable;
  if (input.delaiAnnulHeures != null) data.delaiAnnulHeures = input.delaiAnnulHeures;
  if (input.actif != null) data.actif = input.actif;
  return data;
}

export async function creerTarif(p: Proprietaire, typeChambreId: string, input: SaisieTarif) {
  await exigerChambre(p, typeChambreId);
  if (!input.nom || input.prixParNuit == null) {
    throw new ErreurValidation("Nom et prix par nuit sont requis");
  }
  return prisma.planTarif.create({
    data: { typeChambreId, ...(donneesTarif(input) as { nom: string; prixParNuit: number }) },
  });
}

export async function modifierTarif(p: Proprietaire, tarifId: string, input: SaisieTarif) {
  await exigerTarif(p, tarifId);
  return prisma.planTarif.update({ where: { id: tarifId }, data: donneesTarif(input) });
}

// ---------------------------------------------------------------------------
// Inventaire (nombre de chambres ouvertes à la vente par nuit, prix saisonnier)
// ---------------------------------------------------------------------------

export async function lireInventaire(p: Proprietaire, typeChambreId: string, du: string, au: string) {
  await exigerChambre(p, typeChambreId);
  const jours = joursPeriode(du, au);
  const dispos = await prisma.disponibiliteJour.findMany({
    where: { typeChambreId, jour: { in: jours } },
  });
  const parJour = new Map(dispos.map((d) => [d.jour, d]));
  return jours.map((jour) => {
    const d = parJour.get(jour);
    const total = d?.total ?? 0;
    const vendues = d?.vendues ?? 0;
    const reservees = d?.reservees ?? 0;
    return { jour, total, vendues, reservees, libres: Math.max(0, total - vendues - reservees), prix: d?.prix ?? 0 };
  });
}

/**
 * Ouvre / ajuste l'inventaire sur une période. `total` = nombre de chambres de ce type
 * à vendre chaque nuit ; `prix` (optionnel) = surcharge du prix de la nuit (0 = prix du plan).
 * Refuse de descendre sous ce qui est déjà vendu ou en cours de réservation.
 */
export async function definirInventaire(
  p: Proprietaire,
  typeChambreId: string,
  input: { du: string; au: string; total?: number; prix?: number; joursSemaine?: number[] }
) {
  await exigerChambre(p, typeChambreId);
  if (input.total == null && input.prix == null) {
    throw new ErreurValidation("Indiquez un nombre de chambres (total) et/ou un prix");
  }
  const jours = joursPeriode(input.du, input.au, input.joursSemaine);
  if (jours.length === 0) throw new ErreurValidation("Aucun jour ne correspond à la sélection");

  return prisma.$transaction(async (tx) => {
    const existants = await tx.disponibiliteJour.findMany({
      where: { typeChambreId, jour: { in: jours } },
    });
    const parJour = new Map(existants.map((d) => [d.jour, d]));

    if (input.total != null) {
      const conflits = existants.filter((d) => input.total! < d.vendues + d.reservees);
      if (conflits.length > 0) {
        const exemple = conflits[0];
        throw new ErreurConflit(
          `Impossible de descendre à ${input.total} chambre(s) : ${exemple.vendues + exemple.reservees} déjà réservée(s) le ${exemple.jour}` +
            (conflits.length > 1 ? ` (et ${conflits.length - 1} autre(s) jour(s))` : "")
        );
      }
    }

    for (const jour of jours) {
      const actuel = parJour.get(jour);
      if (actuel) {
        await tx.disponibiliteJour.update({
          where: { id: actuel.id },
          data: {
            ...(input.total != null ? { total: input.total } : {}),
            ...(input.prix != null ? { prix: input.prix } : {}),
          },
        });
      } else {
        await tx.disponibiliteJour.create({
          data: { typeChambreId, jour, total: input.total ?? 0, prix: input.prix ?? 0 },
        });
      }
    }
    return { joursMisAJour: jours.length };
  });
}
