import { prisma } from "../../config/prisma";
import { ErreurNonTrouve, ErreurValidation, ErreurInterdit, ErreurConflit } from "../../utils/erreurs";
import { RechercheServicesInput, CreerCreneauInput, calculerOffset } from "@reserva/shared";

/** Recherche publique de services â€” utilisÃ©e par les clients pour dÃ©couvrir des prestataires */
export async function rechercherServices(filtres: RechercheServicesInput) {
  const ou: any = {
    actif: true,
    prestataire: { statut: "APPROUVE" },
  };

  if (filtres.categorie) {
    ou.prestataire.categorie = filtres.categorie;
  }
  if (filtres.ville) {
    ou.prestataire.ville = { equals: filtres.ville };
  }
  if (filtres.quartier) {
    ou.prestataire.quartier = { contains: filtres.quartier };
  }
  if (filtres.texte) {
    ou.OR = [
      { nom: { contains: filtres.texte } },
      { description: { contains: filtres.texte } },
      { prestataire: { nomEntreprise: { contains: filtres.texte } } },
      { prestataire: { quartier: { contains: filtres.texte } } },
      { prestataire: { ville: { contains: filtres.texte } } },
      { prestataire: { description: { contains: filtres.texte } } },
    ];
  }
  if (filtres.prixMin || filtres.prixMax) {
    ou.prix = {};
    if (filtres.prixMin) ou.prix.gte = filtres.prixMin;
    if (filtres.prixMax) ou.prix.lte = filtres.prixMax;
  }
  if (filtres.noteMin) {
    ou.prestataire.noteMoyenne = { gte: filtres.noteMin };
  }
  // ProximitÃ© (carte) : bounding box simplifiÃ© sur les coordonnÃ©es du prestataire
  let rayonKm = filtres.rayonKm;
  if (filtres.latitude !== undefined && filtres.longitude !== undefined) {
    rayonKm = rayonKm ?? 10;
    const delta = rayonKm / 111;
    ou.prestataire.latitude = { gte: filtres.latitude - delta, lte: filtres.latitude + delta };
    ou.prestataire.longitude = { gte: filtres.longitude - delta, lte: filtres.longitude + delta };
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
            latitude: true,
            longitude: true,
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

  // Filtre les crÃ©neaux pleins et ne garde que le prochain crÃ©neau rÃ©ellement disponible par service
  let items = itemsBruts.map((service) => ({
    ...service,
    creneaux: service.creneaux.filter((c) => c.capaciteReservee < c.capaciteTotale).slice(0, 1),
  }));

  // Tri par distance (carte) : calcul fait en mÃ©moire car SQLite ne gÃ¨re pas le calcul gÃ©ographique
  if (filtres.tri === "distance_asc" && filtres.latitude !== undefined && filtres.longitude !== undefined) {
    items = items
      .map((service) => {
        const lat = service.prestataire.latitude;
        const lng = service.prestataire.longitude;
        const distanceKm = lat != null && lng != null
          ? calculerDistanceKm(filtres.latitude!, filtres.longitude!, lat, lng)
          : null;
        return { ...service, distanceKm };
      })
      .sort((a, b) => {
        if (a.distanceKm == null && b.distanceKm == null) return 0;
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });
  }

  return {
    items,
    total,
    page: filtres.page,
    parPage: filtres.parPage,
    totalPages: Math.ceil(total / filtres.parPage),
  };
}

/** Distance en km entre deux points (formule de Haversine) */
function calculerDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

/** RÃ©cupÃ¨re le dÃ©tail public d'un service (fiche prestataire + crÃ©neaux disponibles) */
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
    throw new ErreurNonTrouve("Service non trouvÃ©");
  }

  // N'expose que les crÃ©neaux ayant encore de la capacitÃ© disponible
  const creneauxDisponibles = service.creneaux.map((c) => ({
    ...c,
    disponible: c.capaciteReservee < c.capaciteTotale,
  }));

  // Avis rÃ©cents pour ce prestataire
  const avis = await prisma.avis.findMany({
    where: { prestataireId: service.prestataireId },
    include: {
      client: { select: { nom: true, photoUrl: true } },
      reservation: { select: { statut: true } },
    },
    orderBy: { creeLe: "desc" },
    take: 10,
  });

  // RÃ©partition des notes
  const repartitionNotes = await prisma.avis.groupBy({
    by: ["note"],
    where: { prestataireId: service.prestataireId },
    _count: true,
  });
  const notes = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of repartitionNotes) {
    notes[r.note as keyof typeof notes] = r._count;
  }

  // Services similaires (mÃªme catÃ©gorie, autre services du prestataire)
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
    avis: avis.map(formaterAvisPublic),
    repartitionNotes: notes,
    servicesSimilaires,
  };
}

/** Formate un avis public : dÃ©code les photos et expose le statut "vÃ©rifiÃ©" */
function formaterAvisPublic(avis: any) {
  let photosUrl: string[] = [];
  if (avis.photosUrl) {
    try {
      photosUrl = JSON.parse(avis.photosUrl);
    } catch {
      photosUrl = [];
    }
  }
  const { reservation, photosUrl: _photos, ...rest } = avis;
  return { ...rest, photosUrl, verifie: reservation?.statut === "TERMINEE" };
}

