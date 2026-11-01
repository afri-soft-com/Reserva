import { prisma } from "../../config/prisma";
import { ErreurValidation, ErreurNonTrouve, ErreurInterdit, ErreurConflit } from "../../utils/erreurs";
import { obtenirConfigTarif } from "../economie/economie.service";

async function paramsFidelite() {
  const c = await obtenirConfigTarif();
  return {
    valeurPointCdf: c.valeurPointCdf,
    trancheCdf: c.pointsTrancheCdf,
  };
}

export async function obtenirSoldePoints(utilisateurId: string) {
  const { valeurPointCdf } = await paramsFidelite();
  const gains = await prisma.pointTransaction.aggregate({
    where: { utilisateurId, type: "GAIN" },
    _sum: { montantPoints: true },
  });
  const depenses = await prisma.pointTransaction.aggregate({
    where: { utilisateurId, type: "DEPENSE" },
    _sum: { montantPoints: true },
  });
  const solde = (gains._sum.montantPoints ?? 0) - (depenses._sum.montantPoints ?? 0);
  return { solde, valeurEnFC: solde * valeurPointCdf, valeurPointCdf };
}

export async function listerTransactionsPoints(utilisateurId: string, page = 1, parPage = 20) {
  const skip = (page - 1) * parPage;
  const [items, total] = await Promise.all([
    prisma.pointTransaction.findMany({
      where: { utilisateurId },
      orderBy: { creeLe: "desc" },
      skip,
      take: parPage,
    }),
    prisma.pointTransaction.count({ where: { utilisateurId } }),
  ]);
  return { items, total, page, parPage, totalPages: Math.ceil(total / parPage) };
}

export async function ajouterPointsGain(utilisateurId: string, montantPaye: number, reservationId: string) {
  const { trancheCdf } = await paramsFidelite();
  const pointsGagnes = Math.floor(montantPaye / trancheCdf);
  if (pointsGagnes <= 0) return null;

  const solde = await obtenirSoldePoints(utilisateurId);
  const nouveauSolde = solde.solde + pointsGagnes;

  return prisma.pointTransaction.create({
    data: {
      utilisateurId,
      type: "GAIN",
      montantPoints: pointsGagnes,
      soldeApres: nouveauSolde,
      reservationId,
      description: `Points gagnés pour paiement réservation`,
    },
  });
}

export async function deduirePoints(utilisateurId: string, pointsDepenses: number, reservationId: string) {
  const solde = await obtenirSoldePoints(utilisateurId);
  if (solde.solde < pointsDepenses) {
    throw new Error("Solde de points insuffisant");
  }

  const nouveauSolde = solde.solde - pointsDepenses;

  return prisma.pointTransaction.create({
    data: {
      utilisateurId,
      type: "DEPENSE",
      montantPoints: pointsDepenses,
      soldeApres: nouveauSolde,
      reservationId,
      description: `Points utilisés pour la réservation`,
    },
  });
}

export async function estimerReduction(points: number) {
  const { valeurPointCdf } = await paramsFidelite();
  return { points, reductionFC: points * valeurPointCdf, valeurPointCdf };
}

/**
 * [CLIENT] Échange des points de fidélité contre une réduction sur une réservation.
 */
export async function appliquerPoints(utilisateurId: string, reservationId: string, points: number) {
  const { valeurPointCdf } = await paramsFidelite();
  const solde = await obtenirSoldePoints(utilisateurId);
  if (solde.solde < points) {
    throw new ErreurValidation("Solde de points insuffisant");
  }

  const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
  if (!reservation) {
    throw new ErreurNonTrouve("Réservation introuvable");
  }
  if (reservation.clientId !== utilisateurId) {
    throw new ErreurInterdit("Cette réservation ne vous appartient pas");
  }
  if (reservation.statut !== "EN_ATTENTE" && reservation.statut !== "CONFIRMEE") {
    throw new ErreurValidation("Impossible d'appliquer des points sur cette réservation");
  }

  const reduction = points * valeurPointCdf;
  const soldeRestant = reservation.montantTotal - reservation.montantPaye;
  if (reduction > soldeRestant + 0.001) {
    throw new ErreurValidation("La réduction dépasse le solde restant de la réservation");
  }
  const nouveauTotal = Math.max(reservation.montantPaye, reservation.montantTotal - reduction);

  const resultat = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM "utilisateurs" WHERE id = ${utilisateurId} FOR UPDATE`;
    const frais = await tx.pointTransaction.aggregate({
      where: { utilisateurId, type: "GAIN" },
      _sum: { montantPoints: true },
    });
    const depenses = await tx.pointTransaction.aggregate({
      where: { utilisateurId, type: "DEPENSE" },
      _sum: { montantPoints: true },
    });
    const soldeActuel = (frais._sum.montantPoints ?? 0) - (depenses._sum.montantPoints ?? 0);
    if (soldeActuel < points) throw new ErreurValidation("Solde de points insuffisant");

    const maj = await tx.reservation.updateMany({
      where: {
        id: reservationId,
        clientId: utilisateurId,
        montantTotal: reservation.montantTotal,
        statut: { in: ["EN_ATTENTE", "CONFIRMEE"] },
      },
      data: {
        montantReduction: { increment: reduction },
        montantTotal: nouveauTotal,
        pointsUtilises: { increment: points },
      },
    });
    if (maj.count === 0) throw new ErreurConflit("La réservation a changé. Réessayez.");

    await tx.pointTransaction.create({
      data: {
        utilisateurId,
        type: "DEPENSE",
        montantPoints: points,
        soldeApres: soldeActuel - points,
        reservationId,
        description: `Points échangés contre une réduction de ${reduction} FC`,
      },
    });
    await tx.notification.create({
      data: {
        utilisateurId,
        reservationId,
        titre: "Points utilisés",
        message: `Vous avez échangé ${points} points contre ${reduction} FC de réduction sur la réservation ${reservation.numero}.`,
        type: "PAIEMENT",
      },
    });
    return { nouveauSolde: soldeActuel - points };
  });

  return { points, reduction, montantFinal: nouveauTotal, nouveauSolde: resultat.nouveauSolde };
}
