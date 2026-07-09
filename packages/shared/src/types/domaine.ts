import {
  CategorieService,
  StatutReservation,
  StatutPaiement,
  OperateurMobileMoney,
  RoleUtilisateur,
  StatutPrestataire,
  Devise,
  Langue,
} from "../constants/enums";

/** Utilisateur (client) */
export interface Utilisateur {
  id: string;
  telephone: string;
  email?: string | null;
  nom: string;
  role: RoleUtilisateur;
  langue: Langue;
  photoUrl?: string | null;
  telephoneVerifie: boolean;
  deuxFAActif?: boolean;
  creeLe: string; // ISO date
}

/** Prestataire de service (entité commerciale) */
export interface Prestataire {
  id: string;
  utilisateurId: string;
  nomEntreprise: string;
  categorie: CategorieService;
  ville: string;
  quartier: string;
  adresse?: string | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  statut: StatutPrestataire;
  noteMoyenne: number;
  nombreAvis: number;
  delaiAnnulationGratuiteHeures: number;
  fraisAnnulationTardivePourcent: number;
  creeLe: string;
}

/** Service proposé par un prestataire (ex: consultation, chambre double, trajet Kinshasa-Matadi) */
export interface ServiceOffert {
  id: string;
  prestataireId: string;
  nom: string;
  description?: string | null;
  dureeMinutes: number;
  prix: number;
  devise: Devise;
  actif: boolean;
}

/** Créneau horaire disponible pour un service */
export interface Creneau {
  id: string;
  serviceId: string;
  debut: string; // ISO datetime
  fin: string; // ISO datetime
  capaciteTotale: number;
  capaciteReservee: number;
  disponible: boolean;
}

/** Réservation */
export interface Reservation {
  id: string;
  numero: string; // référence courte affichée au client, ex: RSV-7K2P9X
  clientId: string;
  prestataireId: string;
  serviceId: string;
  creneauId: string;
  statut: StatutReservation;
  statutPaiement: StatutPaiement;
  montantTotal: number;
  montantPaye: number;
  montantReduction: number;
  devise: Devise;
  notes?: string | null;
  reservePourTiers: boolean;
  nomTiers?: string | null;
  telephoneTiers?: string | null;
  codePromoId?: string | null;
  creeLe: string;
  misAJourLe: string;
}

/** Code promo */
export interface CodePromo {
  id: string;
  code: string;
  description?: string | null;
  type: "PERCENTAGE" | "FIXED";
  valeur: number;
  devise: Devise;
  montantMin?: number | null;
  usageMax?: number | null;
  usageCount: number;
  dateDebut: string;
  dateFin: string;
  actif: boolean;
  creeLe: string;
}

/** Transaction de paiement (Mobile Money ou espèces) */
export interface Transaction {
  id: string;
  reservationId: string;
  operateur: OperateurMobileMoney;
  montant: number;
  devise: Devise;
  statut: StatutPaiement;
  referenceExterne?: string | null; // ID transaction côté opérateur
  creeLe: string;
}

/** Avis / notation laissé par un client après une réservation terminée */
export interface Avis {
  id: string;
  reservationId: string;
  clientId: string;
  prestataireId: string;
  note: number; // 1 à 5
  commentaire?: string | null;
  reponsePrestataire?: string | null;
  creeLe: string;
}

/** Notification envoyée à un utilisateur (SMS, push, in-app) */
export interface Notification {
  id: string;
  utilisateurId: string;
  titre: string;
  message: string;
  type: "RAPPEL" | "CONFIRMATION" | "ANNULATION" | "PAIEMENT" | "SYSTEME";
  lu: boolean;
  creeLe: string;
}

/** Transaction de points fidélité */
export interface PointTransaction {
  id: string;
  utilisateurId: string;
  type: "GAIN" | "DEPENSE";
  montantPoints: number;
  soldeApres: number;
  reservationId?: string | null;
  description?: string | null;
  creeLe: string;
}

/** Enveloppe standard de réponse API */
export interface ReponseApi<T> {
  succes: boolean;
  donnees?: T;
  erreur?: {
    code: string;
    message: string;
  };
}

/** Pagination standard */
export interface ResultatPagine<T> {
  items: T[];
  total: number;
  page: number;
  parPage: number;
  totalPages: number;
}
