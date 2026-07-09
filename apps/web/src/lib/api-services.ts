import { clientApi } from "./api-client";
import { RechercheServicesInput, ResultatPagine, ServiceOffert, Prestataire, Avis } from "@reserva/shared";

export interface ServiceAvecPrestataire extends ServiceOffert {
  prestataire: Pick<Prestataire, "id" | "nomEntreprise" | "categorie" | "ville" | "quartier" | "noteMoyenne" | "nombreAvis">;
  creneaux: { id: string; debut: string; fin: string; capaciteTotale: number; capaciteReservee: number }[];
}

export async function rechercherServices(filtres: Partial<RechercheServicesInput>) {
  const { data } = await clientApi.get("/services", { params: filtres });
  return data.donnees as ResultatPagine<ServiceAvecPrestataire>;
}

export async function obtenirDetailService(serviceId: string) {
  const { data } = await clientApi.get(`/services/${serviceId}`);
  return data.donnees as ServiceOffert & {
    prestataire: Prestataire;
    creneaux: { id: string; debut: string; fin: string; capaciteTotale: number; capaciteReservee: number; disponible: boolean }[];
  };
}

export async function listerAvisPrestataire(prestataireId: string) {
  const { data } = await clientApi.get(`/services/prestataires/${prestataireId}/avis`);
  return data.donnees as Avis[];
}
