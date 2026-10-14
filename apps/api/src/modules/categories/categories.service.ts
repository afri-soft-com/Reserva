import { prisma } from "../../config/prisma";
import { ErreurValidation, ErreurNonTrouve, ErreurConflit } from "../../utils/erreurs";
import { CATEGORIE_SERVICE, LIBELLES_CATEGORIE } from "@reserva/shared";

const SEED_DEFAUT = Object.values(CATEGORIE_SERVICE).map((code, index) => ({
  code,
  libelle: LIBELLES_CATEGORIE[code],
  description: null as string | null,
  ordre: (index + 1) * 10,
  actif: true,
}));

/** Assure que les catégories historiques existent (idempotent). */
export async function assurerCategoriesParDefaut() {
  const count = await prisma.categorieService.count();
  if (count > 0) return;
  await prisma.categorieService.createMany({
    data: SEED_DEFAUT.map((c) => ({
      code: c.code,
      libelle: c.libelle,
      description: c.description,
      ordre: c.ordre,
      actif: c.actif,
    })),
    skipDuplicates: true,
  });
}

export async function listerCategories(opts?: { activesSeulement?: boolean }) {
  await assurerCategoriesParDefaut();
  return prisma.categorieService.findMany({
    where: opts?.activesSeulement ? { actif: true } : undefined,
    orderBy: [{ ordre: "asc" }, { libelle: "asc" }],
  });
}

export async function obtenirCategorie(id: string) {
  const cat = await prisma.categorieService.findUnique({ where: { id } });
  if (!cat) throw new ErreurNonTrouve("Catégorie introuvable");
  return cat;
}

export async function creerCategorie(donnees: {
  code: string;
  libelle: string;
  description?: string | null;
  icone?: string | null;
  couleur?: string | null;
  ordre?: number;
  actif?: boolean;
}) {
  const code = donnees.code.trim().toUpperCase();
  const existant = await prisma.categorieService.findUnique({ where: { code } });
  if (existant) throw new ErreurConflit(`La catégorie ${code} existe déjà`);

  const maxOrdre = await prisma.categorieService.aggregate({ _max: { ordre: true } });
  return prisma.categorieService.create({
    data: {
      code,
      libelle: donnees.libelle.trim(),
      description: donnees.description ?? null,
      icone: donnees.icone ?? null,
      couleur: donnees.couleur ?? null,
      ordre: donnees.ordre ?? (maxOrdre._max.ordre ?? 0) + 10,
      actif: donnees.actif ?? true,
    },
  });
}

export async function modifierCategorie(
  id: string,
  donnees: {
    libelle?: string;
    description?: string | null;
    icone?: string | null;
    couleur?: string | null;
    ordre?: number;
    actif?: boolean;
  }
) {
  const existant = await prisma.categorieService.findUnique({ where: { id } });
  if (!existant) throw new ErreurNonTrouve("Catégorie introuvable");

  return prisma.categorieService.update({
    where: { id },
    data: {
      ...(donnees.libelle !== undefined && { libelle: donnees.libelle.trim() }),
      ...(donnees.description !== undefined && { description: donnees.description }),
      ...(donnees.icone !== undefined && { icone: donnees.icone }),
      ...(donnees.couleur !== undefined && { couleur: donnees.couleur }),
      ...(donnees.ordre !== undefined && { ordre: donnees.ordre }),
      ...(donnees.actif !== undefined && { actif: donnees.actif }),
    },
  });
}

export async function supprimerCategorie(id: string) {
  const existant = await prisma.categorieService.findUnique({ where: { id } });
  if (!existant) throw new ErreurNonTrouve("Catégorie introuvable");

  const prestataires = await prisma.prestataire.count({
    where: { categorie: existant.code },
  });
  if (prestataires > 0) {
    await prisma.categorieService.update({ where: { id }, data: { actif: false } });
    return {
      message: `Catégorie désactivée (${prestataires} prestataire(s) y sont liés)`,
      desactivee: true,
    };
  }

  await prisma.categorieService.delete({ where: { id } });
  return { message: "Catégorie supprimée", desactivee: false };
}

export async function codesCategoriesActives(): Promise<string[]> {
  const cats = await listerCategories({ activesSeulement: true });
  return cats.map((c) => c.code);
}

export async function exigerCategorieActive(code: string) {
  const normalise = code.trim().toUpperCase();
  await assurerCategoriesParDefaut();
  const cat = await prisma.categorieService.findUnique({ where: { code: normalise } });
  if (!cat || !cat.actif) {
    throw new ErreurValidation(`Catégorie invalide ou inactive : ${normalise}`);
  }
  return cat;
}
