import { prisma } from "../../config/prisma";
import { ErreurNonTrouve, ErreurValidation, ErreurConflit, ErreurInterdit } from "../../utils/erreurs";
import {
  CreerReservationInput,
  AnnulerReservationInput,
  genererNumeroReservation,
  heuresEntre,
  calculerRemboursement,
} from "@reserva/shared";
import { envoyerConfirmationReservation, envoyerNotificationAnnulation } from "../notifications/sms.adapter";
import { rembourserMobileMoney } from "../paiements/mobilemoney.adapter";
import { OperateurMobileMoney } from "@reserva/shared";
import { creerAvoir } from "../avoirs/avoirs.service";
import { promouvoirCreneau } from "../attentes/attentes.service";
import { notifierAlertesService } from "../alertes/alertes.service";

/**
 * Crée une réservation. Utilise une transaction Prisma avec verrouillage pour éviter
 * la surréservation en cas de requêtes concurrentes sur le même créneau.
 */
export async function creerReservation(clientId: string, input: CreerReservationInput) {
  const creneau = await prisma.creneau.findUnique({
    where: { id: input.creneauId },
    include: { service: { include: { prestataire: true } } },
  });

  if (!creneau) {
    throw new ErreurNonTrouve("Créneau non trouvé");
  }
  if (creneau.serviceId !== input.serviceId) {
    throw new ErreurValidation("Le créneau ne correspond pas au service indiqué");
  }
  if (creneau.debut < new Date()) {
    throw new ErreurValidation("Ce créneau est déjà passé");
  }
  if (!creneau.service.actif) {
    throw new ErreurValidation("Ce service n'est plus disponible");
  }

  // Transaction atomique : vérifie la capacité ET incrémente en une seule opération,
  // afin d'empêcher deux clients de prendre la dernière place simultanément.
  const reservation = await prisma.$transaction(async (tx) => {
    const creneauActuel = await tx.creneau.findUnique({ where: { id: input.creneauId } });
    if (!creneauActuel || creneauActuel.capaciteReservee >= creneauActuel.capaciteTotale) {
      throw new ErreurConflit("Ce créneau vient d'être complet. Veuillez choisir un autre horaire.");
    }

    await tx.creneau.update({
      where: { id: input.creneauId },
      data: { capaciteReservee: { increment: 1 } },
    });

    return tx.reservation.create({
      data: {
        numero: genererNumeroReservation(),
        clientId,
        prestataireId: creneau.service.prestataireId,
        serviceId: input.serviceId,
        creneauId: input.creneauId,
        statut: "EN_ATTENTE",
        statutPaiement: "EN_ATTENTE",
        montantTotal: creneau.service.prix,
        devise: creneau.service.devise,
        notes: input.notes,
        reservePourTiers: input.reservePourTiers,
        nomTiers: input.nomTiers,
        telephoneTiers: input.telephoneTiers,
      },
      include: {
        service: true,
        prestataire: true,
        creneau: true,
      },
    });
  });

  await creerNotification({
    utilisateurId: clientId,
    reservationId: reservation.id,
    titre: "Réservation créée",
    message: `Votre réservation ${reservation.numero} chez ${reservation.prestataire.nomEntreprise} est en attente de confirmation.`,
    type: "CONFIRMATION",
  });

  return reservation;
}

