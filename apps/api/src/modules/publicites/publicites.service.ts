import { prisma } from "../../config/prisma";
import { ErreurNonTrouve } from "../../utils/erreurs";
import { obtenirConfigTarif } from "../economie/economie.service";

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
  const pubs = await prisma.publicite.findMany({ where, orderBy: { creeLe: "desc" } });
  const config = await obtenirConfigTarif();
  return pubs.map((p) => ({ ...p, revenuEstime: estimerRevenuPub(p, config) }));
}

export async function obtenirPublicite(id: string) {
  const pub = await prisma.publicite.findUnique({ where: { id } });
  if (!pub) throw new ErreurNonTrouve("Publicité non trouvée");
  const config = await obtenirConfigTarif();
  return { ...pub, revenuEstime: estimerRevenuPub(pub, config) };
}

function estimerRevenuPub(
  p: {
    modeleFacturation: string;
    prixCampagne: number | null;
    impressions: number;
    clics: number;
    devise: string;
  },
  config: Awaited<ReturnType<typeof obtenirConfigTarif>>
) {
  const modele = p.modeleFacturation || "GRATUIT";
  if (modele === "GRATUIT") return { montant: 0, devise: p.devise || "CDF", modele };
  if (modele === "FORFAIT") {
    return {
      montant: p.prixCampagne ?? config.pubForfaitCdf,
      devise: p.devise || "CDF",
      modele,
    };
  }
  if (modele === "CPM") {
    const cpm = p.prixCampagne ?? config.pubCpmCdf;
    return {
      montant: Math.round((p.impressions / 1000) * cpm * 100) / 100,
      devise: p.devise || "CDF",
      modele,
      tarifUnitaire: cpm,
    };
  }
  // CPC
  const cpc = p.prixCampagne ?? config.pubCpcCdf;
  return {
    montant: Math.round(p.clics * cpc * 100) / 100,
    devise: p.devise || "CDF",
    modele,
    tarifUnitaire: cpc,
  };
}

export async function creerPublicite(input: any) {
  return prisma.publicite.create({
    data: {
      titre: input.titre,
      imageUrl: input.imageUrl || null,
      lienUrl: input.lienUrl || null,
      description: input.description,
      actif: input.actif ?? true,
      dateDebut: input.dateDebut ? new Date(input.dateDebut) : new Date(),
      dateFin: input.dateFin ? new Date(input.dateFin) : null,
      cible: input.cible ?? "TOUS",
      modeleFacturation: input.modeleFacturation ?? "GRATUIT",
      prixCampagne: input.prixCampagne,
      devise: input.devise ?? "CDF",
      annonceurNom: input.annonceurNom,
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
      ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl || null }),
      ...(input.lienUrl !== undefined && { lienUrl: input.lienUrl || null }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.actif !== undefined && { actif: input.actif }),
      ...(input.dateDebut !== undefined && { dateDebut: new Date(input.dateDebut) }),
      ...(input.dateFin !== undefined && { dateFin: input.dateFin ? new Date(input.dateFin) : null }),
      ...(input.cible !== undefined && { cible: input.cible }),
      ...(input.modeleFacturation !== undefined && { modeleFacturation: input.modeleFacturation }),
      ...(input.prixCampagne !== undefined && { prixCampagne: input.prixCampagne }),
      ...(input.devise !== undefined && { devise: input.devise }),
      ...(input.annonceurNom !== undefined && { annonceurNom: input.annonceurNom }),
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
