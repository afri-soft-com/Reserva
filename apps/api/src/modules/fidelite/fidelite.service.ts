import { prisma } from "../../config/prisma";

const POINTS_PAR_TRANCHE = 1000;
const POINTS_PAR_TRANCHE_VALEUR = 1;
const VALEUR_POINT_FC = 50;

export async function obtenirSoldePoints(utilisateurId: string) {
  const gains = await prisma.pointTransaction.aggregate({
    where: { utilisateurId, type: "GAIN" },
    _sum: { montantPoints: true },
  });
  const depenses = await prisma.pointTransaction.aggregate({
    where: { utilisateurId, type: "DEPENSE" },
    _sum: { montantPoints: true },
  });
  const solde = (gains._sum.montantPoints ?? 0) - (depenses._sum.montantPoints ?? 0);
  return { solde, valeurEnFC: solde * VALEUR_POINT_FC };
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
  const pointsGagnes = Math.floor(montantPaye / POINTS_PAR_TRANCHE) * POINTS_PAR_TRANCHE_VALEUR;
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
  return { points, reductionFC: points * VALEUR_POINT_FC };
}
