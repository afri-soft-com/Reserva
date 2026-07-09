import { prisma } from "../../config/prisma";
import { ErreurNonTrouve, ErreurValidation, ErreurInterdit, ErreurConflit } from "../../utils/erreurs";
import { RechercheServicesInput, CreerCreneauInput, calculerOffset } from "@reserva/shared";

/** Recherche publique de services — utilisée par les clients pour découvrir des prestataires */
export async function rechercherServices(filtres: RechercheServicesInput) {
  const ou: any = {
    actif: true,
    prestataire: { statut: "APPROUVE" },
  };

  if (filtres.categorie) {
    ou.prestataire.categorie = filtres.categorie;
  }
  if (filtres.ville) {
    ou.prestataire.ville = { equals: filtres.ville, mode: "insensitive" };
  }
  if (filtres.quartier) {
    ou.prestataire.quartier = { contains: filtres.quartier, mode: "insensitive" };
  }
  if (filtres.texte) {
    ou.OR = [
      { nom: { contains: filtres.texte, mode: "insensitive" } },
      { description: { contains: filtres.texte, mode: "insensitive" } },
      { prestataire: { nomEntreprise: { contains: filtres.texte, mode: "insensitive" } } },
      { prestataire: { quartier: { contains: filtres.texte, mode: "insensitive" } } },
      { prestataire: { ville: { contains: filtres.texte, mode: "insensitive" } } },
      { prestataire: { description: { contains: filtres.texte, mode: "insensitive" } } },
    ];
  }
  if (filtres.prixMin || filtres.prixMax) {
    ou.prix = {};
    if (filtres.prixMin) ou.prix.gte = filtres.prixMin;
    if (filtres.prixMax) ou.prix.lte = filtres.prixMax;
  }

  const offset = calculerOffset(filtres.page, filtres.parPage);

  // Tri
  let orderBy: any = { prestataire: { noteMoyenne: "desc" } };
  if (filtres.tri === "prix_asc") orderBy = { prix: "asc" };
  else if (filtres.tri === "prix_desc") orderBy = { prix: "desc" };
  else if (filtres.tri === "note_desc") orderBy = { prestataire: { noteMoyenne: "desc" } };
  else if (filtres.tri === "nom_asc") orderBy = { nom: "asc" };

  const [itemsBruts, total] = await Promise.all([
    prisma.serviceOffert.findMany({
      where: ou,
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
          take: 3,
        },
      },
      skip: offset,
      take: filtres.parPage,
      orderBy,
    }),
    prisma.serviceOffert.count({ where: ou }),
  ]);

  // Filtre les créneaux pleins et ne garde que le prochain créneau réellement disponible par service
  const items = itemsBruts.map((service) => ({
    ...service,
    creneaux: service.creneaux.filter((c) => c.capaciteReservee < c.capaciteTotale).slice(0, 1),
  }));

  return {
    items,
    total,
    page: filtres.page,
    parPage: filtres.parPage,
    totalPages: Math.ceil(total / filtres.parPage),
  };
}

/** Récupère le détail public d'un service (fiche prestataire + créneaux disponibles) */
export async function obtenirDetailService(serviceId: string) {
  const service = await prisma.serviceOffert.findUnique({
    where: { id: serviceId },
    include: {
      prestataire: true,
      creneaux: {
        where: { debut: { gte: new Date() } },
        orderBy: { debut: "asc" },
      },
    },
  });

  if (!service || !service.actif) {
    throw new ErreurNonTrouve("Service non trouvé");
  }

  // N'expose que les créneaux ayant encore de la capacité disponible
  const creneauxDisponibles = service.creneaux.map((c) => ({
    ...c,
    disponible: c.capaciteReservee < c.capaciteTotale,
  }));

  // Avis récents pour ce prestataire
  const avis = await prisma.avis.findMany({
    where: { prestataireId: service.prestataireId },
    include: { client: { select: { nom: true, photoUrl: true } } },
    orderBy: { creeLe: "desc" },
    take: 10,
  });

  // Répartition des notes
  const repartitionNotes = await prisma.avis.groupBy({
    by: ["note"],
    where: { prestataireId: service.prestataireId },
    _count: true,
  });
  const notes = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of repartitionNotes) {
    notes[r.note as keyof typeof notes] = r._count;
  }

  // Services similaires (même catégorie, autre services du prestataire)
  const servicesSimilaires = await prisma.serviceOffert.findMany({
    where: {
      prestataireId: service.prestataireId,
      id: { not: serviceId },
      actif: true,
    },
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
    },
    take: 5,
  });

  return {
    ...service,
    creneaux: creneauxDisponibles,
    avis,
    repartitionNotes: notes,
    servicesSimilaires,
  };
}

