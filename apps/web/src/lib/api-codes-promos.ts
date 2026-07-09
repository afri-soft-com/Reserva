import { clientApi } from "./api-client";

export async function listerCodesPromos() {
  const { data } = await clientApi.get("/codes-promos");
  return data.donnees as any[];
}

export async function obtenirCodePromo(id: string) {
  const { data } = await clientApi.get(`/codes-promos/${id}`);
  return data.donnees;
}

export async function creerCodePromo(input: {
  code?: string;
  description?: string;
  type: string;
  valeur: number;
  devise?: string;
  montantMin?: number;
  usageMax?: number;
  dateDebut: string;
  dateFin: string;
}) {
  const { data } = await clientApi.post("/codes-promos", input);
  return data.donnees;
}

export async function modifierCodePromo(id: string, input: Partial<{
  description: string;
  actif: boolean;
  usageMax: number;
  dateDebut: string;
  dateFin: string;
}>) {
  const { data } = await clientApi.patch(`/codes-promos/${id}`, input);
  return data.donnees;
}

export async function supprimerCodePromo(id: string) {
  const { data } = await clientApi.delete(`/codes-promos/${id}`);
  return data.donnees;
}
