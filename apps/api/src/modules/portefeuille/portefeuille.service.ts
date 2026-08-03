import { prisma } from "../../config/prisma";
import { obtenirSoldePoints } from "../fidelite/fidelite.service";
import { listerMesAvoirs } from "../avoirs/avoirs.service";
import { listerMesCartesCadeaux } from "../cartes-cadeaux/cartes-cadeaux.service";

/**
 * [CLIENT] Portefeuille RESERVA consolidé : avoirs, points de fidélité,
 * cartes cadeaux et historique récent des transactions financières.
 */
export async function obtenirPortefeuille(utilisateurId: string) {
  const avoirs = await listerMesAvoirs(utilisateurId);
  const points = await obtenirSoldePoints(utilisateurId);
  const cartes = await listerMesCartesCadeaux(utilisateurId);

  const [transactions, transactionsPoints, avoirsRecents, cartesRecentes] = await Promise.all([
    prisma.transaction.findMany({
      where: { reservation: { clientId: utilisateurId }, statut: "PAYE" },
      include: { reservation: { select: { numero: true, service: { select: { nom: true } } } } },
      orderBy: { creeLe: "desc" },
      take: 8,
    }),
    prisma.pointTransaction.findMany({
      where: { utilisateurId },
      orderBy: { creeLe: "desc" },
      take: 8,
    }),
    prisma.avoir.findMany({
      where: { utilisateurId },
      orderBy: { creeLe: "desc" },
      take: 8,
    }),
    prisma.carteCadeau.findMany({
      where: { OR: [{ acheteurId: utilisateurId }, { beneficiaireId: utilisateurId }] },
      orderBy: { creeLe: "desc" },
      take: 8,
    }),
  ]);

  const historique = [
    ...transactions.map((t) => ({
      type: "PAIEMENT",
      date: t.creeLe.toISOString(),
      libelle: `Paiement ${t.reservation.service.nom} (${t.reservation.numero})`,
      montant: t.montant,
      devise: t.devise,
      operateur: t.operateur,
      reference: t.referenceExterne,
    })),
    ...transactionsPoints.map((p) => ({
      type: "POINTS",
      date: p.creeLe.toISOString(),
      libelle: p.description ?? (p.type === "GAIN" ? "Points gagnés" : "Points utilisés"),
      points: p.montantPoints,
      sens: p.type,
    })),
    ...avoirsRecents.map((a) => ({
      type: "AVOIR",
      date: a.creeLe.toISOString(),
      libelle: a.sourceReservationId ? "Avoir créé (remboursement)" : "Crédit avoir",
      montant: a.montantInitial,
      restant: a.montantRestant,
      devise: a.devise,
      statut: a.statut,
    })),
    ...cartesRecentes.map((c) => ({
      type: "CARTE_CADEAU",
      date: c.creeLe.toISOString(),
      libelle: c.beneficiaireId === utilisateurId ? `Carte cadeau reçue (${c.code})` : `Carte cadeau achetée (${c.code})`,
      montant: c.montant,
      solde: c.solde,
      devise: c.devise,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20);

  return {
    avoirs: { solde: avoirs.soldeActif, devise: avoirs.devise, nombre: avoirs.items.length },
    fidelite: { points: points.solde, valeurEnFC: points.valeurEnFC },
    cartesCadeaux: { solde: cartes.soldeTotal, nombre: cartes.cartes.length },
    historique,
  };
}
