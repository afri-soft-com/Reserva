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
