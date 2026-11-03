import { prisma } from "../config/prisma";
import { ErreurConflit, ErreurNonTrouve, ErreurValidation } from "@reserva/service-kit";
import { calculerPolitiqueAnnulation } from "@reserva/shared";

export async function listerVilles() {
  const lignes = await prisma.ligne.findMany({ where: { actif: true } });
  const set = new Set<string>();
  for (const l of lignes) {
    set.add(l.origine);
    set.add(l.destination);
  }
  return [...set].sort();
}

export async function rechercherTrajets(filtres: {
  origine: string;
  destination: string;
  date: string;
  places?: number;
  tri?: "prix" | "duree" | "depart";
}) {
  const places = Math.max(1, filtres.places ?? 1);
  const trajets = await prisma.trajet.findMany({
    where: {
      actif: true,
      dateDepart: filtres.date,
      ligne: {
        actif: true,
        origine: { contains: filtres.origine },
        destination: { contains: filtres.destination },
      },
    },
    include: { operateur: true, ligne: true },
  });

  let items = trajets
    .map((t) => {
      const restantes = t.placesTotales - t.placesReservees - t.placesVendues;
      return {
        id: t.id,
        dateDepart: t.dateDepart,
        heureDepart: t.heureDepart,
        dureeMinutes: t.dureeMinutes,
        confort: t.confort,
        prix: t.prix,
        devise: t.devise,
        placesRestantes: restantes,
        disponible: restantes >= places,
        remboursable: t.remboursable,
        delaiAnnulHeures: t.delaiAnnulHeures,
        operateur: {
          id: t.operateur.id,
          nom: t.operateur.nom,
          noteMoyenne: t.operateur.noteMoyenne,
          logoUrl: t.operateur.logoUrl,
        },
        origine: t.ligne.origine,
        destination: t.ligne.destination,
        distanceKm: t.ligne.distanceKm,
        politiqueAnnulation: calculerPolitiqueAnnulation({
          remboursable: t.remboursable,
          delaiAnnulHeures: t.delaiAnnulHeures,
          arrivee: t.dateDepart,
          montantTotal: t.prix * places,
          devise: t.devise,
        }),
      };
    })
    .filter((t) => t.disponible);

  const tri = filtres.tri ?? "depart";
  items.sort((a, b) => {
    if (tri === "prix") return a.prix - b.prix;
    if (tri === "duree") return a.dureeMinutes - b.dureeMinutes;
    return a.heureDepart.localeCompare(b.heureDepart);
  });

  return { total: items.length, date: filtres.date, places, items };
}

export async function detailTrajet(trajetId: string, places = 1) {
  const t = await prisma.trajet.findUnique({
    where: { id: trajetId },
    include: { operateur: true, ligne: true },
  });
  if (!t || !t.actif) throw new ErreurNonTrouve("Trajet introuvable");
  const restantes = t.placesTotales - t.placesReservees - t.placesVendues;
  return {
    id: t.id,
    dateDepart: t.dateDepart,
    heureDepart: t.heureDepart,
    dureeMinutes: t.dureeMinutes,
    confort: t.confort,
    prix: t.prix,
    devise: t.devise,
    placesRestantes: restantes,
    disponible: restantes >= places,
    remboursable: t.remboursable,
    delaiAnnulHeures: t.delaiAnnulHeures,
    operateur: t.operateur,
    origine: t.ligne.origine,
    destination: t.ligne.destination,
    distanceKm: t.ligne.distanceKm,
    conditions: "Présentez-vous 30 min avant le départ. Bagage cabine 15 kg inclus.",
    politiqueAnnulation: calculerPolitiqueAnnulation({
      remboursable: t.remboursable,
      delaiAnnulHeures: t.delaiAnnulHeures,
      arrivee: t.dateDepart,
      montantTotal: t.prix * places,
      devise: t.devise,
    }),
  };
}

