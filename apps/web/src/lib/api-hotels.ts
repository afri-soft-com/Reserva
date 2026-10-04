import { clientApi } from "./api-client";

export interface HotelResume {
  id: string;
  nom: string;
  ville: string;
  quartier: string;
  etoiles: number;
  noteMoyenne: number;
  nombreAvis: number;
  prixDepuis?: number;
  devise?: string;
  nombreChambresDispo?: number;
}

export async function listerHotelsAdmin(ville?: string) {
  const { data } = await clientApi.get("/hotels", { params: { ville } });
  return data.donnees as { total: number; items: HotelResume[] };
}

export async function listerVillesHotels() {
  const { data } = await clientApi.get("/hotels/villes");
  return data.donnees as string[];
}
