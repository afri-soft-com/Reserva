import { clientApi } from "./api-client";

export async function listerVillesTransport() {
  const { data } = await clientApi.get("/transport/villes");
  return data.donnees as string[];
}

export async function rechercherTrajetsAdmin(params: {
  origine: string;
  destination: string;
  date: string;
}) {
  const { data } = await clientApi.get("/transport/rechercher", { params });
  return data.donnees as { total: number; items: any[] };
}

export async function listerTrajetsAdmin(date?: string) {
  const { data } = await clientApi.get("/transport/trajets", { params: { date } });
  return data.donnees as any[];
}

export type SaisieTrajetAdmin = {
  origine: string;
  destination: string;
  dateDepart: string;
  heureDepart: string;
  dureeMinutes: number;
  prix: number;
  placesTotales: number;
  operateurNom: string;
  confort?: string;
  actif?: boolean;
};

export async function creerTrajetAdmin(input: SaisieTrajetAdmin) {
  const { data } = await clientApi.post("/transport/trajets", input);
  return data.donnees;
}

export async function modifierTrajetAdmin(id: string, input: Partial<SaisieTrajetAdmin>) {
  const { data } = await clientApi.patch(`/transport/trajets/${id}`, input);
  return data.donnees;
}

export async function retirerTrajetAdmin(id: string) {
  const { data } = await clientApi.delete(`/transport/trajets/${id}`);
  return data.donnees;
}
