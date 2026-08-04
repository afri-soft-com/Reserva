import { clientApi } from "./api-client";

export interface CarteCadeau {
  id: string;
  code: string;
  montant: number;
  solde: number;
  devise: string;
  actif: boolean;
  dateExpiration?: string;
  beneficiaireId?: string;
  acheteur?: { id: string; nom: string; telephone: string };
  beneficiaire?: { id: string; nom: string; telephone: string };
}

export interface MesCartesCadeauxReponse {
  cartes: CarteCadeau[];
  soldeTotal: number;
}

export async function obtenirMesCartesCadeaux(): Promise<MesCartesCadeauxReponse> {
  const { data } = await clientApi.get("/cartes-cadeaux/moi");
  return data.donnees as MesCartesCadeauxReponse;
}

export async function acheterCarteCadeau(body: {
  montant: number;
  devise?: string;
  beneficiaireTelephone?: string;
}): Promise<CarteCadeau> {
  const { data } = await clientApi.post("/cartes-cadeaux", body);
  return data.donnees as CarteCadeau;
}

export async function transfererCarteCadeau(carteId: string, beneficiaireTelephone: string): Promise<unknown> {
  const { data } = await clientApi.post(`/cartes-cadeaux/${carteId}/transferer`, {
    beneficiaireTelephone,
  });
  return data.donnees;
}
