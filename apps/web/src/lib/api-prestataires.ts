import { clientApi } from "./api-client";
import { Prestataire, ServiceOffert } from "@reserva/shared";

export interface CreerPrestataireInput {
  nomEntreprise: string;
  categorie: string;
  ville: string;
  quartier: string;
  adresse?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
}

export async function creerProfilPrestataire(input: CreerPrestataireInput) {
  const { data } = await clientApi.post("/prestataires", input);
  return data.donnees as Prestataire;
}

export async function obtenirMonProfilPrestataire() {
  const { data } = await clientApi.get("/prestataires/moi");
  return data.donnees as Prestataire & { services: ServiceOffert[] };
}

export async function modifierProfilPrestataire(input: {
  delaiAnnulationGratuiteHeures?: number;
  fraisAnnulationTardivePourcent?: number;
}) {
  const { data } = await clientApi.patch("/prestataires/moi", input);
  return data.donnees as Prestataire;
}

export interface TableauDeBordReponse {
  reservationsAujourdhui: any[];
  statistiques: {
    totalReservationsSemaine: number;
    totalReservationsMois: number;
    revenusMoisEnCours: number;
    reservationsEnAttenteAction: number;
    noteMoyenne: number;
    nombreAvis: number;
    tauxOccupation: number;
    revenusAnnuels: number;
    meilleurMois: number;
  };
}

export async function obtenirTableauDeBord() {
  const { data } = await clientApi.get("/prestataires/moi/tableau-de-bord");
  return data.donnees as TableauDeBordReponse;
}

export interface CreerServiceOffertInput {
  nom: string;
  description?: string;
  dureeMinutes: number;
  prix: number;
  devise: "CDF" | "USD";
}

export async function creerServiceOffert(input: CreerServiceOffertInput) {
  const { data } = await clientApi.post("/prestataires/moi/services", input);
  return data.donnees as ServiceOffert;
}

export async function listerMesServices() {
  const { data } = await clientApi.get("/prestataires/moi/services");
  return data.donnees as ServiceOffert[];
}

export async function modifierServiceOffert(serviceId: string, input: Partial<CreerServiceOffertInput & { actif: boolean }>) {
  const { data } = await clientApi.patch(`/prestataires/moi/services/${serviceId}`, input);
  return data.donnees as ServiceOffert;
}

export async function creerCreneauxRecurrents(params: {
  serviceId: string;
  dateDebut: string;
  dateFin: string;
  heuresCreneaux: string[];
  dureeMinutes: number;
  capaciteParCreneau: number;
  joursExclus?: number[];
}) {
  const { data } = await clientApi.post("/services/creneaux/recurrents", params);
  return data.donnees as { nombreCreneauxCrees: number };
}

export async function listerCreneauxService(serviceId: string) {
  const { data } = await clientApi.get(`/services/${serviceId}/creneaux/gestion`);
  return data.donnees;
}

export async function supprimerCreneau(creneauId: string) {
  const { data } = await clientApi.delete(`/services/creneaux/${creneauId}`);
  return data.donnees as { supprime: boolean };
}

export interface ReservationCalendrier {
  id: string;
  numero: string;
  statut: string;
  statutPaiement: string;
  montantPaye: number;
  client: { nom: string; telephone: string };
}

export interface CreneauCalendrier {
  id: string;
  debut: string;
  fin: string;
  capaciteTotale: number;
  capaciteReservee: number;
  service: { id: string; nom: string; prix: number; devise: "CDF" | "USD" };
  reservations: ReservationCalendrier[];
}

export interface ReponseCalendrier {
  mois: string;
  totalCreneaux: number;
  totalReservations: number;
  jours: Record<string, CreneauCalendrier[]>;
  periodesBloquees?: PeriodeIndisponible[];
}

export interface PeriodeIndisponible {
  id: string;
  dateDebut: string;
  dateFin: string;
  motif?: string | null;
  service?: { id: string; nom: string } | null;
}

export async function obtenirCalendrier(mois?: string) {
  const { data } = await clientApi.get("/prestataires/moi/calendrier", { params: mois ? { mois } : {} });
  return data.donnees as ReponseCalendrier;
}

export async function creerPeriodeIndisponible(input: {
  serviceId?: string;
  dateDebut: string;
  dateFin: string;
  motif?: string;
}) {
  const { data } = await clientApi.post("/indisponibilites/", input);
  return data.donnees as PeriodeIndisponible;
}

export async function listerMesPeriodesIndisponibles(serviceId?: string) {
  const { data } = await clientApi.get("/indisponibilites/moi", { params: serviceId ? { serviceId } : {} });
  return data.donnees as PeriodeIndisponible[];
}

export async function supprimerPeriodeIndisponible(periodeId: string) {
  const { data } = await clientApi.delete(`/indisponibilites/${periodeId}`);
  return data.donnees as { id: string };
}

export interface StatistiquesPrestataire {
  noteMoyenne: number;
  nombreAvis: number;
  totalReservations: number;
  tauxAnnulation: number;
  parJour: { date: string; reservations: number; revenus: number }[];
  parService: { serviceId: string; nom: string; reservations: number; revenus: number }[];
  parStatut: { statut: string; _count: number }[];
  repartitionNotes: { note: number; nombre: number }[];
  topClients: { clientId: string; nom: string; telephone: string; reservations: number; totalDepense: number }[];
}

export async function obtenirStatistiquesPrestataire() {
  const { data } = await clientApi.get("/prestataires/moi/statistiques");
  return data.donnees as StatistiquesPrestataire;
}
