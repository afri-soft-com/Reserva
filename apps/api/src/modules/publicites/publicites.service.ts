import { prisma } from "../../config/prisma";
import { ErreurNonTrouve } from "../../utils/erreurs";

export async function listerPublicites(actif?: boolean, cible?: string) {
  const where: any = {};
  if (actif !== undefined) where.actif = actif;
  if (actif === true) {
    where.dateDebut = { lte: new Date() };
    where.OR = [{ dateFin: null }, { dateFin: { gte: new Date() } }];
  }
  if (cible) {
    where.cible = { in: [cible, "TOUS"] };
  }
  return prisma.publicite.findMany({ where, orderBy: { creeLe: "desc" } });
}

export async function obtenirPublicite(id: string) {
  const pub = await prisma.publicite.findUnique({ where: { id } });
  if (!pub) throw new ErreurNonTrouve("Publicité non trouvée");
  return pub;
}

export async function creerPublicite(input: any) {
  return prisma.publicite.create({
    data: {
      titre: input.titre,
      imageUrl: input.imageUrl,
      lienUrl: input.lienUrl,
      description: input.description,
      actif: input.actif ?? true,
      dateDebut: input.dateDebut ? new Date(input.dateDebut) : new Date(),
      dateFin: input.dateFin ? new Date(input.dateFin) : null,
      cible: input.cible ?? "TOUS",
    },
  });
}

export async function modifierPublicite(id: string, input: any) {
  const existante = await prisma.publicite.findUnique({ where: { id } });
  if (!existante) throw new ErreurNonTrouve("Publicité non trouvée");
  return prisma.publicite.update({
    where: { id },
    data: {
      ...(input.titre !== undefined && { titre: input.titre }),
      ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl }),
      ...(input.lienUrl !== undefined && { lienUrl: input.lienUrl }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.actif !== undefined && { actif: input.actif }),
      ...(input.dateDebut !== undefined && { dateDebut: new Date(input.dateDebut) }),
      ...(input.dateFin !== undefined && { dateFin: input.dateFin ? new Date(input.dateFin) : null }),
      ...(input.cible !== undefined && { cible: input.cible }),
    },
  });
}

export async function supprimerPublicite(id: string) {
  const existante = await prisma.publicite.findUnique({ where: { id } });
  if (!existante) throw new ErreurNonTrouve("Publicité non trouvée");
  await prisma.publicite.delete({ where: { id } });
}

export async function incrementerCompteur(publiciteId: string, type: "IMPRESSION" | "CLIC") {
  const pub = await prisma.publicite.findUnique({ where: { id: publiciteId } });
  if (!pub) throw new ErreurNonTrouve("Publicité non trouvée");
  const champ = type === "IMPRESSION" ? "impressions" : "clics";
  return prisma.publicite.update({
    where: { id: publiciteId },
    data: { [champ]: { increment: 1 } },
  });
}
