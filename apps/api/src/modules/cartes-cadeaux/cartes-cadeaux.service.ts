import { prisma } from "../../config/prisma";
import { ErreurValidation, ErreurNonTrouve, ErreurInterdit } from "../../utils/erreurs";
import { normaliserTelephone } from "@reserva/shared";
import { AcheterCarteCadeauInput, UtiliserCarteCadeauInput } from "./cartes-cadeaux.schema";

const DUREE_VALIDITE_DEFAUT_MOIS = 12;

/** Génère un code de carte cadeau unique, ex: CAD-A7K2Q9 */
async function genererCodeUnique(): Promise<string> {
  const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ23456789";
  for (let tentative = 0; tentative < 10; tentative++) {
    let suffixe = "";
    for (let i = 0; i < 6; i++) {
      suffixe += caracteres[Math.floor(Math.random() * caracteres.length)];
    }
    const code = `CAD-${suffixe}`;
    const existant = await prisma.carteCadeau.findUnique({ where: { code } });
    if (!existant) return code;
  }
  throw new ErreurValidation("Impossible de générer un code unique, réessayez");
}

/** Achat d'une carte cadeau : crédite le solde et l'associe au bénéficiaire (optionnel) */
export async function acheterCarteCadeau(acheteurId: string, input: AcheterCarteCadeauInput) {
  let beneficiaireId: string | null = null;
  if (input.beneficiaireTelephone) {
    const telephone = normaliserTelephone(input.beneficiaireTelephone);
    const beneficiaire = await prisma.utilisateur.findUnique({ where: { telephone } });
    if (!beneficiaire) {
      throw new ErreurValidation("Aucun compte RESERVA associé à ce numéro de téléphone");
    }
    beneficiaireId = beneficiaire.id;
  }

  const code = await genererCodeUnique();
  const dateExpiration = new Date();
  dateExpiration.setMonth(dateExpiration.getMonth() + DUREE_VALIDITE_DEFAUT_MOIS);

  const carte = await prisma.carteCadeau.create({
    data: {
      code,
      acheteurId,
      montant: input.montant,
      solde: input.montant,
      devise: input.devise,
      beneficiaireId,
      dateExpiration,
    },
    include: { acheteur: { select: { nom: true, telephone: true } } },
  });

  await prisma.notification.create({
    data: {
      utilisateurId: acheteurId,
      titre: "Carte cadeau achetée",
      message: `Votre carte cadeau ${code} d'une valeur de ${input.montant} ${input.devise} est prête à être offerte.`,
      type: "PAIEMENT",
    },
  });

  return carte;
}

/** Liste les cartes cadeaux de l'utilisateur (achetées ou reçues) */
export async function listerMesCartesCadeaux(utilisateurId: string) {
  const cartes = await prisma.carteCadeau.findMany({
    where: { OR: [{ acheteurId: utilisateurId }, { beneficiaireId: utilisateurId }] },
    include: {
      acheteur: { select: { nom: true, telephone: true } },
      beneficiaire: { select: { nom: true, telephone: true } },
    },
    orderBy: { creeLe: "desc" },
  });

  const soldeTotal = cartes
    .filter((c) => c.beneficiaireId === utilisateurId && c.actif)
    .reduce((somme, c) => somme + c.solde, 0);

  return { cartes, soldeTotal };
}

/** Détail d'une carte par son code — vérifie l'accès (acheteur, bénéficiaire ou admin) */
export async function obtenirCarteParCode(code: string, utilisateurId: string) {
  const carte = await prisma.carteCadeau.findUnique({
    where: { code: code.toUpperCase().trim() },
    include: {
      acheteur: { select: { nom: true, telephone: true } },
      beneficiaire: { select: { nom: true, telephone: true } },
    },
  });
  if (!carte) {
    throw new ErreurNonTrouve("Carte cadeau introuvable");
  }
  if (carte.acheteurId !== utilisateurId && carte.beneficiaireId !== utilisateurId) {
    throw new ErreurInterdit("Vous n'avez pas accès à cette carte cadeau");
  }

  const expirée = carte.dateExpiration ? new Date() > carte.dateExpiration : false;
  return {
    ...carte,
    valide: carte.actif && !expirée && carte.solde > 0,
    expirée,
  };
}

/**
 * Utilise une carte cadeau pour régler tout ou partie d'une réservation.
 * Consomme le solde, enregistre une transaction CARTE_CADEAU et met à jour le paiement.
 */
export async function utiliserCarteCadeau(utilisateurId: string, input: UtiliserCarteCadeauInput) {
  const carte = await prisma.carteCadeau.findUnique({ where: { code: input.code.toUpperCase().trim() } });
  if (!carte) {
    throw new ErreurNonTrouve("Carte cadeau introuvable");
  }
  if (carte.acheteurId !== utilisateurId && carte.beneficiaireId !== utilisateurId) {
    throw new ErreurInterdit("Vous n'avez pas accès à cette carte cadeau");
  }
  if (!carte.actif) {
    throw new ErreurValidation("Cette carte cadeau a été désactivée");
  }
  if (carte.dateExpiration && new Date() > carte.dateExpiration) {
    throw new ErreurValidation("Cette carte cadeau a expiré");
  }
  if (carte.solde <= 0) {
    throw new ErreurValidation("Le solde de cette carte cadeau est épuisé");
  }

  const reservation = await prisma.reservation.findUnique({ where: { id: input.reservationId } });
  if (!reservation) {
    throw new ErreurNonTrouve("Réservation non trouvée");
  }
  if (reservation.clientId !== utilisateurId) {
    throw new ErreurInterdit("Vous ne pouvez régler que vos propres réservations");
  }
  if (reservation.statut === "ANNULEE" || reservation.statut === "REFUSEE" || reservation.statut === "TERMINEE") {
    throw new ErreurValidation("Cette réservation ne peut plus être réglée");
  }
  if (reservation.statutPaiement === "PAYE") {
    throw new ErreurValidation("Cette réservation est déjà payée intégralement");
  }

  const montantRestant = reservation.montantTotal - reservation.montantPaye;
  const montantConsomme = Math.min(carte.solde, montantRestant);
  const nouveauMontantPaye = reservation.montantPaye + montantConsomme;
  const statutPaiement = nouveauMontantPaye >= reservation.montantTotal ? "PAYE" : "PARTIEL";

  const resultat = await prisma.$transaction([
    prisma.carteCadeau.update({
      where: { id: carte.id },
      data: { solde: carte.solde - montantConsomme },
    }),
    prisma.reservation.update({
      where: { id: reservation.id },
      data: { montantPaye: nouveauMontantPaye, statutPaiement },
    }),
    prisma.transaction.create({
      data: {
        reservationId: reservation.id,
        operateur: "CARTE_CADEAU",
        montant: montantConsomme,
        devise: reservation.devise,
        statut: "PAYE",
        referenceExterne: carte.code,
      },
    }),
    prisma.notification.create({
      data: {
        utilisateurId,
        reservationId: reservation.id,
        titre: "Paiement par carte cadeau",
        message: `${montantConsomme} ${reservation.devise} réglés avec la carte ${carte.code}.`,
        type: "PAIEMENT",
      },
    }),
  ]);

  return {
    montantConsomme,
    montantRestant: Math.max(0, montantRestant - montantConsomme),
    soldeRestantCarte: carte.solde - montantConsomme,
    statutPaiement,
    reservation: resultat[1],
  };
}
