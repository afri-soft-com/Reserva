import { prisma } from "../../config/prisma";
import { ErreurNonTrouve, ErreurValidation, ErreurInterdit, ErreurConflit } from "../../utils/erreurs";
import { genererNumeroReservation } from "@reserva/shared";

/**
 * [CLIENT] Inscrit l'utilisateur en file d'attente sur un créneau complet.
 * Dès qu'une place se libère, la première personne en attente est notifiée (voire réservée automatiquement).
 */
export async function inscrireEnAttente(utilisateurId: string, serviceId: string, creneauId: string) {
  const creneau = await prisma.creneau.findUnique({
    where: { id: creneauId },
    include: { service: true },
  });
  if (!creneau) {
    throw new ErreurNonTrouve("Créneau introuvable");
  }
  if (creneau.serviceId !== serviceId) {
    throw new ErreurValidation("Le créneau ne correspond pas au service indiqué");
  }
  if (creneau.debut < new Date()) {
    throw new ErreurValidation("Ce créneau est déjà passé");
  }
  if (creneau.capaciteReservee < creneau.capaciteTotale) {
    throw new ErreurValidation("Ce créneau est encore disponible. Vous pouvez réserver directement.");
  }

  const dejaInscrit = await prisma.listeAttente.findFirst({
    where: { clientId: utilisateurId, creneauId, statut: { in: ["EN_ATTENTE", "NOTIFIE"] } },
  });
  if (dejaInscrit) {
    throw new ErreurValidation("Vous êtes déjà inscrit sur la liste d'attente de ce créneau");
  }

  const nbAttente = await prisma.listeAttente.count({
    where: { creneauId, statut: { in: ["EN_ATTENTE", "NOTIFIE"] } },
  });

  const entree = await prisma.listeAttente.create({
    data: {
      clientId: utilisateurId,
      serviceId,
      creneauId,
      statut: "EN_ATTENTE",
    },
    include: { creneau: true, service: true },
  });

  await prisma.notification.create({
    data: {
      utilisateurId,
      titre: "Inscrit en file d'attente",
      message: `Vous êtes numéro ${nbAttente + 1} sur la liste d'attente du créneau du ${creneau.debut.toLocaleString("fr-FR")}.`,
      type: "RAPPEL",
    },
  });

  return { ...entree, position: nbAttente + 1 };
}

export async function listerMesAttentes(utilisateurId: string) {
  return prisma.listeAttente.findMany({
    where: { clientId: utilisateurId, statut: { in: ["EN_ATTENTE", "NOTIFIE"] } },
    include: {
      service: { select: { id: true, nom: true, prix: true, devise: true, prestataire: { select: { nomEntreprise: true } } } },
      creneau: true,
    },
    orderBy: { creeLe: "desc" },
  });
}

export async function quitterAttente(utilisateurId: string, entreeId: string) {
  const entree = await prisma.listeAttente.findUnique({ where: { id: entreeId } });
  if (!entree) {
    throw new ErreurNonTrouve("Inscription introuvable");
  }
  if (entree.clientId !== utilisateurId) {
    throw new ErreurInterdit("Vous ne pouvez gérer que vos propres inscriptions");
  }
  return prisma.listeAttente.update({ where: { id: entreeId }, data: { statut: "RETIRE" } });
}

/** [PRESTATAIRE] Liste la file d'attente d'un créneau */
export async function listerAttenteCreneau(utilisateurId: string, creneauId: string) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) {
    throw new ErreurNonTrouve("Profil prestataire non trouvé");
  }
  const creneau = await prisma.creneau.findUnique({
    where: { id: creneauId },
    include: { service: { select: { prestataireId: true } } },
  });
  if (!creneau || creneau.service.prestataireId !== prestataire.id) {
    throw new ErreurInterdit("Ce créneau ne vous appartient pas");
  }
  return prisma.listeAttente.findMany({
    where: { creneauId, statut: { in: ["EN_ATTENTE", "NOTIFIE"] } },
    include: { client: { select: { nom: true, telephone: true } } },
    orderBy: { creeLe: "asc" },
  });
}

/**
 * Interne : appelé quand une place se libère sur un créneau.
 * Réserve automatiquement la première personne en attente, sinon la notifie.
 */
export async function promouvoirCreneau(serviceId: string, creneauId: string) {
  const suivant = await prisma.listeAttente.findFirst({
    where: { creneauId, statut: "EN_ATTENTE" },
    include: { service: { include: { prestataire: true } } },
    orderBy: { creeLe: "asc" },
  });
  if (!suivant) return { promu: false };

  const creneauActuel = await prisma.creneau.findUnique({ where: { id: creneauId } });
  if (!creneauActuel) return { promu: false };

  const placeLibre = creneauActuel.capaciteReservee < creneauActuel.capaciteTotale;
  if (!placeLibre || creneauActuel.debut < new Date()) {
    await prisma.listeAttente.update({ where: { id: suivant.id }, data: { statut: "NOTIFIE" } });
    await prisma.notification.create({
      data: {
        utilisateurId: suivant.clientId,
        titre: "Place disponible !",
        message: `Un créneau s'est libéré pour « ${suivant.service.nom} ». Réservez vite !`,
        type: "RAPPEL",
      },
    });
    return { promu: false, notifie: true };
  }

  const reservation = await prisma.$transaction(async (tx) => {
    const actuel = await tx.creneau.findUnique({ where: { id: creneauId } });
    if (!actuel || actuel.capaciteReservee >= actuel.capaciteTotale) {
      throw new ErreurConflit("La place vient d'être prise");
    }
    await tx.creneau.update({ where: { id: creneauId }, data: { capaciteReservee: { increment: 1 } } });
    const rsv = await tx.reservation.create({
      data: {
        numero: genererNumeroReservation(),
        clientId: suivant.clientId,
        prestataireId: suivant.service.prestataireId,
        serviceId,
        creneauId,
        statut: "EN_ATTENTE",
        statutPaiement: "EN_ATTENTE",
        montantTotal: suivant.service.prix,
        devise: suivant.service.devise,
        notes: "[File d'attente] Réservation automatique",
      },
    });
    await tx.listeAttente.update({ where: { id: suivant.id }, data: { statut: "RESERVE" } });
    return rsv;
  });

  await prisma.notification.create({
    data: {
      utilisateurId: suivant.clientId,
      reservationId: reservation.id,
      titre: "Votre place est réservée !",
      message: `Une place s'est libérée pour « ${suivant.service.nom} ». Réservation ${reservation.numero} créée automatiquement.`,
      type: "CONFIRMATION",
    },
  });

  return { promu: true, reservation };
}
