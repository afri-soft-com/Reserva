import { comparerVersions, decideModeMiseAJour } from "@reserva/shared";
import { clientApi } from "./api-client";

export type ConfigVersionCanal = {
  minSoft: string;
  minForce: string;
  storeUrlAndroid?: string;
  storeUrlIos?: string;
};

export type ConfigVersions = {
  client: ConfigVersionCanal;
  pro: ConfigVersionCanal;
  web: ConfigVersionCanal;
};

export { comparerVersions, decideModeMiseAJour };

export async function lireVersionsApp(): Promise<ConfigVersions> {
  const { data } = await clientApi.get("/app/versions");
  return data.donnees ?? data.data ?? data;
}

export async function mettreAJourVersionsApp(payload: Partial<ConfigVersions>): Promise<ConfigVersions> {
  const { data } = await clientApi.put("/app/versions", payload);
  return data.donnees ?? data.data ?? data;
}
