import { clientApi } from "./api-client";

export interface SoldeFidelite {
  solde: number;
  valeurEnFC: number;
}

export interface TransactionPoints {
  id: string;
  montantPoints: number;
  type: string;
  description?: string;
  soldeApres: number;
  creeLe: string;
}

export interface HistoriqueFidelite {
  items: TransactionPoints[];
  total: number;
  page: number;
  parPage: number;
  totalPages: number;
}

export async function obtenirSoldeFidelite(): Promise<SoldeFidelite> {
  const { data } = await clientApi.get("/fidelite/solde");
  return data.donnees as SoldeFidelite;
}

export async function obtenirHistoriqueFidelite(page = 1, parPage = 20): Promise<HistoriqueFidelite> {
  const { data } = await clientApi.get("/fidelite/historique", {
    params: { page, parPage },
  });
  return data.donnees as HistoriqueFidelite;
}
