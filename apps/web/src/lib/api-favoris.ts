import { clientApi } from "./api-client";
import { ResultatPagine } from "@reserva/shared";
import { ServiceAvecPrestataire } from "./api-services";

export interface FavoriAvecService {
  id: string;
  serviceId: string;
  creeLe: string;
  service: ServiceAvecPrestataire;
}

export async function listerFavoris(page = 1, parPage = 20) {
  const { data } = await clientApi.get("/favoris", { params: { page, parPage } });
  return data.donnees as ResultatPagine<FavoriAvecService>;
}

export async function ajouterFavori(serviceId: string) {
  const { data } = await clientApi.post(`/favoris/${serviceId}`);
  return data.donnees;
}

export async function supprimerFavori(serviceId: string) {
  const { data } = await clientApi.delete(`/favoris/${serviceId}`);
  return data.donnees;
}

export async function obtenirIdsFavoris(): Promise<Set<string>> {
  const { data } = await clientApi.get("/favoris", { params: { page: 1, parPage: 200 } });
  const pagination = data.donnees as ResultatPagine<FavoriAvecService>;
  return new Set(pagination.items.map((f) => f.serviceId));
}
