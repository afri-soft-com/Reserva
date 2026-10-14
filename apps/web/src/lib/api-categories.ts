import { clientApi } from "./api-client";

export type CategorieServiceDto = {
  id: string;
  code: string;
  libelle: string;
  description?: string | null;
  icone?: string | null;
  couleur?: string | null;
  ordre: number;
  actif: boolean;
  creeLe: string;
  misAJourLe: string;
};

export type CategorieInput = {
  code?: string;
  libelle: string;
  description?: string | null;
  icone?: string | null;
  couleur?: string | null;
  ordre?: number;
  actif?: boolean;
};

export async function listerCategoriesAdmin(activesSeulement = false) {
  const { data } = await clientApi.get("/categories", {
    params: activesSeulement ? { actives: "1" } : undefined,
  });
  return data.donnees as CategorieServiceDto[];
}

export async function listerCategoriesPubliques() {
  const { data } = await clientApi.get("/categories/publiques");
  return data.donnees as CategorieServiceDto[];
}

export async function creerCategorie(input: CategorieInput & { code: string }) {
  const { data } = await clientApi.post("/categories", input);
  return data.donnees as CategorieServiceDto;
}

export async function modifierCategorie(id: string, input: Partial<CategorieInput>) {
  const { data } = await clientApi.patch(`/categories/${id}`, input);
  return data.donnees as CategorieServiceDto;
}

export async function supprimerCategorie(id: string) {
  const { data } = await clientApi.delete(`/categories/${id}`);
  return data.donnees as { message: string; desactivee: boolean };
}
