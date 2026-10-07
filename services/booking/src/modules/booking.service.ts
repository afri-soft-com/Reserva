import { prisma } from "../config/prisma";
import { env } from "../config/env";
import {
  ErreurConflit,
  ErreurInterdit,
  ErreurNonTrouve,
  ErreurValidation,
} from "@reserva/service-kit";
import { calculerTarificationReservation } from "@reserva/shared";
import { confirmerInventaire, libererInventaire, reserverInventaire } from "./hotels-client";
import { confirmerPlaces, libererPlaces, reserverPlaces } from "./transport-client";

function numero(prefix: string) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${s}`;
}

async function simulerPaiement(operateur: string, _montant: number, idempotencyKey?: string) {
  await new Promise((r) => setTimeout(r, 300));
  const reference = idempotencyKey?.trim() || `SIM-${operateur}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  if (operateur === "ESPECES") {
    return { statut: "EN_ATTENTE" as const, reference: idempotencyKey?.trim() || `ESP-${Date.now()}`, message: "À régler sur place" };
  }
  // Idempotence : même clé → même succès (pas de randomisation sur retry)
  const ok = idempotencyKey ? true : Math.random() < 0.94;
  return {
    statut: ok ? "PAYE" as const : "ECHOUE" as const,
    reference,
    message: ok ? "Paiement confirmé" : "Le paiement n'est pas passé. Réessayez.",
  };
}

export async function creerHold(clientId: string, token: string, input: {
  hotelId: string;
  typeChambreId: string;
  planTarifId: string;
  arrivee: string;
  depart: string;
  adultes: number;
  enfants: number;
  quantite?: number;
  notes?: string;
}) {
  const inventaire: any = await reserverInventaire(token, input);
  const tarif = calculerTarificationReservation({
    prixService: inventaire.montantChambre,
    devise: inventaire.tarif.devise,
    tauxCommissionPourcent: 3.5,
  });
  const expireLe = new Date(Date.now() + env.HOLD_MINUTES * 60 * 1000);

  return prisma.sejourHotel.create({
    data: {
      numero: numero("HTL"),
      clientId,
      hotelId: inventaire.hotel.id,
      hotelNom: inventaire.hotel.nom,
      ville: inventaire.hotel.ville,
      typeChambreId: inventaire.chambre.id,
      chambreNom: inventaire.chambre.nom,
      planTarifId: inventaire.tarif.id,
      tarifNom: inventaire.tarif.nom,
      arrivee: input.arrivee,
      depart: input.depart,
      nuits: inventaire.nuits,
      adultes: input.adultes,
      enfants: input.enfants,
      quantite: inventaire.quantite ?? input.quantite ?? 1,
      montantChambre: tarif.montantBase,
      montantFrais: tarif.montantFraisService,
      montantCommission: tarif.montantCommission,
      montantTotal: tarif.montantTotalClient,
      devise: inventaire.tarif.devise,
      statut: "HOLD",
      expireLe,
      notes: input.notes,
    },
  });
}

export async function obtenirSejour(utilisateurId: string, sejourId: string) {
  const sejour = await prisma.sejourHotel.findUnique({
    where: { id: sejourId },
    include: { paiements: { orderBy: { creeLe: "desc" } } },
  });
  if (!sejour) throw new ErreurNonTrouve("Réservation hôtel introuvable");
  if (sejour.clientId !== utilisateurId) throw new ErreurInterdit();
  return sejour;
}

export async function listerMesSejours(clientId: string) {
  return prisma.sejourHotel.findMany({
    where: { clientId },
    orderBy: { creeLe: "desc" },
    take: 50,
  });
}