/** Modifie une réservation : change le créneau (si annulation gratuite ou dans délai) */
export async function modifierReservation(utilisateurId: string, input: { reservationId: string; nouveauCreneauId: string }) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: input.reservationId },
    include: { prestataire: true, creneau: true, service: true },
  });

  if (!reservation) {
    throw new ErreurNonTrouve("Réservation non trouvée");
  }
  if (reservation.clientId !== utilisateurId) {
    throw new ErreurInterdit("Vous ne pouvez modifier que vos propres réservations");
  }
  if (!["EN_ATTENTE", "CONFIRMEE"].includes(reservation.statut)) {
    throw new ErreurValidation("Cette réservation ne peut plus être modifiée");
  }

  const nouveauCreneau = await prisma.creneau.findUnique({
    where: { id: input.nouveauCreneauId },
    include: { service: true },
  });

  if (!nouveauCreneau) {
    throw new ErreurNonTrouve("Nouveau créneau non trouvé");
  }
  if (nouveauCreneau.serviceId !== reservation.serviceId) {
    throw new ErreurValidation("Le nouveau créneau doit correspondre au même service");
  }
  if (nouveauCreneau.debut < new Date()) {
    throw new ErreurValidation("Le nouveau créneau est déjà passé");
  }
  if (nouveauCreneau.capaciteReservee >= nouveauCreneau.capaciteTotale) {
    throw new ErreurConflit("Ce créneau est complet. Veuillez en choisir un autre.");
  }

  const heuresAvantCreneau = heuresEntre(new Date(), reservation.creneau.debut);
  if (heuresAvantCreneau < 1) {
    throw new ErreurValidation("Impossible de modifier une réservation moins d'1 heure avant le créneau");
  }

  const resultat = await prisma.$transaction(async (tx) => {
    await tx.creneau.update({
      where: { id: reservation.creneauId },
      data: { capaciteReservee: { decrement: 1 } },
    });

    await tx.creneau.update({
      where: { id: input.nouveauCreneauId },
      data: { capaciteReservee: { increment: 1 } },
    });

    return tx.reservation.update({
      where: { id: input.reservationId },
      data: { creneauId: input.nouveauCreneauId, statut: "EN_ATTENTE" },
      include: { service: true, prestataire: true, creneau: true, client: true },
    });
  });

  await creerNotification({
    utilisateurId: reservation.clientId,
    reservationId: reservation.id,
    titre: "Réservation modifiée",
    message: `Votre créneau a été changé. Nouvel horaire : ${resultat.creneau.debut.toLocaleString("fr-FR")}`,
    type: "CONFIRMATION",
  });

  return resultat;
}

/** [PRESTATAIRE] Confirme ou refuse une réservation en attente */
export async function repondreReservation(utilisateurId: string, reservationId: string, accepter: boolean) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) {
    throw new ErreurNonTrouve("Profil prestataire non trouvé");
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { client: true, prestataire: true, creneau: true, service: true },
  });
  if (!reservation || reservation.prestataireId !== prestataire.id) {
    throw new ErreurNonTrouve("Réservation non trouvée");
  }
  if (reservation.statut !== "EN_ATTENTE") {
    throw new ErreurValidation("Cette réservation a déjà été traitée");
  }

  if (!accepter) {
    // Refus : libère la capacité du créneau
    await prisma.$transaction([
      prisma.reservation.update({ where: { id: reservationId }, data: { statut: "REFUSEE" } }),
      prisma.creneau.update({ where: { id: reservation.creneauId }, data: { capaciteReservee: { decrement: 1 } } }),
    ]);

    promouvoirCreneau(reservation.serviceId, reservation.creneauId).catch(() => {});
    notifierAlertesService(reservation.serviceId, reservation.creneauId).catch(() => {});

    await creerNotification({
      utilisateurId: reservation.clientId,
      reservationId: reservation.id,
      titre: "Réservation refusée",
      message: `Votre réservation ${reservation.numero} n'a pas pu être confirmée par ${reservation.prestataire.nomEntreprise}.`,
      type: "ANNULATION",
    });

    return prisma.reservation.findUnique({ where: { id: reservationId } });
  }

  const reservationConfirmee = await prisma.reservation.update({
    where: { id: reservationId },
    data: { statut: "CONFIRMEE" },
  });

  await envoyerConfirmationReservation({
    telephone: reservation.client.telephone,
    numeroReservation: reservation.numero,
    nomPrestataire: reservation.prestataire.nomEntreprise,
    dateHeure: reservation.creneau.debut.toLocaleString("fr-FR"),
  });

  await creerNotification({
    utilisateurId: reservation.clientId,
    reservationId: reservation.id,
    titre: "Réservation confirmée",
    message: `Votre réservation ${reservation.numero} chez ${reservation.prestataire.nomEntreprise} est confirmée !`,
    type: "CONFIRMATION",
  });

  return reservationConfirmee;
}

