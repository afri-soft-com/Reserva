import { prisma } from "../../config/prisma";
import { ErreurNonTrouve, ErreurInterdit, ErreurValidation } from "../../utils/erreurs";

/**
 * [CLIENT] S'abonne aux alertes de disponibilité d'un service.
 * L'utilisateur sera notifié dès qu'un créneau se libère.
 */
export async function creerAlerte(utilisateurId: string, serviceId: string) {
  const service = await prisma.serviceOffert.findUnique({ where: { id: serviceId } });
  if (!service) {
    throw new ErreurNonTrouve("Service introuvable");
  }
  if (!service.actif) {
    throw new ErreurValidation("Ce service n'est plus disponible");
  }

  const existante = await prisma.alerteDisponibilite.findUnique({
    where: { utilisateurId_serviceId: { utilisateurId, serviceId } },
  });
  if (existante) {
    return prisma.alerteDisponibilite.update({ where: { id: existante.id }, data: { actif: true } });
  }

  return prisma.alerteDisponibilite.create({
    data: { utilisateurId, serviceId },
  });
}

export async function listerMesAlertes(utilisateurId: string) {
  return prisma.alerteDisponibilite.findMany({
    where: { utilisateurId, actif: true },
    include: { service: { select: { id: true, nom: true, prix: true, devise: true, prestataire: { select: { nomEntreprise: true } } } } },
    orderBy: { creeLe: "desc" },
  });
}

export async function desactiverAlerte(utilisateurId: string, alerteId: string) {
  const alerte = await prisma.alerteDisponibilite.findUnique({ where: { id: alerteId } });
  if (!alerte) {
    throw new ErreurNonTrouve("Alerte introuvable");
  }
  if (alerte.utilisateurId !== utilisateurId) {
    throw new ErreurInterdit("Vous ne pouvez pas gérer cette alerte");
  }
  return prisma.alerteDisponibilite.update({ where: { id: alerteId }, data: { actif: false } });
}

/** Interne : notifie les abonnés d'un service qu'un créneau s'est libéré */
export async function notifierAlertesService(serviceId: string, creneauId?: string) {
  // Ne notifie que s'il reste réellement des places disponibles dans le futur
  const creneauxLibres = await prisma.creneau.count({
    where: {
      serviceId,
      debut: { gt: new Date() },
      capaciteReservee: { lt: prisma.creneau.fields.capaciteTotale },
    },
  });
  if (creneauxLibres === 0) return { notifiees: 0 };

  // Exclut les utilisateurs déjà en file d'attente sur le créneau libéré
  // (ils sont gérés par la promotion automatique / notifiés séparément)
  const dejaEnAttente = creneauId
    ? await prisma.listeAttente.findMany({
        where: { creneauId, statut: { in: ["EN_ATTENTE", "NOTIFIE"] } },
        select: { clientId: true },
      })
    : [];
  const idsEnAttente = new Set(dejaEnAttente.map((e) => e.clientId));

  const alertes = await prisma.alerteDisponibilite.findMany({
    where: {
      serviceId,
      actif: true,
      utilisateurId: { notIn: Array.from(idsEnAttente) },
    },
    include: { service: { select: { nom: true } } },
  });
  if (alertes.length === 0) return { notifiees: 0 };

  const messages = alertes.map((a) =>
    prisma.notification.create({
      data: {
        utilisateurId: a.utilisateurId,
        titre: "Disponibilité !",
        message: `Un créneau vient de se libérer pour « ${a.service.nom} ». Réservez rapidement !`,
        type: "RAPPEL",
      },
    })
  );
  await prisma.$transaction(messages);
  return { notifiees: alertes.length };
}
