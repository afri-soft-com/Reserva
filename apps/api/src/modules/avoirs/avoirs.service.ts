import { prisma } from "../../config/prisma";
import { ErreurNonTrouve, ErreurValidation, ErreurInterdit } from "../../utils/erreurs";

/** Crée un avoir (crédit en magasin) crédité à un utilisateur, typiquement lors d'une annulation */
export async function creerAvoir(donnees: {
  utilisateurId: string;
  montant: number;
  devise: string;
  sourceReservationId?: string;
}) {
  if (donnees.montant <= 0) return null;

  const existant = donnees.sourceReservationId
    ? await prisma.avoir.findFirst({ where: { sourceReservationId: donnees.sourceReservationId } })
    : null;
  if (existant) return existant;

  const dateExpiration = new Date();
  dateExpiration.setMonth(dateExpiration.getMonth() + 12);

  return prisma.avoir.create({
    data: {
      utilisateurId: donnees.utilisateurId,
      montantInitial: donnees.montant,
      montantRestant: donnees.montant,
      devise: donnees.devise,
      sourceReservationId: donnees.sourceReservationId,
      dateExpiration,
    },
  });
}

/** Liste les avoirs (actifs et historisés) d'un utilisateur */
export async function listerMesAvoirs(utilisateurId: string) {
  const items = await prisma.avoir.findMany({
    where: { utilisateurId },
    orderBy: { creeLe: "desc" },
  });
  const soldeActif = items
    .filter((a) => a.statut === "ACTIF" && a.montantRestant > 0 && (!a.dateExpiration || a.dateExpiration > new Date()))
    .reduce((somme, a) => somme + a.montantRestant, 0);
  return { soldeActif, devise: items[0]?.devise ?? "CDF", items };
}

/**
 * [CLIENT] Applique un avoir (ou le solde d'avoirs le plus ancien) sur une réservation.
 * Réduit le montant total à payer du montant de l'avoir consommé.
 */
export async function appliquerAvoir(utilisateurId: string, reservationId: string, montant?: number) {
  const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
  if (!reservation) {
    throw new ErreurNonTrouve("Réservation introuvable");
  }
  if (reservation.clientId !== utilisateurId) {
    throw new ErreurInterdit("Cette réservation ne vous appartient pas");
  }
  if (reservation.statut !== "EN_ATTENTE" && reservation.statut !== "CONFIRMEE") {
    throw new ErreurValidation("Impossible d'appliquer un avoir sur cette réservation");
  }

  const avoirsActifs = await prisma.avoir.findMany({
    where: {
      utilisateurId,
      statut: "ACTIF",
      montantRestant: { gt: 0 },
      OR: [{ dateExpiration: null }, { dateExpiration: { gt: new Date() } }],
    },
    orderBy: { creeLe: "asc" },
  });

  if (avoirsActifs.length === 0) {
    throw new ErreurValidation("Aucun avoir disponible");
  }

  const montantBase = reservation.montantTotal + reservation.montantReduction;
  const montantAPrelever = Math.min(montant ?? avoirsActifs.reduce((s, a) => s + a.montantRestant, 0), montantBase);
  if (montantAPrelever <= 0) {
    throw new ErreurValidation("Le montant à appliquer doit être positif");
  }

  let restantAPrelever = montantAPrelever;
  await prisma.$transaction(async (tx) => {
    for (const avoir of avoirsActifs) {
      if (restantAPrelever <= 0) break;
      const part = Math.min(avoir.montantRestant, restantAPrelever);
      restantAPrelever -= part;
      const nouveauRestant = avoir.montantRestant - part;
      await tx.avoir.update({
        where: { id: avoir.id },
        data: {
          montantRestant: nouveauRestant,
          statut: nouveauRestant <= 0 ? "UTILISE" : "ACTIF",
        },
      });
    }

    await tx.reservation.update({
      where: { id: reservationId },
      data: {
        montantReduction: { increment: montantAPrelever },
        montantTotal: montantBase - montantAPrelever,
        avoirUtilise: { increment: montantAPrelever },
      },
    });
  });

  await prisma.notification.create({
    data: {
      utilisateurId,
      reservationId,
      titre: "Avoir appliqué",
      message: `${montantAPrelever} ${reservation.devise} de crédit ont été appliqués sur la réservation ${reservation.numero}.`,
      type: "PAIEMENT",
    },
  });

  return { montantApplique: montantAPrelever, montantFinal: montantBase - montantAPrelever };
}
