import { prisma } from "../../config/prisma";
import { ErreurValidation, ErreurNonTrouve } from "../../utils/erreurs";

function genererCodeUnique(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function listerCodesPromos() {
  return prisma.codePromo.findMany({ orderBy: { creeLe: "desc" } });
}

export async function obtenirCodePromo(id: string) {
  const code = await prisma.codePromo.findUnique({ where: { id } });
  if (!code) throw new ErreurNonTrouve("Code promo introuvable");
  return code;
}

export async function creerCodePromo(donnees: {
  code?: string;
  description?: string;
  type: string;
  valeur: number;
  devise?: string;
  montantMin?: number;
  usageMax?: number;
  dateDebut: string;
  dateFin: string;
  creeParId?: string;
}) {
  const code = donnees.code || genererCodeUnique();
  const existant = await prisma.codePromo.findUnique({ where: { code } });
  if (existant) throw new ErreurValidation("Ce code promo existe déjà");

  return prisma.codePromo.create({
    data: {
      code,
      description: donnees.description,
      type: donnees.type,
      valeur: donnees.valeur,
      devise: donnees.devise ?? "CDF",
      montantMin: donnees.montantMin,
      usageMax: donnees.usageMax,
      dateDebut: new Date(donnees.dateDebut),
      dateFin: new Date(donnees.dateFin),
      creeParId: donnees.creeParId,
    },
  });
}

export async function modifierCodePromo(id: string, donnees: {
  description?: string;
  actif?: boolean;
  usageMax?: number;
  dateDebut?: string;
  dateFin?: string;
}) {
  const existant = await prisma.codePromo.findUnique({ where: { id } });
  if (!existant) throw new ErreurNonTrouve("Code promo introuvable");

  return prisma.codePromo.update({
    where: { id },
    data: {
      ...(donnees.description !== undefined && { description: donnees.description }),
      ...(donnees.actif !== undefined && { actif: donnees.actif }),
      ...(donnees.usageMax !== undefined && { usageMax: donnees.usageMax }),
      ...(donnees.dateDebut !== undefined && { dateDebut: new Date(donnees.dateDebut) }),
      ...(donnees.dateFin !== undefined && { dateFin: new Date(donnees.dateFin) }),
    },
  });
}

export async function supprimerCodePromo(id: string) {
  const existant = await prisma.codePromo.findUnique({ where: { id } });
  if (!existant) throw new ErreurNonTrouve("Code promo introuvable");
  await prisma.codePromo.update({ where: { id }, data: { actif: false } });
  return { message: "Code promo désactivé" };
}

export async function validerCodePromo(code: string, montant: number) {
  const promo = await prisma.codePromo.findUnique({ where: { code: code.toUpperCase() } });
  if (!promo) throw new ErreurValidation("Code promo invalide");
  if (!promo.actif) throw new ErreurValidation("Ce code promo n'est plus actif");

  const maintenant = new Date();
  if (maintenant < promo.dateDebut) throw new ErreurValidation("Ce code promo n'est pas encore valide");
  if (maintenant > promo.dateFin) throw new ErreurValidation("Ce code promo a expiré");

  if (promo.usageMax && promo.usageCount >= promo.usageMax) {
    throw new ErreurValidation("Ce code promo a atteint sa limite d'utilisation");
  }

  if (promo.montantMin && montant < promo.montantMin) {
    throw new ErreurValidation(`Montant minimum requis : ${promo.montantMin} ${promo.devise}`);
  }

  let reduction = 0;
  if (promo.type === "PERCENTAGE") {
    reduction = montant * (promo.valeur / 100);
  } else {
    reduction = Math.min(promo.valeur, montant);
  }

  return {
    valide: true,
    reduction,
    montantFinal: montant - reduction,
    codePromoId: promo.id,
    code: promo.code,
    type: promo.type,
    valeur: promo.valeur,
    description: promo.description,
  };
}

export async function appliquerCodePromo(reservationId: string, code: string, utilisateurId: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
  });
  if (!reservation) throw new ErreurNonTrouve("Réservation introuvable");
  if (reservation.clientId !== utilisateurId) {
    throw new ErreurValidation("Cette réservation ne vous appartient pas");
  }
  if (reservation.statut !== "EN_ATTENTE" && reservation.statut !== "CONFIRMEE") {
    throw new ErreurValidation("Impossible d'appliquer un code promo sur cette réservation");
  }

  const validation = await validerCodePromo(code, reservation.montantTotal);

  await prisma.$transaction([
    prisma.reservation.update({
      where: { id: reservationId },
      data: {
        codePromoId: validation.codePromoId,
        montantReduction: validation.reduction,
        montantTotal: reservation.montantTotal - validation.reduction,
      },
    }),
    prisma.codePromo.update({
      where: { id: validation.codePromoId },
      data: { usageCount: { increment: 1 } },
    }),
  ]);

  return validation;
}

export async function listerCodesUtilisables() {
  const maintenant = new Date();
  const tous = await prisma.codePromo.findMany({
    where: {
      actif: true,
      dateDebut: { lte: maintenant },
      dateFin: { gte: maintenant },
    },
    orderBy: { dateFin: "asc" },
  });
  return tous.filter((p: { usageMax: number | null; usageCount: number }) => !p.usageMax || p.usageCount < p.usageMax);
}