/** Liste les avis d'un prestataire (vue publique, paginÃ©e simplement) */
export async function listerAvisPrestataire(prestataireId: string) {
  const prestataire = await prisma.prestataire.findUnique({ where: { id: prestataireId } });
  if (!prestataire) {
    throw new ErreurNonTrouve("Prestataire non trouvÃ©");
  }

  const avis = await prisma.avis.findMany({
    where: { prestataireId },
    include: {
      client: { select: { nom: true, photoUrl: true } },
      reservation: { select: { statut: true } },
    },
    orderBy: { creeLe: "desc" },
    take: 50,
  });

  return avis.map(formaterAvisPublic);
}

/** [PRESTATAIRE] CrÃ©e un crÃ©neau de disponibilitÃ© pour un de ses services */
export async function creerCreneau(utilisateurId: string, input: CreerCreneauInput) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) {
    throw new ErreurNonTrouve("Profil prestataire non trouvÃ©");
  }

  const service = await prisma.serviceOffert.findUnique({ where: { id: input.serviceId } });
  if (!service || service.prestataireId !== prestataire.id) {
    throw new ErreurNonTrouve("Service non trouvÃ©");
  }

  const debut = new Date(input.debut);
  const fin = new Date(input.fin);

  if (fin <= debut) {
    throw new ErreurValidation("La date de fin doit Ãªtre aprÃ¨s la date de dÃ©but");
  }
  if (debut < new Date()) {
    throw new ErreurValidation("Impossible de crÃ©er un crÃ©neau dans le passÃ©");
  }

  // EmpÃªche le chevauchement de crÃ©neaux pour le mÃªme service
  const chevauchement = await prisma.creneau.findFirst({
    where: {
      serviceId: input.serviceId,
      OR: [{ debut: { lt: fin }, fin: { gt: debut } }],
    },
  });
  if (chevauchement) {
    throw new ErreurConflit("Ce crÃ©neau chevauche un crÃ©neau existant pour ce service");
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

/** [PRESTATAIRE] CrÃ©e plusieurs crÃ©neaux rÃ©currents en une fois (ex: tous les jours ouvrÃ©s Ã  9h, 10h, etc.) */
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
    throw new ErreurNonTrouve("Profil prestataire non trouvÃ©");
  }
  const service = await prisma.serviceOffert.findUnique({ where: { id: params.serviceId } });
  if (!service || service.prestataireId !== prestataire.id) {
    throw new ErreurNonTrouve("Service non trouvÃ©");
  }

  const joursExclus = params.joursExclus ?? [0]; // dimanche exclu par dÃ©faut
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
    throw new ErreurValidation("Aucun crÃ©neau valide Ã  crÃ©er sur cette pÃ©riode");
  }

  await prisma.creneau.createMany({ data: creneauxACreer });
  return { nombreCreneauxCrees: creneauxACreer.length };
}

/** Recommandations personnalisÃ©es basÃ©es sur l'historique des rÃ©servations de l'utilisateur */
export async function recommanderServices(utilisateurId: string, limite = 10) {
  // Trouve les catÃ©gories les plus rÃ©servÃ©es par l'utilisateur
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
    // RÃ©cupÃ¨re les catÃ©gories des prestataires frÃ©quentÃ©s
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

/** [PRESTATAIRE] Bloque (supprime) un crÃ©neau futur sans rÃ©servation */
export async function supprimerCreneau(utilisateurId: string, creneauId: string) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) {
    throw new ErreurNonTrouve("Profil prestataire non trouvÃ©");
  }

  const creneau = await prisma.creneau.findUnique({
    where: { id: creneauId },
    include: { service: true },
  });
  if (!creneau || creneau.service.prestataireId !== prestataire.id) {
    throw new ErreurNonTrouve("CrÃ©neau non trouvÃ©");
  }
  if (creneau.capaciteReservee > 0) {
    throw new ErreurInterdit("Impossible de supprimer un crÃ©neau ayant dÃ©jÃ  des rÃ©servations. Annulez d'abord les rÃ©servations concernÃ©es.");
  }

  await prisma.creneau.delete({ where: { id: creneauId } });
  return { supprime: true };
}

/** [PRESTATAIRE] Liste les crÃ©neaux d'un service donnÃ©, y compris passÃ©s (pour gestion) */
export async function listerCreneauxService(utilisateurId: string, serviceId: string) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) {
    throw new ErreurNonTrouve("Profil prestataire non trouvÃ©");
  }
  const service = await prisma.serviceOffert.findUnique({ where: { id: serviceId } });
  if (!service || service.prestataireId !== prestataire.id) {
    throw new ErreurNonTrouve("Service non trouvÃ©");
  }

  return prisma.creneau.findMany({
    where: { serviceId },
    orderBy: { debut: "asc" },
  });
}
