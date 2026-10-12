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

export async function lireVersionsApp(): Promise<ConfigVersions> {
  const { data } = await clientApi.get("/app/versions");
  return data.donnees ?? data.data ?? data;
}

export async function mettreAJourVersionsApp(payload: Partial<ConfigVersions>): Promise<ConfigVersions> {
  const { data } = await clientApi.put("/app/versions", payload);
  return data.donnees ?? data.data ?? data;
}

export function comparerVersions(a: string, b: string): number {
  const parts = (v: string) =>
    v
      .split(/[^0-9]+/)
      .filter(Boolean)
      .map((n) => parseInt(n, 10));
  const pa = parts(a);
  const pb = parts(b);
  for (let i = 0; i < 3; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x - y;
  }
  return 0;
}
