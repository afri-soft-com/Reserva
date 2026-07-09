import { clientApi } from "./api-client";

export async function listerPublicitesAdmin() {
  const { data } = await clientApi.get("/publicites");
  return data.donnees as any[];
}

export async function obtenirPublicite(id: string) {
  const { data } = await clientApi.get(`/publicites/${id}`);
  return data.donnees;
}

export async function creerPublicite(input: {
  titre: string;
  imageUrl?: string;
  lienUrl?: string;
  description?: string;
  actif?: boolean;
  dateDebut?: string;
  dateFin?: string;
  cible?: string;
}) {
  const { data } = await clientApi.post("/publicites", input);
  return data.donnees;
}

export async function modifierPublicite(id: string, input: Partial<{
  titre: string;
  imageUrl: string;
  lienUrl: string;
  description: string;
  actif: boolean;
  dateDebut: string;
  dateFin: string;
  cible: string;
}>) {
  const { data } = await clientApi.patch(`/publicites/${id}`, input);
  return data.donnees;
}

export async function supprimerPublicite(id: string) {
  const { data } = await clientApi.delete(`/publicites/${id}`);
  return data.donnees;
}

export async function listerPublicitesActives() {
  const { data } = await clientApi.get("/publicites/actives");
  return data.donnees as any[];
}

export async function incrementerCompteur(publiciteId: string, type: "IMPRESSION" | "CLIC") {
  const { data } = await clientApi.post("/publicites/compteur", { publiciteId, type });
  return data.donnees;
}

export async function uploaderImage(fichier: File): Promise<string> {
  const formData = new FormData();
  formData.append("fichier", fichier);
  const { data } = await clientApi.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.donnees.url;
}