export async function payerSejour(
  utilisateurId: string,
  token: string,
  sejourId: string,
  input: { operateur: string; telephonePaiement?: string; montant: number; idempotencyKey?: string }
) {
  const sejour = await prisma.sejourHotel.findUnique({ where: { id: sejourId } });
  if (!sejour) throw new ErreurNonTrouve("Réservation hôtel introuvable");
  if (sejour.clientId !== utilisateurId) throw new ErreurInterdit();
  if (sejour.statut === "ANNULE" || sejour.statut === "EXPIRE") {
    throw new ErreurValidation("Ce séjour ne peut plus être payé");
  }
  if (sejour.statut === "HOLD" && sejour.expireLe < new Date()) {
    await expirerHoldHotel(sejour, token);
    throw new ErreurValidation("Votre option a expiré. Relancez une recherche.");
  }
  const restant = sejour.montantTotal - sejour.montantPaye;
  if (input.montant > restant + 0.01) throw new ErreurValidation("Montant supérieur au solde");

  if (input.idempotencyKey) {
    const existant = await prisma.paiementSejour.findUnique({
      where: { referenceExterne: input.idempotencyKey },
    });
    if (existant) {
      const actuel = await prisma.sejourHotel.findUnique({ where: { id: sejourId } });
      return { sejour: actuel, paiement: existant, message: "Paiement déjà enregistré (idempotent)", idempotent: true };
    }
  }

  const resultat = await simulerPaiement(input.operateur, input.montant, input.idempotencyKey);
  const montantAvant = sejour.montantPaye;

  try {
    const paiement = await prisma.paiementSejour.create({
      data: {
        sejourId: sejour.id,
        operateur: input.operateur,
        montant: input.montant,
        devise: sejour.devise,
        statut: resultat.statut,
        referenceExterne: resultat.reference,
        telephonePaiement: input.telephonePaiement,
      },
    });

    if (resultat.statut === "PAYE") {
      const paye = montantAvant + input.montant;
      const complet = paye >= sejour.montantTotal - 0.01;
      if (complet && sejour.statut === "HOLD") {
        await confirmerInventaire(token, {
          typeChambreId: sejour.typeChambreId,
          arrivee: sejour.arrivee,
          depart: sejour.depart,
          quantite: sejour.quantite,
        });
      }
      const majCount = await prisma.sejourHotel.updateMany({
        where: { id: sejour.id, montantPaye: montantAvant },
        data: {
          montantPaye: paye,
          statutPaiement: complet ? "PAYE" : "PARTIEL",
          statut: complet ? "CONFIRME" : sejour.statut,
        },
      });
      if (majCount.count === 0) throw new ErreurConflit("Paiement concurrent détecté");
      const maj = await prisma.sejourHotel.findUnique({ where: { id: sejour.id } });
      return { sejour: maj, paiement, message: resultat.message };
    }

    if (resultat.statut === "EN_ATTENTE") {
      return { sejour, paiement, message: resultat.message };
    }

    throw new ErreurConflit(resultat.message);
  } catch (e: any) {
    if (String(e?.code) === "P2002" && input.idempotencyKey) {
      const existant = await prisma.paiementSejour.findUnique({ where: { referenceExterne: input.idempotencyKey } });
      const actuel = await prisma.sejourHotel.findUnique({ where: { id: sejourId } });
      return { sejour: actuel, paiement: existant, message: "Paiement déjà enregistré (idempotent)", idempotent: true };
    }
    throw e;
  }
}

export async function annulerSejour(utilisateurId: string, token: string, sejourId: string) {
  const sejour = await prisma.sejourHotel.findUnique({ where: { id: sejourId } });
  if (!sejour) throw new ErreurNonTrouve("Réservation hôtel introuvable");
  if (sejour.clientId !== utilisateurId) throw new ErreurInterdit();
  if (["ANNULE", "EXPIRE"].includes(sejour.statut)) {
    throw new ErreurValidation("Déjà annulé");
  }
  await libererInventaire(token, {
    typeChambreId: sejour.typeChambreId,
    arrivee: sejour.arrivee,
    depart: sejour.depart,
    etaitConfirme: sejour.statut === "CONFIRME",
    quantite: sejour.quantite,
  });
  return prisma.sejourHotel.update({
    where: { id: sejour.id },
    data: { statut: "ANNULE" },
  });
}