/** Liste les avis d'un prestataire (vue publique, paginée simplement) */
export async function listerAvisPrestataire(prestataireId: string) {
  const prestataire = await prisma.prestataire.findUnique({ where: { id: prestataireId } });
  if (!prestataire) {
    throw new ErreurNonTrouve("Prestataire non trouvé");
  }

  return prisma.avis.findMany({
    where: { prestataireId },
    include: { client: { select: { nom: true, photoUrl: true } } },
    orderBy: { creeLe: "desc" },
    take: 50,
  });
}

/** [PRESTATAIRE] Crée un créneau de disponibilité pour un de ses services */
export async function creerCreneau(utilisateurId: string, input: CreerCreneauInput) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) {
    throw new ErreurNonTrouve("Profil prestataire non trouvé");
  }

  const service = await prisma.serviceOffert.findUnique({ where: { id: input.serviceId } });
  if (!service || service.prestataireId !== prestataire.id) {
    throw new ErreurNonTrouve("Service non trouvé");
  }

  const debut = new Date(input.debut);
  const fin = new Date(input.fin);

  if (fin <= debut) {
    throw new ErreurValidation("La date de fin doit être après la date de début");
  }
  if (debut < new Date()) {
    throw new ErreurValidation("Impossible de créer un créneau dans le passé");
  }

  // Empêche le chevauchement de créneaux pour le même service
  const chevauchement = await prisma.creneau.findFirst({
    where: {
      serviceId: input.serviceId,
      OR: [{ debut: { lt: fin }, fin: { gt: debut } }],
    },
  });
  if (chevauchement) {
    throw new ErreurConflit("Ce créneau chevauche un créneau existant pour ce service");
  }

  return prisma.creneau.create({
    data: {
      serviceId: input.serviceId,
      debut,
      fin,
      capaciteTotale: input.capaciteTotale,
    },
  });
}

/** [PRESTATAIRE] Crée plusieurs créneaux récurrents en une fois (ex: tous les jours ouvrés à 9h, 10h, etc.) */
export async function creerCreneauxRecurrents(
  utilisateurId: string,
  params: {
    serviceId: string;
    dateDebut: string;
    dateFin: string;
    heuresCreneaux: string[]; // ex: ["09:00", "10:00", "14:00"]
    dureeMinutes: number;
    capaciteParCreneau: number;
    joursExclus?: number[]; // 0 = dimanche ... 6 = samedi
  }
) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) {
    throw new ErreurNonTrouve("Profil prestataire non trouvé");
  }
  const service = await prisma.serviceOffert.findUnique({ where: { id: params.serviceId } });
  if (!service || service.prestataireId !== prestataire.id) {
    throw new ErreurNonTrouve("Service non trouvé");
  }

  const joursExclus = params.joursExclus ?? [0]; // dimanche exclu par défaut
  const creneauxACreer: { serviceId: string; debut: Date; fin: Date; capaciteTotale: number }[] = [];

  const dateCourante = new Date(params.dateDebut);
  const dateFinPeriode = new Date(params.dateFin);

  while (dateCourante <= dateFinPeriode) {
    if (!joursExclus.includes(dateCourante.getDay())) {
      for (const heure of params.heuresCreneaux) {
        const [h, m] = heure.split(":").map(Number);
        const debut = new Date(dateCourante);
        debut.setHours(h, m, 0, 0);
        const fin = new Date(debut.getTime() + params.dureeMinutes * 60 * 1000);

        if (debut > new Date()) {
          creneauxACreer.push({ serviceId: params.serviceId, debut, fin, capaciteTotale: params.capaciteParCreneau });
        }
      }
    }
    dateCourante.setDate(dateCourante.getDate() + 1);
  }

  if (creneauxACreer.length === 0) {
    throw new ErreurValidation("Aucun créneau valide à créer sur cette période");
  }

  await prisma.creneau.createMany({ data: creneauxACreer });
  return { nombreCreneauxCrees: creneauxACreer.length };
}

