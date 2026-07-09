import { clientApi } from "./api-client";
import { CreerAvisInput, ReponseAvisInput, Avis } from "@reserva/shared";

export async function creerAvis(input: CreerAvisInput) {
  const { data } = await clientApi.post("/avis", input);
  return data.donnees as Avis;
}

export async function repondreAvis(input: ReponseAvisInput) {
  const { data } = await clientApi.post("/avis/repondre", input);
  return data.donnees as Avis;
}

export async function listerMesAvis() {
  const { data } = await clientApi.get("/avis/moi");
  return data.donnees as Avis[];
}

export async function listerAvisRecus() {
  const { data } = await clientApi.get("/avis/recus");
  return data.donnees as { avis: Avis[]; noteMoyenne: number; nombreAvis: number; repartition: Record<number, number> };
}
