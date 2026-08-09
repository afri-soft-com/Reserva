import { Devise } from "../constants/enums";
import { LONGUEUR_OTP } from "../constants/enums";

/**
 * Normalise un numéro de téléphone congolais vers le format international +243XXXXXXXXX.
 * Accepte : 0991234567, 991234567, +243991234567, 243991234567
 */
export function normaliserTelephone(telephone: string): string {
  const chiffres = telephone.replace(/\D/g, "");

  if (chiffres.startsWith("243") && chiffres.length === 12) {
    return `+${chiffres}`;
  }
  if (chiffres.startsWith("0") && chiffres.length === 10) {
    return `+243${chiffres.slice(1)}`;
  }
  if (chiffres.length === 9) {
    return `+243${chiffres}`;
  }
  // Retourne tel quel avec préfixe + si rien ne correspond, la validation Zod aura déjà filtré l'essentiel
  return telephone.startsWith("+") ? telephone : `+${chiffres}`;
}

/** Génère un code OTP numérique à LONGUEUR_OTP chiffres */
export function genererOtp(): string {
  const min = Math.pow(10, LONGUEUR_OTP - 1);
  const max = Math.pow(10, LONGUEUR_OTP) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

/** Génère une référence de réservation courte et lisible, ex: RSV-7K2P9X */
export function genererNumeroReservation(): string {
  const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans 0/O/1/I pour éviter confusion
  let suffixe = "";
  for (let i = 0; i < 6; i++) {
    suffixe += caracteres[Math.floor(Math.random() * caracteres.length)];
  }
  return `RSV-${suffixe}`;
}

/** Formate un montant avec sa devise selon les conventions RDC (espace comme séparateur de milliers) */
export function formaterMontant(montant: number, devise: Devise): string {
  const formatte = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: devise === "USD" ? 2 : 0,
    maximumFractionDigits: devise === "USD" ? 2 : 0,
  }).format(montant);
  return devise === "USD" ? `$${formatte}` : `${formatte} FC`;
}

/** Calcule le nombre d'heures entre deux dates ISO */
export function heuresEntre(dateA: string | Date, dateB: string | Date): number {
  const a = new Date(dateA).getTime();
  const b = new Date(dateB).getTime();
  return Math.abs(b - a) / (1000 * 60 * 60);
}

/**
 * Calcule le montant remboursable selon la politique d'annulation du prestataire.
 * Retourne le montant à rembourser au client.
 */
export function calculerRemboursement(params: {
  montantPaye: number;
  heuresAvantCreneau: number;
  delaiAnnulationGratuiteHeures: number;
  fraisAnnulationTardivePourcent: number;
}): number {
  const { montantPaye, heuresAvantCreneau, delaiAnnulationGratuiteHeures, fraisAnnulationTardivePourcent } = params;

  if (heuresAvantCreneau >= delaiAnnulationGratuiteHeures) {
    return montantPaye; // annulation gratuite, remboursement intégral
  }
  const fraisRetenu = montantPaye * (fraisAnnulationTardivePourcent / 100);
  return Math.max(0, montantPaye - fraisRetenu);
}

/** Masque partiellement un numéro de téléphone pour affichage (ex: +243 99 *** 567) */
export function masquerTelephone(telephone: string): string {
  if (telephone.length < 8) return telephone;
  const debut = telephone.slice(0, 6);
  const fin = telephone.slice(-3);
  return `${debut} *** ${fin}`;
}

/** Pagination : calcule l'offset SQL à partir de la page et du nombre d'éléments par page */
export function calculerOffset(page: number, parPage: number): number {
  return (Math.max(1, page) - 1) * parPage;
}

/** Pagination : borne la taille d'une page à une valeur maximale (protection contre les abus) */
export function bornerParPage(parPage: number, max = 100): number {
  if (!Number.isFinite(parPage) || parPage <= 0) return 20;
  return Math.min(parPage, max);
}
