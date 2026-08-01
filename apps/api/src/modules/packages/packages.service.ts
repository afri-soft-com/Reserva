import { prisma } from "../../config/prisma";
import { ErreurNonTrouve, ErreurValidation, ErreurInterdit } from "../../utils/erreurs";
import { CreerPackageInput, ModifierPackageInput } from "./packages.schema";

/** Vérifie que l'utilisateur est un prestataire approuvé et renvoie son profil */
async function obtenirPrestataireApprouve(utilisateurId: string) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) {
    throw new ErreurNonTrouve("Profil prestataire non trouvé");
  }
  if (prestataire.statut !== "APPROUVE") {
    throw new ErreurInterdit("Votre profil prestataire doit être approuvé avant de créer des packages");
  }
  return prestataire;
}

/** Vérifie que tous les services appartiennent bien au prestataire */
async function verifierServicesDuPrestataire(serviceIds: string[], prestataireId: string) {
  const services = await prisma.serviceOffert.findMany({
    where: { id: { in: serviceIds }, prestataireId },
  });
  if (services.length !== serviceIds.length) {
    throw new ErreurValidation("Un ou plusieurs services n'appartiennent pas à votre établissement");
  }
  return services;
}

/** [PRESTATAIRE] Crée un package combinant plusieurs services (ex: forfait bilan santé) */
export async function creerPackage(utilisateurId: string, input: CreerPackageInput) {
  const prestataire = await obtenirPrestataireApprouve(utilisateurId);
  await verifierServicesDuPrestataire(input.serviceIds, prestataire.id);

  return prisma.packageService.create({
    data: {
      prestataireId: prestataire.id,
      nom: input.nom,
      description: input.description,
      prix: input.prix,
      devise: input.devise,
      services: {
        create: input.serviceIds.map((serviceId) => ({ serviceId })),
      },
    },
    include: { services: { include: { service: true } } },
  });
}

/** [PRESTATAIRE] Liste les packages de son établissement */
export async function listerMesPackages(utilisateurId: string) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) {
    throw new ErreurNonTrouve("Profil prestataire non trouvé");
  }
  return prisma.packageService.findMany({
    where: { prestataireId: prestataire.id },
    include: { services: { include: { service: true } } },
    orderBy: { creeLe: "desc" },
  });
}

/** [PRESTATAIRE] Modifie un package (vérifie la propriété) */
export async function modifierPackage(utilisateurId: string, packageId: string, input: ModifierPackageInput) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) {
    throw new ErreurNonTrouve("Profil prestataire non trouvé");
  }

  const pack = await prisma.packageService.findUnique({ where: { id: packageId } });
  if (!pack || pack.prestataireId !== prestataire.id) {
    throw new ErreurNonTrouve("Package non trouvé");
  }

  let donnees: any = {
    ...(input.nom !== undefined && { nom: input.nom }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.prix !== undefined && { prix: input.prix }),
    ...(input.devise !== undefined && { devise: input.devise }),
    ...(input.actif !== undefined && { actif: input.actif }),
  };

  // Si les services changent, on les remplace en transaction
  if (input.serviceIds) {
    await verifierServicesDuPrestataire(input.serviceIds, prestataire.id);
    return prisma.$transaction(async (tx) => {
      await tx.packageServiceItem.deleteMany({ where: { packageId: pack.id } });
      return tx.packageService.update({
        where: { id: pack.id },
        data: {
          ...donnees,
          services: { create: input.serviceIds!.map((serviceId) => ({ serviceId })) },
        },
        include: { services: { include: { service: true } } },
      });
    });
  }

  return prisma.packageService.update({
    where: { id: pack.id },
    data: donnees,
    include: { services: { include: { service: true } } },
  });
}

/** [PRESTATAIRE] Désactive un package (suppression logique) */
export async function supprimerPackage(utilisateurId: string, packageId: string) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) {
    throw new ErreurNonTrouve("Profil prestataire non trouvé");
  }

  const pack = await prisma.packageService.findUnique({ where: { id: packageId } });
  if (!pack || pack.prestataireId !== prestataire.id) {
    throw new ErreurNonTrouve("Package non trouvé");
  }

  await prisma.packageService.update({ where: { id: packageId }, data: { actif: false } });
  return { supprime: true };
}

/** Public : liste les packages actifs (d'un prestataire si précisé) */
export async function listerPackagesPublics(prestataireId?: string) {
  return prisma.packageService.findMany({
    where: { actif: true, ...(prestataireId ? { prestataireId } : {}) },
    include: {
      prestataire: { select: { id: true, nomEntreprise: true, ville: true, noteMoyenne: true, nombreAvis: true } },
      services: { include: { service: true } },
    },
    orderBy: { prix: "asc" },
  });
}

/** Public : détail d'un package actif */
export async function obtenirPackagePublic(packageId: string) {
  const pack = await prisma.packageService.findUnique({
    where: { id: packageId },
    include: {
      prestataire: true,
      services: { include: { service: { include: { prestataire: true } } } },
    },
  });
  if (!pack || !pack.actif) {
    throw new ErreurNonTrouve("Package non trouvé");
  }
  return pack;
}
