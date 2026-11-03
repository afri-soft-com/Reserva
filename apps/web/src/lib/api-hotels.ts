import { clientApi } from "./api-client";

export interface HotelResume {
  id: string;
  nom: string;
  ville: string;
  quartier: string;
  adresse?: string | null;
  description?: string | null;
  telephone?: string | null;
  etoiles: number;
  noteMoyenne: number;
  nombreAvis: number;
  actif?: boolean;
  prixDepuis?: number | null;
  devise?: string;
  nombreChambresDispo?: number;
}

export type SaisieHotelAdmin = {
  nom: string;
  ville: string;
  quartier: string;
  adresse?: string;
  description?: string;
  telephone?: string;
  etoiles?: number;
  prixParNuit?: number;
  devise?: string;
  actif?: boolean;
};

export async function listerHotelsAdmin(ville?: string) {
  const { data } = await clientApi.get("/hotels/admin/catalogue", { params: { ville } });
  return data.donnees as { total: number; items: HotelResume[] };
}

export async function creerHotelAdmin(input: SaisieHotelAdmin) {
  const { data } = await clientApi.post("/hotels/admin/catalogue", input);
  return data.donnees;
}

export async function modifierHotelAdmin(id: string, input: Partial<SaisieHotelAdmin>) {
  const { data } = await clientApi.patch(`/hotels/${id}`, input);
  return data.donnees;
}

export async function retirerHotelAdmin(id: string) {
  const { data } = await clientApi.delete(`/hotels/${id}`);
  return data.donnees;
}

export async function listerVillesHotels() {
  const { data } = await clientApi.get("/hotels/villes");
  return data.donnees as string[];
}
