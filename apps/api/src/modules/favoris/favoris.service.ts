import { prisma } from "../../config/prisma";
import { ErreurNonTrouve, ErreurConflit } from "../../utils/erreurs";

export async function listerFavoris(utilisateurId: string) {
  return prisma.favori.findMany({
    where: { utilisateurId },
    include: {
      service: {
        include: {
          prestataire: {
            select: {
              id: true,
              nomEntreprise: true,
              categorie: true,
              ville: true,
              quartier: true,
              noteMoyenne: true,
              nombreAvis: true,
            },
          },
          creneaux: {
            where: { debut: { gte: new Date() } },
            orderBy: { debut: "asc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { creeLe: "desc" },
  });
}

export async function ajouterFavori(utilisateurId: string, serviceId: string) {
  const service = await prisma.serviceOffert.findUnique({ where: { id: serviceId } });
  if (!service || !service.actif) {
    throw new ErreurNonTrouve("Service non trouvé");
  }
  const existant = await prisma.favori.findUnique({
    where: { utilisateurId_serviceId: { utilisateurId, serviceId } },
  });
  if (existant) {
    throw new ErreurConflit("Ce service est déjà dans vos favoris");
  }
  return prisma.favori.create({
    data: { utilisateurId, serviceId },
  });
}

export async function supprimerFavori(utilisateurId: string, serviceId: string) {
  const favori = await prisma.favori.findUnique({
    where: { utilisateurId_serviceId: { utilisateurId, serviceId } },
  });
  if (!favori) {
    throw new ErreurNonTrouve("Favori non trouvé");
  }
  await prisma.favori.delete({ where: { id: favori.id } });
  return { supprime: true };
}
