import { prisma } from "../../config/prisma";
import { ErreurNonTrouve, ErreurValidation, ErreurInterdit } from "../../utils/erreurs";
import { CreerAvisInput, ReponseAvisInput } from "@reserva/shared";

/**
 * Crée un avis après une réservation TERMINEE. Recalcule la note moyenne du prestataire
 * de façon incrémentale pour éviter de recompter tous les avis à chaque fois.
 */
export async function creerAvis(clientId: string, input: CreerAvisInput) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: input.reservationId },
    include: { avis: true, prestataire: true },
  });

  if (!reservation) {
    throw new ErreurNonTrouve("Réservation non trouvée");
  }
  if (reservation.clientId !== clientId) {
    throw new ErreurInterdit("Vous ne pouvez noter que vos propres réservations");
  }
  if (reservation.statut !== "TERMINEE") {
    throw new ErreurValidation("Seule une réservation terminée peut être notée");
  }
  if (reservation.avis) {
    throw new ErreurValidation("Vous avez déjà laissé un avis pour cette réservation");
  }

  const avis = await prisma.$transaction(async (tx) => {
    const nouvelAvis = await tx.avis.create({
      data: {
        reservationId: input.reservationId,
        clientId,
        prestataireId: reservation.prestataireId,
        note: input.note,
        commentaire: input.commentaire,
        photosUrl: input.photosUrl && input.photosUrl.length > 0 ? JSON.stringify(input.photosUrl) : null,
      },
    });

    const prestataire = await tx.prestataire.findUnique({ where: { id: reservation.prestataireId } });
    if (prestataire) {
      const nouveauNombreAvis = prestataire.nombreAvis + 1;
      const nouvelleNoteMoyenne =
        (prestataire.noteMoyenne * prestataire.nombreAvis + input.note) / nouveauNombreAvis;

      await tx.prestataire.update({
        where: { id: prestataire.id },
        data: {
          nombreAvis: nouveauNombreAvis,
          noteMoyenne: Math.round(nouvelleNoteMoyenne * 10) / 10, // arrondi à 1 décimale
        },
      });
    }

    return nouvelAvis;
  });

  return avis;
}

/** [PRESTATAIRE] Répond publiquement à un avis client */
export async function repondreAvis(utilisateurId: string, input: ReponseAvisInput) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) {
    throw new ErreurNonTrouve("Profil prestataire non trouvé");
  }

  const avis = await prisma.avis.findUnique({ where: { id: input.avisId } });
  if (!avis || avis.prestataireId !== prestataire.id) {
    throw new ErreurNonTrouve("Avis non trouvé");
  }
  if (avis.reponsePrestataire) {
    throw new ErreurValidation("Une réponse a déjà été apportée à cet avis");
  }

  const avisMisAJour = await prisma.avis.update({ where: { id: input.avisId }, data: { reponsePrestataire: input.reponse } });

  await prisma.notification.create({
    data: {
      utilisateurId: avis.clientId,
      reservationId: avis.reservationId,
      titre: "Réponse à votre avis",
      message: `${prestataire.nomEntreprise} a répondu à votre avis : « ${input.reponse} »`,
      type: "AVIS",
    },
  });

  return avisMisAJour;
}

/** Liste les avis laissés par le client connecté */
export async function listerMesAvis(clientId: string) {
  const avis = await prisma.avis.findMany({
    where: { clientId },
    include: { prestataire: { select: { nomEntreprise: true } }, reservation: { select: { statut: true, numero: true } } },
    orderBy: { creeLe: "desc" },
  });
  return avis.map(formaterAvis);
}

/** [PRESTATAIRE] Liste les avis reçus par le prestataire connecté, avec répartition des notes */
export async function listerAvisRecus(utilisateurId: string) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) {
    throw new ErreurNonTrouve("Profil prestataire non trouvé");
  }

  const avis = await prisma.avis.findMany({
    where: { prestataireId: prestataire.id },
    include: {
      client: { select: { nom: true, photoUrl: true } },
      reservation: { select: { statut: true, numero: true } },
    },
    orderBy: { creeLe: "desc" },
  });

  const repartition: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const a of avis) {
    repartition[a.note] = (repartition[a.note] ?? 0) + 1;
  }

  return {
    avis: avis.map(formaterAvis),
    noteMoyenne: prestataire.noteMoyenne,
    nombreAvis: prestataire.nombreAvis,
    repartition,
  };
}

/** Formate un avis : décode les photos (stockées en JSON) et expose le statut "vérifié" */
function formaterAvis(avis: any) {
  let photosUrl: string[] = [];
  if (avis.photosUrl) {
    try {
      photosUrl = JSON.parse(avis.photosUrl);
    } catch {
      photosUrl = [];
    }
  }
  const verifie = avis.reservation?.statut === "TERMINEE";
  const { reservation, photosUrl: _photos, ...rest } = avis;
  return { ...rest, photosUrl, verifie };
}
