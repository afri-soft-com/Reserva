import { clientApi } from "./api-client";

export async function obtenirStatistiquesAdmin() {
  const { data } = await clientApi.get("/admin/statistiques");
  return data.donnees as {
    utilisateurs: { total: number; nouveauxCeMois: number };
    prestataires: { total: number; enAttente: number; approuves: number };
    reservations: { total: number; cetteSemaine: number; ceMois: number; parStatut: Record<string, number> };
    revenus: { ceMois: number };
  };
}

export async function obtenirPilotageAdmin() {
  const { data } = await clientApi.get("/admin/pilotage");
  return data.donnees as {
    stats: any;
    alertes: {
      prestatairesEnAttente: number;
      versementsEnAttente: number;
      abonnementsExpirant: number;
      paiementsEnAttente: number;
    };
    files: {
      prestatairesEnAttente: any[];
      versementsEnAttente: any[];
      reservationsRecentes: any[];
      abonnementsExpirant: any[];
    };
  };
}

export async function listerReservationsAdmin(params: {
  page?: number;
  statut?: string;
  statutPaiement?: string;
  recherche?: string;
} = {}) {
  const { data } = await clientApi.get("/admin/reservations", { params });
  return data.donnees as { items: any[]; total: number; page: number; totalPages: number };
}

export async function telechargerExportAdmin(type: "reservations" | "prestataires" | "utilisateurs") {
  const { default: axios } = await import("axios");
  const { API_URL } = await import("./api-client");
  const token = typeof window !== "undefined" ? localStorage.getItem("reserva_token") : null;
  const response = await axios.get(`${API_URL}/admin/export/${type}`, {
    responseType: "arraybuffer",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const blob = new Blob([response.data], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reserva-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function listerTousPrestatairesAdmin(page = 1, parPage = 20) {
  const { data } = await clientApi.get("/admin/prestataires", { params: { page, parPage } });
  return data.donnees as { items: any[]; total: number; page: number; totalPages: number };
}

export async function listerTousUtilisateursAdmin(page = 1, parPage = 20) {
  const { data } = await clientApi.get("/admin/utilisateurs", { params: { page, parPage } });
  return data.donnees as { items: any[]; total: number; page: number; totalPages: number };
}

// ---- Plans d'abonnement ----

export async function listerPlansAdmin(page = 1, parPage = 50) {
  const { data } = await clientApi.get("/admin/plans", { params: { page, parPage } });
  return data.donnees as { items: any[]; total: number; page: number; totalPages: number };
}

export async function creerPlanAdmin(input: {
  nom: string; description?: string; prix: number; devise?: string;
  dureeJours: number; maxServices?: number; commissionReduite?: number; fonctionnalites?: string;
}) {
  const { data } = await clientApi.post("/admin/plans", input);
  return data.donnees;
}

export async function modifierPlanAdmin(id: string, input: Partial<{
  nom: string; description: string; prix: number; devise: string;
  dureeJours: number; maxServices: number; commissionReduite: number; fonctionnalites: string; actif: boolean;
}>) {
  const { data } = await clientApi.put(`/admin/plans/${id}`, input);
  return data.donnees;
}

export async function supprimerPlanAdmin(id: string) {
  const { data } = await clientApi.delete(`/admin/plans/${id}`);
  return data.donnees;
}

// ---- Abonnements prestataire ----

export async function listerAbonnementsAdmin(page = 1, parPage = 20) {
  const { data } = await clientApi.get("/admin/abonnements", { params: { page, parPage } });
  return data.donnees as { items: any[]; total: number; page: number; totalPages: number };
}

export async function creerAbonnementAdmin(input: {
  prestataireId: string; planId: string; dateDebut: string; dateFin: string;
}) {
  const { data } = await clientApi.post("/admin/abonnements", input);
  return data.donnees;
}

// ---- Configuration tarification ----

export async function listerConfigsTarifAdmin(page = 1, parPage = 50) {
  const { data } = await clientApi.get("/admin/tarifications", { params: { page, parPage } });
  return data.donnees as { items: any[]; total: number; page: number; totalPages: number };
}

export async function creerOuModifierConfigTarifAdmin(input: {
  cle: string; valeur: string; description?: string; type?: string; actif?: boolean;
}) {
  const { data } = await clientApi.post("/admin/tarifications", input);
  return data.donnees;
}

export async function supprimerConfigTarifAdmin(id: string) {
  const { data } = await clientApi.delete(`/admin/tarifications/${id}`);
  return data.donnees;
}

// ---- Validation prestataires ----

export async function validerPrestataireAdmin(input: {
  prestataireId: string;
  approuver: boolean;
  motifRejet?: string;
}) {
  const { data } = await clientApi.post("/prestataires/admin/valider", input);
  return data.donnees;
}

// ---- Broadcast notifications ----

export async function envoyerBroadcastAdmin(input: { titre: string; message: string; role?: string }) {
  const { data } = await clientApi.post("/admin/notifications/broadcast", input);
  return data.donnees as { envoyees: number };
}
