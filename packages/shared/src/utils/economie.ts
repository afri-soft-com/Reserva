import { Devise } from "../constants/enums";

/** Convertit 0.08 → 8 et laisse 8 inchangé (compatibilité anciens seeds). */
export function normaliserPourcent(valeur: number): number {
  if (!Number.isFinite(valeur) || valeur <= 0) return 0;
  return valeur > 0 && valeur < 1 ? valeur * 100 : valeur;
}

export function arrondirMontant(montant: number, devise: string): number {
  if (devise === "USD") return Math.round(montant * 100) / 100;
  return Math.round(montant);
}

export function convertirVersUsd(montant: number, devise: string, tauxUsdCdf: number): number {
  const taux = tauxUsdCdf > 0 ? tauxUsdCdf : 2800;
  return devise === "USD" ? montant : montant / taux;
}

export interface TarificationReservation {
  montantService: number;
  montantReduction: number;
  montantBase: number;
  tauxCommission: number;
  montantCommission: number;
  montantFraisService: number;
  montantTotalClient: number;
  montantNetPrestataire: number;
  devise: Devise | string;
}

export interface ParamsTarificationReservation {
  prixService: number;
  devise: string;
  montantReduction?: number;
  tauxCommissionPourcent: number;
  fraisServiceSeuilUsd?: number;
  fraisServiceMontantUsd?: number;
  fraisServiceMontantCdf?: number;
  tauxUsdCdf?: number;
}

/**
 * Calcule la répartition d'une réservation :
 * le client paie le service (après réduction) + frais de service éventuels ;
 * la plateforme prélève une commission ; le prestataire reçoit le net.
 */
export function calculerTarificationReservation(params: ParamsTarificationReservation): TarificationReservation {
  const devise = params.devise || "CDF";
  const reduction = Math.max(0, params.montantReduction ?? 0);
  const montantService = Math.max(0, params.prixService);
  const montantBase = Math.max(0, montantService - reduction);
  const tauxCommission = Math.min(50, Math.max(0, normaliserPourcent(params.tauxCommissionPourcent)));
  const tauxUsdCdf = params.tauxUsdCdf && params.tauxUsdCdf > 0 ? params.tauxUsdCdf : 2800;
  const seuilUsd = params.fraisServiceSeuilUsd ?? 50;
  const equivalentUsd = convertirVersUsd(montantBase, devise, tauxUsdCdf);

  let montantFraisService = 0;
  if (equivalentUsd >= seuilUsd) {
    montantFraisService = devise === "USD"
      ? (params.fraisServiceMontantUsd ?? 2)
      : (params.fraisServiceMontantCdf ?? 5000);
  }

  const montantCommission = arrondirMontant(montantBase * (tauxCommission / 100), devise);
  const montantFrais = arrondirMontant(montantFraisService, devise);
  const montantNetPrestataire = arrondirMontant(Math.max(0, montantBase - montantCommission), devise);
  const montantTotalClient = arrondirMontant(montantBase + montantFrais, devise);

  return {
    montantService: arrondirMontant(montantService, devise),
    montantReduction: arrondirMontant(reduction, devise),
    montantBase: arrondirMontant(montantBase, devise),
    tauxCommission,
    montantCommission,
    montantFraisService: montantFrais,
    montantTotalClient,
    montantNetPrestataire,
    devise,
  };
}