/** Recommandations personnalisées basées sur l'historique des réservations de l'utilisateur */
export async function recommanderServices(utilisateurId: string, limite = 10) {
  // Trouve les catégories les plus réservées par l'utilisateur
  const categoriesReservees = await prisma.reservation.groupBy({
    by: ["prestataireId"],
    where: { clientId: utilisateurId },
    _count: true,
    orderBy: { _count: { prestataireId: "desc" } },
    take: 5,
  });

  const prestataireIds = categoriesReservees.map((r) => r.prestataireId);

  let ou: any = { actif: true, prestataire: { statut: "APPROUVE" } };

  if (prestataireIds.length > 0) {
    // Récupère les catégories des prestataires fréquentés
    const prestataires = await prisma.prestataire.findMany({
      where: { id: { in: prestataireIds } },
      select: { categorie: true },
    });
    const categories = [...new Set(prestataires.map((p) => p.categorie))];
    if (categories.length > 0) {
      ou.prestataire.categorie = { in: categories };
    }
  }

  const items = await prisma.serviceOffert.findMany({
    where: ou,
    include: {
      prestataire: {
        select: {
          id: true, nomEntreprise: true, categorie: true,
          ville: true, quartier: true, noteMoyenne: true, nombreAvis: true,
        },
      },
      creneaux: {
        where: { debut: { gte: new Date() } },
        orderBy: { debut: "asc" },
        take: 1,
      },
    },
    orderBy: { prestataire: { noteMoyenne: "desc" } },
    take: limite,
  });

  return items.map((s) => ({
    ...s,
    creneaux: s.creneaux.filter((c) => c.capaciteReservee < c.capaciteTotale),
  }));
}

/** [PRESTATAIRE] Bloque (supprime) un créneau futur sans réservation */
export async function supprimerCreneau(utilisateurId: string, creneauId: string) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) {
    throw new ErreurNonTrouve("Profil prestataire non trouvé");
  }

  const creneau = await prisma.creneau.findUnique({
    where: { id: creneauId },
    include: { service: true },
  });
  if (!creneau || creneau.service.prestataireId !== prestataire.id) {
    throw new ErreurNonTrouve("Créneau non trouvé");
  }
  if (creneau.capaciteReservee > 0) {
    throw new ErreurInterdit("Impossible de supprimer un créneau ayant déjà des réservations. Annulez d'abord les réservations concernées.");
  }

  await prisma.creneau.delete({ where: { id: creneauId } });
  return { supprime: true };
}

/** [PRESTATAIRE] Liste les créneaux d'un service donné, y compris passés (pour gestion) */
export async function listerCreneauxService(utilisateurId: string, serviceId: string) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) {
    throw new ErreurNonTrouve("Profil prestataire non trouvé");
  }
  const service = await prisma.serviceOffert.findUnique({ where: { id: serviceId } });
  if (!service || service.prestataireId !== prestataire.id) {
    throw new ErreurNonTrouve("Service non trouvé");
  }

  return prisma.creneau.findMany({
    where: { serviceId },
    orderBy: { debut: "asc" },
  });
}
