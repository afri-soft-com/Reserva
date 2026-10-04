import { clientApi } from "./api-client";
import { TarificationReservation } from "@reserva/shared";

export async function listerPlansPublics() {
  const { data } = await clientApi.get("/economie/plans");
  return data.donnees as Array<{
    id: string;
    nom: string;
    description?: string | null;
    prix: number;
    devise: "CDF" | "USD";
    dureeJours: number;
    maxServices?: number | null;
    commissionReduite?: number | null;
    fonctionnalites: string;
    actif: boolean;
  }>;
}

export async function simulerTarification(prix: number, devise: string, prestataireId?: string) {
  const { data } = await clientApi.get("/economie/simulation", {
    params: { prix, devise, prestataireId },
  });
  return data.donnees as TarificationReservation;
}

export async function souscrireAbonnement(input: {
  planId: string;
  operateur?: string;
  telephonePaiement?: string;
}) {
  const { data } = await clientApi.post("/economie/abonnement/souscrire", input);
  return data.donnees;
}

export async function obtenirMesFinances() {
  const { data } = await clientApi.get("/economie/moi/finances");
  return data.donnees as {
    prestataireId: string;
    tauxCommission: number;
    abonnement: any;
    soldes: {
      CDF: { brut: number; verse: number; enAttente: number; disponible: number };
      USD: { brut: number; verse: number; enAttente: number; disponible: number };
    };
    minimums: { CDF: number; USD: number };
    versements: any[];
  };
}

export async function demanderVersement(input: {
  montant: number;
  devise: "CDF" | "USD";
  operateur: string;
  telephonePaiement: string;
}) {
  const { data } = await clientApi.post("/economie/moi/versements", input);
  return data.donnees;
}

export type FinancesAdmin = {
  periode: string;
  gmv: number;
  recetteBrute: number;
  recetteNette: number;
  takeRate: number;
  parType: Record<string, number>;
  abonnementsActifs: number;
  mrr: { CDF: number; USD: number };
  versements: { enAttente: number; nombreEnAttente: number; payesPeriode: number };
  evolution: Array<{ mois: string; gmv: number; recette: number }>;
  config?: {
    commissionPrestataireDefaut: number;
    fraisServiceSeuilUsd: number;
    fraisServiceMontantUsd: number;
    fraisServiceMontantCdf: number;
    tauxUsdCdf: number;
    versementMinimumCdf: number;
    versementMinimumUsd: number;
  };
  reservations?: {
    payees: number;
    commissions: number;
    fraisService: number;
    netPrestataires: number;
  };
  topPrestataires?: Array<{
    prestataireId: string;
    nomEntreprise: string;
    ville?: string | null;
    categorie?: string | null;
    volumeCdf: number;
  }>;
  abonnementsExpirant?: any[];
  ecrituresRecentes?: any[];
};

export async function obtenirFinancesAdmin(periode = "mois") {
  const { data } = await clientApi.get("/economie/admin/finances", { params: { periode } });
  return data.donnees as FinancesAdmin;
}

export async function listerVersementsAdmin(page = 1, statut?: string) {
  const { data } = await clientApi.get("/economie/admin/versements", { params: { page, statut } });
  return data.donnees as { items: any[]; total: number; page: number; totalPages: number };
}

export async function traiterVersementAdmin(id: string, input: { payer: boolean; noteAdmin?: string }) {
  const { data } = await clientApi.post(`/economie/admin/versements/${id}`, input);
  return data.donnees;
}

export async function listerEcrituresAdmin(params: {
  page?: number;
  type?: string;
  compte?: string;
  devise?: string;
} = {}) {
  const { data } = await clientApi.get("/economie/admin/ecritures", { params });
  return data.donnees as { items: any[]; total: number; page: number; totalPages: number };
}

export async function listerSoldesPrestatairesAdmin(page = 1) {
  const { data } = await clientApi.get("/economie/admin/soldes", { params: { page } });
  return data.donnees as {
    items: any[];
    total: number;
    page: number;
    totalPages: number;
    config: FinancesAdmin["config"];
  };
}

export async function obtenirConfigTarifAdmin() {
  const { data } = await clientApi.get("/economie/admin/config");
  return data.donnees as NonNullable<FinancesAdmin["config"]>;
}