export async function reserverPlaces(input: { trajetId: string; places: number }) {
  const places = Math.max(1, Math.min(8, input.places));
  const t = await prisma.trajet.findUnique({
    where: { id: input.trajetId },
    include: { operateur: true, ligne: true },
  });
  if (!t || !t.actif) throw new ErreurNonTrouve("Trajet introuvable");
  const restantes = t.placesTotales - t.placesReservees - t.placesVendues;
  if (restantes < places) throw new ErreurConflit("Plus assez de places sur ce départ");

  await prisma.trajet.update({
    where: { id: t.id },
    data: { placesReservees: { increment: places } },
  });

  const montantBase = t.prix * places;
  return {
    trajet: {
      id: t.id,
      dateDepart: t.dateDepart,
      heureDepart: t.heureDepart,
      dureeMinutes: t.dureeMinutes,
      confort: t.confort,
      remboursable: t.remboursable,
      delaiAnnulHeures: t.delaiAnnulHeures,
    },
    operateur: { id: t.operateur.id, nom: t.operateur.nom },
    origine: t.ligne.origine,
    destination: t.ligne.destination,
    places,
    montantBase,
    devise: t.devise,
    politiqueAnnulation: calculerPolitiqueAnnulation({
      remboursable: t.remboursable,
      delaiAnnulHeures: t.delaiAnnulHeures,
      arrivee: t.dateDepart,
      montantTotal: montantBase,
      devise: t.devise,
    }),
  };
}

export async function confirmerPlaces(input: { trajetId: string; places: number }) {
  const places = Math.max(1, input.places);
  const t = await prisma.trajet.findUnique({ where: { id: input.trajetId } });
  if (!t) throw new ErreurNonTrouve("Trajet introuvable");
  await prisma.trajet.update({
    where: { id: t.id },
    data: {
      placesReservees: { decrement: Math.min(t.placesReservees, places) },
      placesVendues: { increment: places },
    },
  });
  return { confirme: true };
}

export async function libererPlaces(input: { trajetId: string; places: number; etaitConfirme?: boolean }) {
  const places = Math.max(1, input.places);
  const t = await prisma.trajet.findUnique({ where: { id: input.trajetId } });
  if (!t) throw new ErreurNonTrouve("Trajet introuvable");
  await prisma.trajet.update({
    where: { id: t.id },
    data: input.etaitConfirme
      ? { placesVendues: { decrement: Math.min(t.placesVendues, places) } }
      : { placesReservees: { decrement: Math.min(t.placesReservees, places) } },
  });
  return { libere: true };
}

export async function listerTrajetsAdmin(date?: string) {
  return prisma.trajet.findMany({
    where: date ? { dateDepart: date } : undefined,
    include: { operateur: true, ligne: true },
    orderBy: [{ dateDepart: "asc" }, { heureDepart: "asc" }],
    take: 200,
  });
}

export async function validerRecherche(origine?: string, destination?: string, date?: string) {
  if (!origine?.trim() || !destination?.trim() || !date) {
    throw new ErreurValidation("origine, destination et date sont requis");
  }
}

export type SaisieTrajet = {
  origine?: string;
  destination?: string;
  dateDepart?: string;
  heureDepart?: string;
  dureeMinutes?: number;
  prix?: number;
  placesTotales?: number;
  operateurNom?: string;
  confort?: string;
  actif?: boolean;
};

const JOUR_TRAJET = /^\d{4}-\d{2}-\d{2}$/;
const HEURE_TRAJET = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Refuse les jours impossibles (2026-02-31) que le motif seul laisse passer. */
function jourTrajetValide(valeur: string): boolean {
  if (!JOUR_TRAJET.test(valeur)) return false;
  const [annee, mois, jour] = valeur.split("-").map(Number);
  const date = new Date(Date.UTC(annee, mois - 1, jour));
  return date.getUTCFullYear() === annee && date.getUTCMonth() === mois - 1 && date.getUTCDate() === jour;
}

async function lignePour(origine: string, destination: string) {
  return prisma.ligne.upsert({
    where: { origine_destination: { origine, destination } },
    create: { origine, destination },
    update: { actif: true },
  });
}

async function operateurPour(nom: string) {
  const propre = nom.trim();
  const existant = await prisma.operateur.findFirst({ where: { nom: propre } });
  if (!existant) return prisma.operateur.create({ data: { nom: propre } });
  if (!existant.actif) return prisma.operateur.update({ where: { id: existant.id }, data: { actif: true } });
  return existant;
}

function validerChampsTrajet(input: SaisieTrajet, complet: boolean) {
  const origine = input.origine?.trim() ?? "";
  const destination = input.destination?.trim() ?? "";
  if ((complet || input.origine != null || input.destination != null) && origine && destination && origine.toLowerCase() === destination.toLowerCase()) {
    throw new ErreurValidation("Origine et destination doivent être différentes");
  }
  if (complet && (!origine || !destination)) throw new ErreurValidation("Origine et destination sont requises");
  if (complet && !input.operateurNom?.trim()) throw new ErreurValidation("Le nom de l'opérateur est requis");
  if (input.dateDepart != null && !jourTrajetValide(input.dateDepart)) throw new ErreurValidation("Date de départ invalide");
  if (complet && !input.dateDepart) throw new ErreurValidation("Date de départ invalide");
  if (input.heureDepart != null && !HEURE_TRAJET.test(input.heureDepart)) throw new ErreurValidation("Heure de départ invalide (HH:MM)");
  if (complet && !input.heureDepart) throw new ErreurValidation("Heure de départ invalide (HH:MM)");
}