/** Annule une réservation — applique la politique d'annulation du prestataire et déclenche le remboursement si éligible */
export async function annulerReservation(utilisateurId: string, input: AnnulerReservationInput) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: input.reservationId },
    include: { prestataire: true, creneau: true, client: true, transactions: true },
  });

  if (!reservation) {
    throw new ErreurNonTrouve("Réservation non trouvée");
  }
  if (reservation.clientId !== utilisateurId) {
    throw new ErreurInterdit("Vous ne pouvez annuler que vos propres réservations");
  }
  if (["ANNULEE", "TERMINEE", "REFUSEE"].includes(reservation.statut)) {
    throw new ErreurValidation("Cette réservation ne peut plus être annulée");
  }

  const heuresAvantCreneau = heuresEntre(new Date(), reservation.creneau.debut);
  let montantRembourse = 0;

  if (reservation.montantPaye > 0) {
    montantRembourse = calculerRemboursement({
      montantPaye: reservation.montantPaye,
      heuresAvantCreneau,
      delaiAnnulationGratuiteHeures: reservation.prestataire.delaiAnnulationGratuiteHeures,
      fraisAnnulationTardivePourcent: reservation.prestataire.fraisAnnulationTardivePourcent,
    });
  }

  await prisma.$transaction([
    prisma.reservation.update({
      where: { id: input.reservationId },
      data: {
        statut: "ANNULEE",
        motifAnnulation: input.motif,
        statutPaiement: montantRembourse > 0 ? "REMBOURSE" : reservation.statutPaiement,
      },
    }),
    prisma.creneau.update({
      where: { id: reservation.creneauId },
      data: { capaciteReservee: { decrement: 1 } },
    }),
  ]);

  // Une place se libère : on informe les abonnés à l'alerte dispo et on promeut la file d'attente
  promouvoirCreneau(reservation.serviceId, reservation.creneauId).catch(() => {});
  notifierAlertesService(reservation.serviceId, reservation.creneauId).catch(() => {});

  let rembourseParAvoir = false;
  if (montantRembourse > 0) {
    if (input.modeRemboursement === "AVOIR") {
      const avoir = await creerAvoir({
        utilisateurId: reservation.clientId,
        montant: montantRembourse,
        devise: reservation.devise,
        sourceReservationId: reservation.id,
      });
      rembourseParAvoir = !!avoir;
    } else {
      const derniereTransactionReussie = reservation.transactions.find((t) => t.statut === "PAYE");
      if (derniereTransactionReussie) {
        await rembourserMobileMoney({
          operateur: derniereTransactionReussie.operateur as OperateurMobileMoney,
          telephonePaiement: derniereTransactionReussie.telephonePaiement ?? reservation.client.telephone,
          montant: montantRembourse,
        });
      }
    }
  }

  await envoyerNotificationAnnulation({
    telephone: reservation.client.telephone,
    numeroReservation: reservation.numero,
    montantRembourse: montantRembourse > 0 ? montantRembourse : undefined,
  });

  await creerNotification({
    utilisateurId: reservation.clientId,
    reservationId: reservation.id,
    titre: "Réservation annulée",
    message: montantRembourse > 0
      ? (rembourseParAvoir
          ? `Votre réservation ${reservation.numero} a été annulée. Un avoir de ${montantRembourse} ${reservation.devise} a été crédité sur votre compte.`
          : `Votre réservation ${reservation.numero} a été annulée. Remboursement de ${montantRembourse} ${reservation.devise} en cours.`)
      : `Votre réservation ${reservation.numero} a été annulée.`,
    type: "ANNULATION",
  });

  return { annule: true, montantRembourse, rembourseParAvoir };
}

/** Liste les réservations du client connecté */
export async function listerMesReservations(clientId: string, statut?: string) {
  return prisma.reservation.findMany({
    where: { clientId, ...(statut ? { statut: statut as any } : {}) },
    include: { prestataire: true, service: true, creneau: true, avis: true },
    orderBy: { creneau: { debut: "desc" } },
  });
}

/** Récupère le détail d'une réservation (vérifie que le demandeur y a accès) */
export async function obtenirDetailReservation(utilisateurId: string, reservationId: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      prestataire: { include: { utilisateur: { select: { id: true } } } },
      service: true,
      creneau: true,
      transactions: true,
      avis: true,
      client: { select: { nom: true, telephone: true } },
    },
  });

  if (!reservation) {
    throw new ErreurNonTrouve("Réservation non trouvée");
  }

  const estClient = reservation.clientId === utilisateurId;
  const estPrestataire = reservation.prestataire.utilisateur.id === utilisateurId;

  if (!estClient && !estPrestataire) {
    throw new ErreurInterdit("Vous n'avez pas accès à cette réservation");
  }

  return reservation;
}

/** [PRESTATAIRE] Liste les réservations reçues, avec filtres optionnels */
export async function listerReservationsPrestataire(utilisateurId: string, statut?: string) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) {
    throw new ErreurNonTrouve("Profil prestataire non trouvé");
  }

  return prisma.reservation.findMany({
    where: { prestataireId: prestataire.id, ...(statut ? { statut: statut as any } : {}) },
    include: { client: { select: { nom: true, telephone: true } }, service: true, creneau: true },
    orderBy: { creneau: { debut: "asc" } },
  });
}