async function expirerHoldHotel(
  sejour: { id: string; typeChambreId: string; arrivee: string; depart: string; quantite?: number },
  token: string
) {
  try {
    await libererInventaire(token, {
      typeChambreId: sejour.typeChambreId,
      arrivee: sejour.arrivee,
      depart: sejour.depart,
      etaitConfirme: false,
      quantite: sejour.quantite ?? 1,
    });
  } catch {
    /* */
  }
  await prisma.sejourHotel.update({ where: { id: sejour.id }, data: { statut: "EXPIRE" } });
}

// --- Transport billets ---

export async function creerHoldBillet(clientId: string, token: string, input: {
  trajetId: string;
  places: number;
  notes?: string;
}) {
  const inventaire: any = await reserverPlaces(token, input);
  const tarif = calculerTarificationReservation({
    prixService: inventaire.montantBase,
    devise: inventaire.devise,
    tauxCommissionPourcent: 3.5,
  });
  const expireLe = new Date(Date.now() + env.HOLD_MINUTES * 60 * 1000);

  return prisma.billetTransport.create({
    data: {
      numero: numero("BUS"),
      clientId,
      trajetId: inventaire.trajet.id,
      operateurNom: inventaire.operateur.nom,
      origine: inventaire.origine,
      destination: inventaire.destination,
      dateDepart: inventaire.trajet.dateDepart,
      heureDepart: inventaire.trajet.heureDepart,
      dureeMinutes: inventaire.trajet.dureeMinutes,
      places: inventaire.places,
      montantBase: tarif.montantBase,
      montantFrais: tarif.montantFraisService,
      montantCommission: tarif.montantCommission,
      montantTotal: tarif.montantTotalClient,
      devise: inventaire.devise,
      statut: "HOLD",
      expireLe,
      notes: input.notes,
    },
  });
}

export async function obtenirBillet(utilisateurId: string, billetId: string) {
  const billet = await prisma.billetTransport.findUnique({
    where: { id: billetId },
    include: { paiements: { orderBy: { creeLe: "desc" } } },
  });
  if (!billet) throw new ErreurNonTrouve("Billet introuvable");
  if (billet.clientId !== utilisateurId) throw new ErreurInterdit();
  return billet;
}

export async function listerMesBillets(clientId: string) {
  return prisma.billetTransport.findMany({
    where: { clientId },
    orderBy: { creeLe: "desc" },
    take: 50,
  });
}

