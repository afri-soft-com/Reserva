/** Délai après le début du créneau avant qu'une garantie « non délivré » soit exigible. */
export const DELAI_GARANTIE_MS = 2 * 60 * 60 * 1000;

export interface EtatGarantie {
  garantieActive: boolean;
  garantieUtilisee: boolean;
  statut: string;
  statutPaiement: string;
  montantPaye: number;
  creneauDebut: Date;
}

/**
 * La garantie crédite le client seulement si la prestation n'a pas commencé
 * et que le créneau a débuté depuis au moins 2 h. Un no-show client (ABSENCE)
 * ou une prestation déjà entamée / terminée ne donne pas droit au crédit.
 */
export function motifRefusGarantie(etat: EtatGarantie, maintenant = new Date()): string | null {
  if (!etat.garantieActive) return "Garantie non active sur cette réservation";
  if (etat.garantieUtilisee) return "Garantie déjà utilisée";
  if (etat.statutPaiement !== "PAYE" && etat.statutPaiement !== "PARTIEL") {
    return "La garantie s'applique aux réservations payées";
  }
  if (etat.montantPaye <= 0) return "Aucun montant payé à créditer";
  if (etat.statut !== "CONFIRMEE" && etat.statut !== "EN_ATTENTE") {
    return "La garantie ne s'applique pas à ce statut de réservation";
  }
  const echeance = etat.creneauDebut.getTime() + DELAI_GARANTIE_MS;
  if (maintenant.getTime() < echeance) {
    return "La garantie est disponible 2 heures après le début du créneau si la prestation n'a pas commencé";
  }
  return null;
}
