import { prisma } from "../../config/prisma";
import { ErreurNonTrouve, ErreurInterdit } from "../../utils/erreurs";

/** Liste les notifications de l'utilisateur connecté, les plus récentes en premier */
export async function listerNotifications(utilisateurId: string, nonLuesUniquement = false) {
  return prisma.notification.findMany({
    where: { utilisateurId, ...(nonLuesUniquement ? { lu: false } : {}) },
    orderBy: { creeLe: "desc" },
    take: 100,
  });
}

/** Compte les notifications non lues — utilisé pour le badge de l'application */
export async function compterNonLues(utilisateurId: string) {
  const total = await prisma.notification.count({ where: { utilisateurId, lu: false } });
  return { total };
}

/** Marque une notification comme lue */
export async function marquerLue(utilisateurId: string, notificationId: string) {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification) {
    throw new ErreurNonTrouve("Notification non trouvée");
  }
  if (notification.utilisateurId !== utilisateurId) {
    throw new ErreurInterdit("Accès refusé à cette notification");
  }
  return prisma.notification.update({ where: { id: notificationId }, data: { lu: true } });
}

/** Marque toutes les notifications de l'utilisateur comme lues */
export async function marquerToutesLues(utilisateurId: string) {
  const resultat = await prisma.notification.updateMany({
    where: { utilisateurId, lu: false },
    data: { lu: true },
  });
  return { nombreMisesAJour: resultat.count };
}

/**
 * Tâche planifiée : envoie les rappels SMS pour les réservations confirmées dans les
 * prochaines 24h et 1h. Conçu pour être appelé par un cron job (voir docs/cron.md).
 */
export async function envoyerRappelsAutomatiques() {
  const { envoyerRappelReservation } = await import("../notifications/sms.adapter");

  const maintenant = new Date();
  const dans24h = new Date(maintenant.getTime() + 24 * 60 * 60 * 1000);
  const dans1h = new Date(maintenant.getTime() + 60 * 60 * 1000);
  const fenetreToleranceMs = 5 * 60 * 1000; // fenêtre de 5 min pour matcher l'exécution du cron

  const reservationsA24h = await prisma.reservation.findMany({
    where: {
      statut: "CONFIRMEE",
      creneau: { debut: { gte: new Date(dans24h.getTime() - fenetreToleranceMs), lte: new Date(dans24h.getTime() + fenetreToleranceMs) } },
    },
    include: { client: true, prestataire: true, creneau: true },
  });

  const reservationsA1h = await prisma.reservation.findMany({
    where: {
      statut: "CONFIRMEE",
      creneau: { debut: { gte: new Date(dans1h.getTime() - fenetreToleranceMs), lte: new Date(dans1h.getTime() + fenetreToleranceMs) } },
    },
    include: { client: true, prestataire: true, creneau: true },
  });

  let envoyes = 0;
  for (const reservation of [...reservationsA24h, ...reservationsA1h]) {
    await envoyerRappelReservation({
      telephone: reservation.client.telephone,
      numeroReservation: reservation.numero,
      nomPrestataire: reservation.prestataire.nomEntreprise,
      dateHeure: reservation.creneau.debut.toLocaleString("fr-FR"),
    });
    await prisma.notification.create({
      data: {
        utilisateurId: reservation.clientId,
        reservationId: reservation.id,
        titre: "Rappel de rendez-vous",
        message: `N'oubliez pas votre rendez-vous chez ${reservation.prestataire.nomEntreprise} (réf. ${reservation.numero})`,
        type: "RAPPEL",
      },
    });
    envoyes++;
  }

  return { rappelsEnvoyes: envoyes };
}
