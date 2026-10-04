import { prisma } from "../config/prisma";
import { ErreurConflit, ErreurNonTrouve, ErreurValidation, nuitsEntre } from "@reserva/service-kit";
import { calculerPolitiqueAnnulation } from "@reserva/shared";

function parserListe(brut: string | null | undefined): string[] {
  try {
    const v = JSON.parse(brut || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function serialiserHotel(hotel: any) {
  return {
    ...hotel,
    commodites: parserListe(hotel.commodites),
    photos: parserListe(hotel.photos).length
      ? parserListe(hotel.photos)
      : hotel.photoUrl
        ? [hotel.photoUrl]
        : [],
    chambres: hotel.chambres?.map((c: any) => ({
      ...c,
      commodites: parserListe(c.commodites),
      photos: parserListe(c.photos),
    })),
  };
}

async function totalSejourPourTarif(
  typeChambreId: string,
  prixBase: number,
  nuits: string[]
): Promise<{ total: number; detailNuits: { jour: string; prix: number }[] }> {
  if (nuits.length === 0) {
    return { total: prixBase, detailNuits: [] };
  }
  const dispos = await prisma.disponibiliteJour.findMany({
    where: { typeChambreId, jour: { in: nuits } },
  });
  const map = new Map(dispos.map((d) => [d.jour, d.prix > 0 ? d.prix : prixBase]));
  const detailNuits = nuits.map((jour) => ({ jour, prix: map.get(jour) ?? prixBase }));
  const total = detailNuits.reduce((s, n) => s + n.prix, 0);
  return { total, detailNuits };
}

export async function listerVilles() {
  const lignes = await prisma.hotel.findMany({
    where: { actif: true },
    select: { ville: true },
    distinct: ["ville"],
    orderBy: { ville: "asc" },
  });
  return lignes.map((l) => l.ville);
}

export async function rechercherHotels(filtres: {
  ville?: string;
  arrivee?: string;
  depart?: string;
  adultes?: number;
  enfants?: number;
  etoilesMin?: number;
  prixMax?: number;
  noteMin?: number;
  commodite?: string;
  annulationGratuite?: boolean;
  petitDejeuner?: boolean;
  tri?: "prix" | "note" | "etoiles";
  page?: number;
  parPage?: number;
}) {
  const adultes = filtres.adultes ?? 2;
  const enfants = filtres.enfants ?? 0;
  const page = Math.max(1, filtres.page ?? 1);
  const parPage = Math.min(50, Math.max(1, filtres.parPage ?? 20));
  const nuits = filtres.arrivee && filtres.depart ? nuitsEntre(filtres.arrivee, filtres.depart) : [];

  const where: any = { actif: true };
  if (filtres.ville) where.ville = { contains: filtres.ville };
  if (filtres.etoilesMin) where.etoiles = { gte: filtres.etoilesMin };
  if (filtres.noteMin) where.noteMoyenne = { gte: filtres.noteMin };

  const hotels = await prisma.hotel.findMany({
    where,
    include: {
      chambres: {
        where: { actif: true, capaciteAdultes: { gte: adultes } },
        include: { tarifs: { where: { actif: true }, orderBy: { prixParNuit: "asc" } } },
      },
    },
  });

  const resultats = [];
  for (const hotel of hotels) {
    if (filtres.commodite) {
      const com = parserListe(hotel.commodites).map((c) => c.toLowerCase());
      if (!com.some((c) => c.includes(filtres.commodite!.toLowerCase()))) continue;
    }

    const chambresOk = [];
    for (const chambre of hotel.chambres) {
      if (chambre.capaciteEnfants < enfants) continue;
      let tarifs = chambre.tarifs;
      if (filtres.annulationGratuite) tarifs = tarifs.filter((t) => t.remboursable);
      if (filtres.petitDejeuner) tarifs = tarifs.filter((t) => t.petitDejeuner);
      if (tarifs.length === 0) continue;

      if (nuits.length > 0) {
        const dispos = await prisma.disponibiliteJour.findMany({
          where: { typeChambreId: chambre.id, jour: { in: nuits } },
        });
        if (dispos.length < nuits.length) continue;
        const manque = dispos.some((d) => d.total - d.vendues - d.reservees <= 0);
        if (manque) continue;
      }

      const tarif = tarifs[0];
      const { total } = await totalSejourPourTarif(chambre.id, tarif.prixParNuit, nuits);
      const prixMoyenNuit = nuits.length > 0 ? total / nuits.length : tarif.prixParNuit;
      if (filtres.prixMax && prixMoyenNuit > filtres.prixMax) continue;

      chambresOk.push({
        ...chambre,
        commodites: parserListe(chambre.commodites),
        photos: parserListe(chambre.photos),
        tarifDepuis: prixMoyenNuit,
        devise: tarif.devise,
        totalSejour: total,
        remboursable: tarif.remboursable,
        petitDejeuner: tarif.petitDejeuner,
      });
    }
    if (chambresOk.length === 0) continue;
    const meilleur = chambresOk.reduce((a, b) => (a.totalSejour <= b.totalSejour ? a : b));
    resultats.push({
      ...serialiserHotel({ ...hotel, chambres: undefined }),
      nombreChambresDispo: chambresOk.length,
      prixDepuis: Math.round(meilleur.tarifDepuis * 100) / 100,
      devise: meilleur.devise,
      totalDepuis: Math.round(meilleur.totalSejour * 100) / 100,
      nuits: nuits.length,
      annulationGratuite: chambresOk.some((c) => c.remboursable),
      petitDejeunerDispo: chambresOk.some((c) => c.petitDejeuner),
    });
  }

  const tri = filtres.tri ?? "note";
  resultats.sort((a, b) => {
    if (tri === "prix") return a.totalDepuis - b.totalDepuis;
    if (tri === "etoiles") return b.etoiles - a.etoiles;
    return b.noteMoyenne - a.noteMoyenne;
  });

  const total = resultats.length;
  const debut = (page - 1) * parPage;
  const items = resultats.slice(debut, debut + parPage);

  return {
    total,
    page,
    parPage,
    arrivee: filtres.arrivee,
    depart: filtres.depart,
    nuits: nuits.length,
    items,
  };
}

export async function detailHotel(hotelId: string, arrivee?: string, depart?: string, adultes = 2, enfants = 0) {
  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    include: {
      chambres: {
        where: { actif: true },
        include: { tarifs: { where: { actif: true }, orderBy: { prixParNuit: "asc" } } },
      },
      avis: { orderBy: { creeLe: "desc" }, take: 20 },
    },
  });
  if (!hotel || !hotel.actif) throw new ErreurNonTrouve("Hôtel introuvable");

  const nuits = arrivee && depart ? nuitsEntre(arrivee, depart) : [];
  const chambres = [];
  for (const chambre of hotel.chambres) {
    let disponible = chambre.capaciteAdultes >= adultes && chambre.capaciteEnfants >= enfants;
    let restantes = 0;
    if (nuits.length > 0) {
      const dispos = await prisma.disponibiliteJour.findMany({
        where: { typeChambreId: chambre.id, jour: { in: nuits } },
      });
      if (dispos.length < nuits.length) disponible = false;
      else {
        restantes = Math.min(...dispos.map((d) => d.total - d.vendues - d.reservees));
        if (restantes <= 0) disponible = false;
      }
    }
    const tarifsEnrichis = [];
    for (const t of chambre.tarifs) {
      const { total, detailNuits } = await totalSejourPourTarif(chambre.id, t.prixParNuit, nuits);
      const politique = calculerPolitiqueAnnulation({
        remboursable: t.remboursable,
        delaiAnnulHeures: t.delaiAnnulHeures,
        arrivee: arrivee || new Date().toISOString().slice(0, 10),
        montantTotal: total,
        devise: t.devise,
      });
      tarifsEnrichis.push({
        ...t,
        totalSejour: total,
        detailNuits,
        politiqueAnnulation: politique,
      });
    }
    chambres.push({
      ...chambre,
      commodites: parserListe(chambre.commodites),
      photos: parserListe(chambre.photos),
      disponible,
      chambresRestantes: restantes,
      tarifs: tarifsEnrichis,
    });
  }

  const { avis, ...reste } = hotel;
  return {
    ...serialiserHotel({ ...reste, chambres }),
    avis,
    arrivee,
    depart,
    nuits: nuits.length,
  };
}

export async function verifierEtReserver(input: {
  hotelId: string;
  typeChambreId: string;
  planTarifId: string;
  arrivee: string;
  depart: string;
  adultes: number;
  enfants: number;
  quantite?: number;
}) {
  const quantite = Math.max(1, Math.min(5, input.quantite ?? 1));
  const nuits = nuitsEntre(input.arrivee, input.depart);
  const chambre = await prisma.typeChambre.findUnique({
    where: { id: input.typeChambreId },
    include: { hotel: true, tarifs: true },
  });
  if (!chambre || chambre.hotelId !== input.hotelId || !chambre.actif) {
    throw new ErreurNonTrouve("Type de chambre introuvable");
  }
  if (chambre.capaciteAdultes < input.adultes || chambre.capaciteEnfants < input.enfants) {
    throw new ErreurValidation("Cette chambre ne convient pas au nombre de voyageurs");
  }
  const tarif = chambre.tarifs.find((t) => t.id === input.planTarifId && t.actif);
  if (!tarif) throw new ErreurNonTrouve("Plan tarifaire introuvable");

  await prisma.$transaction(async (tx) => {
    for (const jour of nuits) {
      const dispo = await tx.disponibiliteJour.findUnique({
        where: { typeChambreId_jour: { typeChambreId: chambre.id, jour } },
      });
      const libres = dispo ? dispo.total - dispo.vendues - dispo.reservees : 0;
      if (!dispo || libres < quantite) {
        throw new ErreurConflit(`Plus assez de chambres le ${jour}. Choisissez d'autres dates.`);
      }
      await tx.disponibiliteJour.update({
        where: { id: dispo.id },
        data: { reservees: { increment: quantite } },
      });
    }
  });

  const { total, detailNuits } = await totalSejourPourTarif(chambre.id, tarif.prixParNuit, nuits);
  const montantChambre = total * quantite;
  const politique = calculerPolitiqueAnnulation({
    remboursable: tarif.remboursable,
    delaiAnnulHeures: tarif.delaiAnnulHeures,
    arrivee: input.arrivee,
    montantTotal: montantChambre,
    devise: tarif.devise,
  });

  return {
    hotel: {
      id: chambre.hotel.id,
      nom: chambre.hotel.nom,
      ville: chambre.hotel.ville,
      quartier: chambre.hotel.quartier,
      etoiles: chambre.hotel.etoiles,
      politiqueAnnul: chambre.hotel.politiqueAnnul,
      checkInHeure: chambre.hotel.checkInHeure,
      checkOutHeure: chambre.hotel.checkOutHeure,
    },
    chambre: { id: chambre.id, nom: chambre.nom, lits: chambre.lits, capaciteAdultes: chambre.capaciteAdultes },
    tarif: {
      id: tarif.id,
      nom: tarif.nom,
      petitDejeuner: tarif.petitDejeuner,
      remboursable: tarif.remboursable,
      delaiAnnulHeures: tarif.delaiAnnulHeures,
      prixParNuit: tarif.prixParNuit,
      devise: tarif.devise,
    },
    nuits: nuits.length,
    quantite,
    detailNuits,
    montantChambre,
    politiqueAnnulation: politique,
  };
}

export async function confirmerReservationInventaire(input: {
  typeChambreId: string;
  arrivee: string;
  depart: string;
  quantite?: number;
}) {
  const quantite = Math.max(1, input.quantite ?? 1);
  const nuits = nuitsEntre(input.arrivee, input.depart);
  await prisma.$transaction(async (tx) => {
    for (const jour of nuits) {
      const dispo = await tx.disponibiliteJour.findUnique({
        where: { typeChambreId_jour: { typeChambreId: input.typeChambreId, jour } },
      });
      if (!dispo) continue;
      await tx.disponibiliteJour.update({
        where: { id: dispo.id },
        data: {
          reservees: { decrement: Math.min(dispo.reservees, quantite) },
          vendues: { increment: quantite },
        },
      });
    }
  });
  return { confirme: true };
}

export async function libererReservationInventaire(input: {
  typeChambreId: string;
  arrivee: string;
  depart: string;
  etaitConfirme?: boolean;
  quantite?: number;
}) {
  const quantite = Math.max(1, input.quantite ?? 1);
  const nuits = nuitsEntre(input.arrivee, input.depart);
  await prisma.$transaction(async (tx) => {
    for (const jour of nuits) {
      const dispo = await tx.disponibiliteJour.findUnique({
        where: { typeChambreId_jour: { typeChambreId: input.typeChambreId, jour } },
      });
      if (!dispo) continue;
      await tx.disponibiliteJour.update({
        where: { id: dispo.id },
        data: input.etaitConfirme
          ? { vendues: { decrement: Math.min(dispo.vendues, quantite) } }
          : { reservees: { decrement: Math.min(dispo.reservees, quantite) } },
      });
    }
  });
  return { libere: true };
}

export async function creerAvis(input: {
  hotelId: string;
  auteurNom: string;
  note: number;
  noteProprete?: number;
  noteEmplacement?: number;
  commentaire?: string;
  clientId?: string;
  sejourId?: string;
}) {
  if (input.note < 1 || input.note > 5) throw new ErreurValidation("Note entre 1 et 5");
  const hotel = await prisma.hotel.findUnique({ where: { id: input.hotelId } });
  if (!hotel) throw new ErreurNonTrouve("Hôtel introuvable");

  const avis = await prisma.avisHotel.create({
    data: {
      hotelId: input.hotelId,
      auteurNom: input.auteurNom,
      note: input.note,
      noteProprete: input.noteProprete ?? input.note,
      noteEmplacement: input.noteEmplacement ?? input.note,
      commentaire: input.commentaire,
      clientId: input.clientId,
      sejourId: input.sejourId,
    },
  });

  const tous = await prisma.avisHotel.findMany({ where: { hotelId: input.hotelId } });
  const n = tous.length;
  await prisma.hotel.update({
    where: { id: input.hotelId },
    data: {
      nombreAvis: n,
      noteMoyenne: tous.reduce((s, a) => s + a.note, 0) / n,
      noteProprete: tous.reduce((s, a) => s + a.noteProprete, 0) / n,
      noteEmplacement: tous.reduce((s, a) => s + a.noteEmplacement, 0) / n,
    },
  });
  return avis;
}