export async function creerTrajetAdmin(input: SaisieTrajet) {
  validerChampsTrajet(input, true);
  const duree = Math.round(Number(input.dureeMinutes));
  const prix = Number(input.prix);
  const places = Math.round(Number(input.placesTotales));
  if (!Number.isFinite(duree) || duree < 10 || duree > 72 * 60) throw new ErreurValidation("Durée invalide");
  if (!Number.isFinite(prix) || prix <= 0) throw new ErreurValidation("Prix invalide");
  if (!Number.isFinite(places) || places < 1 || places > 80) throw new ErreurValidation("Nombre de places invalide");
  const [ligne, operateur] = await Promise.all([
    lignePour(input.origine!.trim(), input.destination!.trim()),
    operateurPour(input.operateurNom!),
  ]);
  return prisma.trajet.create({
    data: {
      ligneId: ligne.id,
      operateurId: operateur.id,
      dateDepart: input.dateDepart!,
      heureDepart: input.heureDepart!,
      dureeMinutes: duree,
      prix,
      placesTotales: places,
      confort: (input.confort || "STANDARD").trim().toUpperCase() || "STANDARD",
    },
    include: { operateur: true, ligne: true },
  });
}

export async function modifierTrajetAdmin(id: string, input: SaisieTrajet) {
  const trajet = await prisma.trajet.findUnique({ where: { id }, include: { ligne: true } });
  if (!trajet) throw new ErreurNonTrouve("Trajet introuvable");
  validerChampsTrajet({
    ...input,
    origine: input.origine ?? trajet.ligne.origine,
    destination: input.destination ?? trajet.ligne.destination,
  }, false);
  const data: {
    ligneId?: string;
    operateurId?: string;
    dateDepart?: string;
    heureDepart?: string;
    dureeMinutes?: number;
    prix?: number;
    placesTotales?: number;
    confort?: string;
    actif?: boolean;
  } = {};
  if (input.origine != null || input.destination != null) {
    const origine = (input.origine ?? trajet.ligne.origine).trim();
    const destination = (input.destination ?? trajet.ligne.destination).trim();
    if (!origine || !destination || origine.toLowerCase() === destination.toLowerCase()) {
      throw new ErreurValidation("Origine et destination doivent être différentes");
    }
    data.ligneId = (await lignePour(origine, destination)).id;
  }
  if (input.operateurNom?.trim()) data.operateurId = (await operateurPour(input.operateurNom)).id;
  if (input.dateDepart) data.dateDepart = input.dateDepart;
  if (input.heureDepart) data.heureDepart = input.heureDepart;
  if (input.dureeMinutes != null) {
    const duree = Math.round(Number(input.dureeMinutes));
    if (!Number.isFinite(duree) || duree < 10 || duree > 72 * 60) throw new ErreurValidation("Durée invalide");
    data.dureeMinutes = duree;
  }
  if (input.prix != null) {
    const prix = Number(input.prix);
    if (!Number.isFinite(prix) || prix <= 0) throw new ErreurValidation("Prix invalide");
    data.prix = prix;
  }
  if (input.placesTotales != null) {
    const places = Math.round(Number(input.placesTotales));
    const prises = trajet.placesVendues + trajet.placesReservees;
    if (!Number.isFinite(places) || places < Math.max(1, prises) || places > 80) {
      throw new ErreurValidation("Le nombre de places ne peut pas être inférieur aux places déjà prises");
    }
    data.placesTotales = places;
  }
  if (input.confort) data.confort = input.confort.trim().toUpperCase();
  if (input.actif != null) data.actif = Boolean(input.actif);
  return prisma.trajet.update({ where: { id }, data, include: { operateur: true, ligne: true } });
}

export async function retirerTrajetAdmin(id: string) {
  const trajet = await prisma.trajet.findUnique({ where: { id } });
  if (!trajet) throw new ErreurNonTrouve("Trajet introuvable");
  if (trajet.placesVendues > 0 || trajet.placesReservees > 0) {
    return prisma.trajet.update({
      where: { id },
      data: { actif: false },
      include: { operateur: true, ligne: true },
    });
  }
  await prisma.trajet.delete({ where: { id } });
  return { supprime: true, id };
}
