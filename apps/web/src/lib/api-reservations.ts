import { clientApi } from "./api-client";
import { CreerReservationInput, AnnulerReservationInput, Reservation, ServiceOffert, Prestataire, Creneau } from "@reserva/shared";

export interface ReservationDetaillee extends Reservation {
  service: ServiceOffert;
  prestataire: Prestataire;
  creneau: Creneau;
  avis?: { id: string; note: number } | null;
}

export async function creerReservation(input: CreerReservationInput) {
  const { data } = await clientApi.post("/reservations", input);
  return data.donnees as ReservationDetaillee;
}

export async function modifierReservation(input: { reservationId: string; nouveauCreneauId: string }) {
  const { data } = await clientApi.post("/reservations/modifier", input);
  return data.donnees as ReservationDetaillee;
}

export async function annulerReservation(input: AnnulerReservationInput) {
  const { data } = await clientApi.post("/reservations/annuler", input);
  return data.donnees as { annule: boolean; montantRembourse: number };
}

export async function listerMesReservations(statut?: string) {
  const { data } = await clientApi.get("/reservations/moi", { params: { statut } });
  return data.donnees as ReservationDetaillee[];
}

export async function obtenirDetailReservation(reservationId: string) {
  const { data } = await clientApi.get(`/reservations/${reservationId}`);
  return data.donnees as ReservationDetaillee;
}

// --- Côté prestataire ---

export async function listerReservationsRecues(statut?: string) {
  const { data } = await clientApi.get("/reservations/recues/liste", { params: { statut } });
  return data.donnees as ReservationDetaillee[];
}

export async function repondreReservation(reservationId: string, accepter: boolean) {
  const { data } = await clientApi.post(`/reservations/${reservationId}/repondre`, { accepter });
  return data.donnees as Reservation;
}

export async function cloturerReservation(reservationId: string, statut: "TERMINEE" | "ABSENCE") {
  const { data } = await clientApi.post(`/reservations/${reservationId}/cloturer`, { statut });
  return data.donnees as Reservation;
}
