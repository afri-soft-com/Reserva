import { prisma } from "../../config/prisma";

/**
 * Score confiance 0–100 :
 * 40% note avis, 25% taux completion, 25% ponctualité, 10% badge terrain.
 */
export function calculerScoreConfiance(p: {
  noteMoyenne: number;
  tauxCompletionPourcent: number;
  tauxPonctualitePourcent: number;
  badgeVerifieTerrain: boolean;
}): number {
  const note = Math.min(5, Math.max(0, p.noteMoyenne)) / 5 * 40;
  const completion = Math.min(100, Math.max(0, p.tauxCompletionPourcent)) / 100 * 25;
  const ponctualite = Math.min(100, Math.max(0, p.tauxPonctualitePourcent)) / 100 * 25;
  const badge = p.badgeVerifieTerrain ? 10 : 0;
  return Math.round((note + completion + ponctualite + badge) * 10) / 10;
}

/** Recalcule et persiste score + taux pour un prestataire */
export async function recalculerConfiancePrestataire(prestataireId: string) {
  const reservations = await prisma.reservation.findMany({
    where: {
      prestataireId,
      statut: { in: ["TERMINEE", "ABSENCE", "ANNULEE", "REFUSEE", "CONFIRMEE", "EN_COURS"] },
    },
    select: { statut: true, creeLe: true, misAJourLe: true },
  });

  const terminees = reservations.filter((r) => r.statut === "TERMINEE").length;
  const absences = reservations.filter((r) => r.statut === "ABSENCE").length;
  const refusees = reservations.filter((r) => r.statut === "REFUSEE").length;
  const denom = terminees + absences + refusees;
  const tauxCompletion = denom === 0 ? 100 : (terminees / denom) * 100;
  // Proxy ponctualité : absences = non ponctuel côté client, REFUSEE pénalise le pro
  const tauxPonctualite = denom === 0 ? 100 : ((terminees) / Math.max(1, terminees + absences)) * 100;

  const prestataire = await prisma.prestataire.findUnique({ where: { id: prestataireId } });
  if (!prestataire) return null;

  const scoreConfiance = calculerScoreConfiance({
    noteMoyenne: prestataire.noteMoyenne,
    tauxCompletionPourcent: tauxCompletion,
    tauxPonctualitePourcent: tauxPonctualite,
    badgeVerifieTerrain: prestataire.badgeVerifieTerrain,
  });

  return prisma.prestataire.update({
    where: { id: prestataireId },
    data: {
      tauxCompletionPourcent: Math.round(tauxCompletion * 10) / 10,
      tauxPonctualitePourcent: Math.round(tauxPonctualite * 10) / 10,
      scoreConfiance,
    },
  });
}

export async function recalculerTousLesScores() {
  const ids = await prisma.prestataire.findMany({ select: { id: true } });
  const resultats = [];
  for (const { id } of ids) {
    resultats.push(await recalculerConfiancePrestataire(id));
  }
  return resultats.filter(Boolean);
}