/** Marque une réservation passée comme terminée ou comme absence (no-show) — appelé par le prestataire */
export async function marquerStatutFinal(utilisateurId: string, reservationId: string, statut: "TERMINEE" | "ABSENCE") {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) {
    throw new ErreurNonTrouve("Profil prestataire non trouvé");
  }

  const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
  if (!reservation || reservation.prestataireId !== prestataire.id) {
    throw new ErreurNonTrouve("Réservation non trouvée");
  }
  if (!["CONFIRMEE", "EN_COURS"].includes(reservation.statut)) {
    throw new ErreurValidation("Seule une réservation confirmée (ou en cours) peut être clôturée");
  }

  return prisma.reservation.update({ where: { id: reservationId }, data: { statut } });
}

/**
 * [PRESTATAIRE] Check-in QR : fait passer une réservation confirmée à EN_COURS (le client est arrivé).
 * Le QR contient le numéro de réservation (ex: RSV-XXXXXX).
 */
export async function entamerReservation(utilisateurId: string, reservationId: string) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) {
    throw new ErreurNonTrouve("Profil prestataire non trouvé");
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { creneau: true },
  });
  if (!reservation || reservation.prestataireId !== prestataire.id) {
    throw new ErreurNonTrouve("Réservation non trouvée");
  }
  if (reservation.statut !== "CONFIRMEE") {
    throw new ErreurValidation("Seule une réservation confirmée peut être démarrée");
  }

  const demarree = await prisma.reservation.update({
    where: { id: reservationId },
    data: { statut: "EN_COURS" },
  });

  await creerNotification({
    utilisateurId: reservation.clientId,
    reservationId: reservation.id,
    titre: "Prestation en cours",
    message: `Votre rendez-vous ${reservation.numero} a commencé. Bonne prestation !`,
    type: "CONFIRMATION",
  });

  return demarree;
}

/**
 * Recherche publique par numéro de réservation (utilisé par le prestataire lors du scan QR).
 * N'expose que les informations minimales nécessaires au check-in.
 */
export async function obtenirReservationParNumero(numero: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { numero: numero.toUpperCase().trim() },
    select: {
      id: true,
      numero: true,
      statut: true,
      reservePourTiers: true,
      nomTiers: true,
      telephoneTiers: true,
      client: { select: { nom: true, telephone: true } },
      service: { select: { nom: true } },
      creneau: { select: { debut: true } },
    },
  });

  if (!reservation) {
    throw new ErreurNonTrouve("Aucune réservation ne correspond à ce numéro");
  }

  return reservation;
}

/** Utilitaire interne : crée une notification in-app pour un utilisateur */
async function creerNotification(params: {
  utilisateurId: string;
  reservationId?: string;
  titre: string;
  message: string;
  type: "RAPPEL" | "CONFIRMATION" | "ANNULATION" | "PAIEMENT" | "SYSTEME";
}) {
  return prisma.notification.create({ data: params });
}

/**
 * [CLIENT] Crée une série de réservations récurrentes à partir d'un créneau de référence.
 * Les occurrences suivantes sont recherchées dans les créneaux existants du même service,
 * même jour de semaine et même heure (hebdomadaire). L'ensemble est atomique.
 */
