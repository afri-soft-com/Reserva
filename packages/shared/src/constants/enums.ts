/**
 * Constantes métier RESERVA — alignées sur le Cahier des Charges v1.0
 */

export const CATEGORIE_SERVICE = {
  SANTE: "SANTE",
  TRANSPORT: "TRANSPORT",
  HOTELLERIE: "HOTELLERIE",
  RESTAURATION: "RESTAURATION",
  SALLE_REUNION: "SALLE_REUNION",
  ADMINISTRATIF: "ADMINISTRATIF",
  EDUCATION: "EDUCATION",
} as const;

export type CategorieService = (typeof CATEGORIE_SERVICE)[keyof typeof CATEGORIE_SERVICE];

export const LIBELLES_CATEGORIE: Record<CategorieService, string> = {
  SANTE: "Santé",
  TRANSPORT: "Transport",
  HOTELLERIE: "Hôtellerie",
  RESTAURATION: "Restauration",
  SALLE_REUNION: "Salle de réunion",
  ADMINISTRATIF: "Service administratif",
  EDUCATION: "Éducation",
};

export const STATUT_RESERVATION = {
  EN_ATTENTE: "EN_ATTENTE",
  CONFIRMEE: "CONFIRMEE",
  EN_COURS: "EN_COURS", // check-in QR : le client est arrivé
  REFUSEE: "REFUSEE",
  ANNULEE: "ANNULEE",
  TERMINEE: "TERMINEE",
  ABSENCE: "ABSENCE", // no-show
} as const;

export type StatutReservation = (typeof STATUT_RESERVATION)[keyof typeof STATUT_RESERVATION];

export const STATUT_PAIEMENT = {
  EN_ATTENTE: "EN_ATTENTE",
  PARTIEL: "PARTIEL",
  PAYE: "PAYE",
  REMBOURSE: "REMBOURSE",
  ECHOUE: "ECHOUE",
} as const;

export type StatutPaiement = (typeof STATUT_PAIEMENT)[keyof typeof STATUT_PAIEMENT];

export const OPERATEUR_MOBILE_MONEY = {
  MPESA: "MPESA",
  AIRTEL_MONEY: "AIRTEL_MONEY",
  ORANGE_MONEY: "ORANGE_MONEY",
  ESPECES: "ESPECES",
} as const;

export type OperateurMobileMoney = (typeof OPERATEUR_MOBILE_MONEY)[keyof typeof OPERATEUR_MOBILE_MONEY];

export const LIBELLES_OPERATEUR: Record<OperateurMobileMoney, string> = {
  MPESA: "M-Pesa (Vodacom)",
  AIRTEL_MONEY: "Airtel Money",
  ORANGE_MONEY: "Orange Money",
  ESPECES: "Espèces sur place",
};

export const ROLE_UTILISATEUR = {
  CLIENT: "CLIENT",
  PRESTATAIRE: "PRESTATAIRE",
  ADMIN: "ADMIN",
} as const;

export type RoleUtilisateur = (typeof ROLE_UTILISATEUR)[keyof typeof ROLE_UTILISATEUR];

export const STATUT_PRESTATAIRE = {
  EN_ATTENTE_VALIDATION: "EN_ATTENTE_VALIDATION",
  APPROUVE: "APPROUVE",
  REJETE: "REJETE",
  SUSPENDU: "SUSPENDU",
} as const;

export type StatutPrestataire = (typeof STATUT_PRESTATAIRE)[keyof typeof STATUT_PRESTATAIRE];

export const DEVISE = {
  CDF: "CDF",
  USD: "USD",
} as const;

export type Devise = (typeof DEVISE)[keyof typeof DEVISE];

export const VILLES_RDC = [
  "Kinshasa",
  "Lubumbashi",
  "Goma",
  "Mbuji-Mayi",
  "Kisangani",
  "Bukavu",
  "Kananga",
  "Kolwezi",
  "Likasi",
  "Matadi",
] as const;

export type VilleRdc = (typeof VILLES_RDC)[number];

export const LANGUE = {
  FR: "fr",
  LN: "ln", // Lingala
  SW: "sw", // Swahili
} as const;

export type Langue = (typeof LANGUE)[keyof typeof LANGUE];

// Politique d'annulation par défaut (en heures avant le créneau)
export const DELAI_ANNULATION_GRATUITE_HEURES_DEFAUT = 24;
export const FRAIS_ANNULATION_TARDIVE_POURCENT_DEFAUT = 50;

// OTP
export const DUREE_VALIDITE_OTP_MINUTES = 10;
export const LONGUEUR_OTP = 6;
export const TENTATIVES_MAX_OTP = 3;
export const TENTATIVES_MAX_PIN = 3;
export const DUREE_BLOCAGE_PIN_MINUTES = 15;

// Commission plateforme (modèle de revenus PRD)
export const TAUX_COMMISSION_DEFAUT_POURCENT = 4;

export const STATUT_ABONNEMENT = {
  ACTIF: "ACTIF",
  EXPIRE: "EXPIRE",
  ANNULE: "ANNULE",
} as const;

export type StatutAbonnement = (typeof STATUT_ABONNEMENT)[keyof typeof STATUT_ABONNEMENT];

export const TYPE_CONFIG_TARIFICATION = {
  TEXTE: "TEXTE",
  NOMBRE: "NOMBRE",
  POURCENT: "POURCENT",
  MONTANT: "MONTANT",
} as const;

export type TypeConfigTarification = (typeof TYPE_CONFIG_TARIFICATION)[keyof typeof TYPE_CONFIG_TARIFICATION];
