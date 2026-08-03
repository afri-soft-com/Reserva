import { clientApi, API_URL } from "./api-client";
import { InitierPaiementInput, Transaction } from "@reserva/shared";

export async function initierPaiement(input: InitierPaiementInput) {
  const { data } = await clientApi.post("/paiements", input);
  return data.donnees as { transaction: Transaction; statutOperateur: string; messageOperateur?: string };
}

export async function listerTransactions(reservationId: string) {
  const { data } = await clientApi.get(`/paiements/reservations/${reservationId}/transactions`);
  return data.donnees as Transaction[];
}

export async function obtenirRecu(reservationId: string) {
  const { data } = await clientApi.get(`/paiements/reservations/${reservationId}/recu`);
  return data.donnees;
}

export async function obtenirRecuHtml(reservationId: string) {
  const { data } = await clientApi.get(`/paiements/reservations/${reservationId}/recu/html`);
  return data as string;
}

export async function telechargerRecuPdf(reservationId: string): Promise<void> {
  const { default: axios } = await import("axios");
  const token = localStorage.getItem("reserva_token");
  const response = await axios.get(`${API_URL}/paiements/reservations/${reservationId}/recu/pdf`, {
    responseType: "arraybuffer",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const blob = new Blob([response.data], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement("a");
  a.href = url;
  a.download = `recu-${reservationId}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function telechargerRapportCsv(dateDebut?: string, dateFin?: string) {
  const { data } = await clientApi.get("/paiements/rapport/csv", {
    params: { dateDebut, dateFin },
    responseType: "text",
  });
  return data as string;
}

export async function telechargerRapportReservationsPdf(periode: "jour" | "semaine" | "mois"): Promise<void> {
  const { default: axios } = await import("axios");
  const token = localStorage.getItem("reserva_token");
  const response = await axios.get(`${API_URL}/paiements/rapport/pdf`, {
    params: { periode },
    responseType: "arraybuffer",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const blob = new Blob([response.data], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement("a");
  a.href = url;
  a.download = `rapport-reservations-${periode}-${new Date().toISOString().slice(0, 10)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function obtenirStatistiquesAdmin() {
  const { data } = await clientApi.get("/admin/statistiques");
  return data.donnees as {
    utilisateurs: { total: number; nouveauxCeMois: number };
    prestataires: { total: number; enAttente: number; approuves: number };
    reservations: { total: number; cetteSemaine: number; ceMois: number; parStatut: Record<string, number> };
    revenus: { ceMois: number };
    evolution: Array<{ mois: string; revenus: number; reservations: number; reservationsPayees: number }>;
  };
}

export async function listerTousPrestatairesAdmin(page = 1, parPage = 20) {
  const { data } = await clientApi.get("/admin/prestataires", { params: { page, parPage } });
  return data.donnees as { items: any[]; total: number; page: number; totalPages: number };
}

export async function listerTousUtilisateursAdmin(page = 1, parPage = 20) {
  const { data } = await clientApi.get("/admin/utilisateurs", { params: { page, parPage } });
  return data.donnees as { items: any[]; total: number; page: number; totalPages: number };
}