export async function creerReservationsRecurrentes(
  clientId: string,
  input: { serviceId: string; creneauId: string; nombreOccurrences?: number; notes?: string }
) {
  const nombreOccurrences = input.nombreOccurrences ?? 4;
  const creneauBase = await prisma.creneau.findUnique({
    where: { id: input.creneauId },
    include: { service: { include: { prestataire: true } } },
  });

  if (!creneauBase) throw new ErreurNonTrouve("Créneau non trouvé");
  if (creneauBase.serviceId !== input.serviceId) {
    throw new ErreurValidation("Le créneau ne correspond pas au service indiqué");
  }
  if (creneauBase.debut < new Date()) throw new ErreurValidation("Ce créneau est déjà passé");
  if (!creneauBase.service.actif) throw new ErreurValidation("Ce service n'est plus disponible");

  const jourSemaine = creneauBase.debut.getDay();
  const heure = creneauBase.debut.getHours();
  const minute = creneauBase.debut.getMinutes();

  // Occurrences hebdomadaires suivantes : même jour, même heure, dans les créneaux déjà publiés
  const occurrencesFutures = await prisma.creneau.findMany({
    where: {
      serviceId: input.serviceId,
      id: { not: input.creneauId },
      debut: { gte: creneauBase.debut },
    },
    orderBy: { debut: "asc" },
    take: 50,
  });

  const correspondances = occurrencesFutures.filter(
    (c) => c.debut.getDay() === jourSemaine && c.debut.getHours() === heure && c.debut.getMinutes() === minute
  ).slice(0, nombreOccurrences - 1);

  const creneauxAServir = [creneauBase, ...correspondances];
  const recurrenceGroupeId = crypto.randomUUID();

  const reservations = await prisma.$transaction(async (tx) => {
    const resultats = [];
    for (const creneau of creneauxAServir) {
      const actuel = await tx.creneau.findUnique({ where: { id: creneau.id } });
      if (!actuel || actuel.capaciteReservee >= actuel.capaciteTotale) {
        throw new ErreurConflit(`Un des créneaux de la série vient d'être complet. Veuillez réessayer.`);
      }
      await tx.creneau.update({
        where: { id: creneau.id },
        data: { capaciteReservee: { increment: 1 } },
      });
      resultats.push(
        await tx.reservation.create({
          data: {
            numero: genererNumeroReservation(),
            clientId,
            prestataireId: creneauBase.service.prestataireId,
            serviceId: input.serviceId,
            creneauId: creneau.id,
            recurrenceGroupeId,
            statut: "EN_ATTENTE",
            statutPaiement: "EN_ATTENTE",
            montantTotal: creneauBase.service.prix,
            devise: creneauBase.service.devise,
            notes: input.notes ? `[Récurrent] ${input.notes}`.trim() : "[Récurrent]",
          },
          include: { service: true, prestataire: true, creneau: true },
        })
      );
    }
    return resultats;
  });

  for (const reservation of reservations) {
    await prisma.notification.create({
      data: {
        utilisateurId: clientId,
        reservationId: reservation.id,
        titre: "Réservation récurrente créée",
        message: `Votre réservation ${reservation.numero} (série) chez ${reservation.prestataire.nomEntreprise} est en attente de confirmation.`,
        type: "CONFIRMATION",
      },
    });
  }

  return {
    recurrenceGroupeId,
    nombreSouhaitees: nombreOccurrences,
    nombreCreees: reservations.length,
    reservations,
  };
}

/**
 * [CLIENT] Re-réserver « comme la dernière fois ».
 * Reproduit une réservation passée : même service, prochain créneau équivalent.
 * Si la réservation d'origine faisait partie d'une série, la série est reproduite.
 */
export async function reproduireReservation(clientId: string, reservationId: string) {
  const originale = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { service: { include: { prestataire: true } }, creneau: true },
  });

  if (!originale) {
    throw new ErreurNonTrouve("Réservation non trouvée");
  }
  if (originale.clientId !== clientId) {
    throw new ErreurInterdit("Vous ne pouvez reproduire que vos propres réservations");
  }
  if (!originale.service.actif) {
    throw new ErreurValidation("Ce service n'est plus disponible");
  }

  // Série récurrente : reproduit l'ensemble des occurrences
  if (originale.recurrenceGroupeId) {
    const occ = await prisma.reservation.findMany({
      where: { recurrenceGroupeId: originale.recurrenceGroupeId },
      orderBy: { creneau: { debut: "asc" } },
    });
    if (occ.length >= 2) {
      const reference = occ[0].creneauId;
      return creerReservationsRecurrentes(clientId, {
        serviceId: originale.serviceId,
        creneauId: reference,
        nombreOccurrences: Math.min(12, occ.length),
      });
    }
  }

  // Réservation simple : prochain créneau du même service (même créneau de semaine si possible)
  const maintenant = new Date();
  const creneaux = await prisma.creneau.findMany({
    where: {
      serviceId: originale.serviceId,
      debut: { gt: maintenant },
      capaciteReservee: { lt: prisma.creneau.fields.capaciteTotale },
    },
    orderBy: { debut: "asc" },
    take: 30,
  });

  if (creneaux.length === 0) {
    throw new ErreurConflit("Aucun créneau disponible pour ce service pour le moment");
  }

  const jourSemaine = originale.creneau ? new Date(originale.creneau.debut).getDay() : -1;
  const heure = originale.creneau ? new Date(originale.creneau.debut).getHours() : -1;
  const minute = originale.creneau ? new Date(originale.creneau.debut).getMinutes() : -1;

  const equivalent = creneaux.find(
    (c) => c.debut.getDay() === jourSemaine && c.debut.getHours() === heure && c.debut.getMinutes() === minute
  );
  const creneauChoisi = equivalent ?? creneaux[0];

  return creerReservation(clientId, {
    serviceId: originale.serviceId,
    creneauId: creneauChoisi.id,
    notes: originale.notes ? `[Reprise] ${originale.notes}`.trim() : "[Reprise]",
    reservePourTiers: originale.reservePourTiers,
    nomTiers: originale.nomTiers ?? undefined,
    telephoneTiers: originale.telephoneTiers ?? undefined,
  });
}
