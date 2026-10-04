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