export async function payerBillet(
  utilisateurId: string,
  token: string,
  billetId: string,
  input: { operateur: string; telephonePaiement?: string; montant: number; idempotencyKey?: string }
) {
  const billet = await prisma.billetTransport.findUnique({ where: { id: billetId } });
  if (!billet) throw new ErreurNonTrouve("Billet introuvable");
  if (billet.clientId !== utilisateurId) throw new ErreurInterdit();
  if (["ANNULE", "EXPIRE"].includes(billet.statut)) {
    throw new ErreurValidation("Ce billet ne peut plus être payé");
  }
  if (billet.statut === "HOLD" && billet.expireLe < new Date()) {
    await expirerHoldBillet(billet, token);
    throw new ErreurValidation("Option expirée. Relancez une recherche.");
  }
  const restant = billet.montantTotal - billet.montantPaye;
  if (input.montant > restant + 0.01) throw new ErreurValidation("Montant supérieur au solde");

  if (input.idempotencyKey) {
    const existant = await prisma.paiementBillet.findUnique({
      where: { referenceExterne: input.idempotencyKey },
    });
    if (existant) {
      const actuel = await prisma.billetTransport.findUnique({ where: { id: billetId } });
      return { billet: actuel, paiement: existant, message: "Paiement déjà enregistré (idempotent)", idempotent: true };
    }
  }

  const resultat = await simulerPaiement(input.operateur, input.montant, input.idempotencyKey);
  const montantAvant = billet.montantPaye;

  try {
    const paiement = await prisma.paiementBillet.create({
      data: {
        billetId: billet.id,
        operateur: input.operateur,
        montant: input.montant,
        devise: billet.devise,
        statut: resultat.statut,
        referenceExterne: resultat.reference,
        telephonePaiement: input.telephonePaiement,
      },
    });

    if (resultat.statut === "PAYE") {
      const paye = montantAvant + input.montant;
      const complet = paye >= billet.montantTotal - 0.01;
      if (complet && billet.statut === "HOLD") {
        await confirmerPlaces(token, { trajetId: billet.trajetId, places: billet.places });
      }
      const majCount = await prisma.billetTransport.updateMany({
        where: { id: billet.id, montantPaye: montantAvant },
        data: {
          montantPaye: paye,
          statutPaiement: complet ? "PAYE" : "PARTIEL",
          statut: complet ? "CONFIRME" : billet.statut,
          qrCode: complet ? `RESERVA-BUS:${billet.numero}` : billet.qrCode,
        },
      });
      if (majCount.count === 0) throw new ErreurConflit("Paiement concurrent détecté");
      const maj = await prisma.billetTransport.findUnique({ where: { id: billet.id } });
      return { billet: maj, paiement, message: resultat.message };
    }

    if (resultat.statut === "EN_ATTENTE") {
      return { billet, paiement, message: resultat.message };
    }

    throw new ErreurConflit(resultat.message);
  } catch (e: any) {
    if (String(e?.code) === "P2002" && input.idempotencyKey) {
      const existant = await prisma.paiementBillet.findUnique({ where: { referenceExterne: input.idempotencyKey } });
      const actuel = await prisma.billetTransport.findUnique({ where: { id: billetId } });
      return { billet: actuel, paiement: existant, message: "Paiement déjà enregistré (idempotent)", idempotent: true };
    }
    throw e;
  }
}

export async function annulerBillet(utilisateurId: string, token: string, billetId: string) {
  const billet = await prisma.billetTransport.findUnique({ where: { id: billetId } });
  if (!billet) throw new ErreurNonTrouve("Billet introuvable");
  if (billet.clientId !== utilisateurId) throw new ErreurInterdit();
  if (["ANNULE", "EXPIRE"].includes(billet.statut)) throw new ErreurValidation("Déjà annulé");
  await libererPlaces(token, {
    trajetId: billet.trajetId,
    places: billet.places,
    etaitConfirme: billet.statut === "CONFIRME",
  });
  return prisma.billetTransport.update({
    where: { id: billet.id },
    data: { statut: "ANNULE" },
  });
}

async function expirerHoldBillet(billet: { id: string; trajetId: string; places: number }, token: string) {
  try {
    await libererPlaces(token, { trajetId: billet.trajetId, places: billet.places, etaitConfirme: false });
  } catch {
    /* */
  }
  await prisma.billetTransport.update({ where: { id: billet.id }, data: { statut: "EXPIRE" } });
}

export async function expirerHoldsExpires() {
  const maintenant = new Date();
  let n = 0;
  const sejours = await prisma.sejourHotel.findMany({
    where: { statut: "HOLD", expireLe: { lt: maintenant } },
  });
  for (const h of sejours) {
    try {
      await libererInventaire("", {
        typeChambreId: h.typeChambreId,
        arrivee: h.arrivee,
        depart: h.depart,
        etaitConfirme: false,
        quantite: h.quantite,
      });
    } catch {
      /* */
    }
    await prisma.sejourHotel.update({ where: { id: h.id }, data: { statut: "EXPIRE" } });
    n += 1;
  }
  const billets = await prisma.billetTransport.findMany({
    where: { statut: "HOLD", expireLe: { lt: maintenant } },
  });
  for (const b of billets) {
    try {
      await libererPlaces("", { trajetId: b.trajetId, places: b.places, etaitConfirme: false });
    } catch {
      /* */
    }
    await prisma.billetTransport.update({ where: { id: b.id }, data: { statut: "EXPIRE" } });
    n += 1;
  }
  return { expires: n };
}
