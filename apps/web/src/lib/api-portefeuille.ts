import { clientApi } from "./api-client";
import { Devise } from "@reserva/shared";

export interface LigneHistorique {
  type: "PAIEMENT" | "POINTS" | "AVOIR" | "CARTE_CADEAU";
  date: string;
  libelle: string;
  montant?: number;
  devise?: Devise;
  operateur?: string;
  reference?: string;
  points?: number;
  sens?: string;
  restant?: number;
  solde?: number;
  statut?: string;
}

export interface PortefeuilleReponse {
  avoirs: { solde: number; devise: Devise; nombre: number };
  fidelite: { points: number; valeurEnFC: number };
  cartesCadeaux: { solde: number; nombre: number };
  historique: LigneHistorique[];
}

export async function obtenirPortefeuille(): Promise<PortefeuilleReponse> {
  const { data } = await clientApi.get("/portefeuille/moi");
  return data.donnees as PortefeuilleReponse;
}
