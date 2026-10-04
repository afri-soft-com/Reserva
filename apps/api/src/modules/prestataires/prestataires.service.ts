import { prisma } from "../../config/prisma";
import { ErreurValidation, ErreurNonTrouve, ErreurInterdit } from "../../utils/erreurs";
import { CreerPrestataireInput, ModifierPrestataireInput, ValiderPrestataireInput, CreerServiceOffertInput, ModifierServiceOffertInput } from "./prestataires.schema";
import { attribuerPlanGratuit, verifierQuotaServices } from "../economie/economie.service";

/** Crée un profil prestataire pour l'utilisateur connecté (passe son rôle à PRESTATAIRE en attente de validation) */
export async function creerProfilPrestataire(utilisateurId: string, input: CreerPrestataireInput) {
  const profilExistant = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (profilExistant) {
    throw new ErreurValidation("Vous avez déjà un profil prestataire");
  }

  const prestataire = await prisma.prestataire.create({
    data: {
      utilisateurId,
      ...input,
      statut: "EN_ATTENTE_VALIDATION",
    },
  });

  // Le rôle utilisateur passe à PRESTATAIRE — l'accès aux fonctionnalités reste néanmoins
  // limité tant que le statut n'est pas APPROUVE (vérifié au niveau des routes sensibles).
  await prisma.utilisateur.update({ where: { id: utilisateurId }, data: { role: "PRESTATAIRE" } });

  return prestataire;
}

/** Récupère le profil prestataire de l'utilisateur connecté */
export async function obtenirMonProfilPrestataire(utilisateurId: string) {
  const prestataire = await prisma.prestataire.findUnique({
    where: { utilisateurId },
    include: { services: true },
  });
  if (!prestataire) {
    throw new ErreurNonTrouve("Profil prestataire non trouvé");
  }
  return prestataire;
}

/** Met à jour le profil prestataire (par son propriétaire) */
export async function modifierProfilPrestataire(utilisateurId: string, input: ModifierPrestataireInput) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) {
    throw new ErreurNonTrouve("Profil prestataire non trouvé");
  }

  return prisma.prestataire.update({ where: { id: prestataire.id }, data: input });
}

/** [ADMIN] Liste les prestataires en attente de validation */
export async function listerPrestatairesEnAttente() {
  return prisma.prestataire.findMany({
    where: { statut: "EN_ATTENTE_VALIDATION" },
    include: { utilisateur: { select: { nom: true, telephone: true, email: true } } },
    orderBy: { creeLe: "asc" },
  });
}

/** [ADMIN] Approuve ou rejette un prestataire */
export async function validerPrestataire(input: ValiderPrestataireInput) {
  const prestataire = await prisma.prestataire.findUnique({ where: { id: input.prestataireId } });
  if (!prestataire) {
    throw new ErreurNonTrouve("Prestataire non trouvé");
  }

  if (input.approuver) {
    const approuve = await prisma.prestataire.update({
      where: { id: input.prestataireId },
      data: { statut: "APPROUVE", motifRejet: null },
    });
    await attribuerPlanGratuit(approuve.id).catch(() => {});
    return approuve;
  }

  if (!input.motifRejet) {
    throw new ErreurValidation("Un motif de rejet est requis lorsque la demande n'est pas approuvée");
  }

  return prisma.prestataire.update({
    where: { id: input.prestataireId },
    data: { statut: "REJETE", motifRejet: input.motifRejet },
  });
}

/** Recherche de prestataires approuvés à proximité (bounding box simplifié) */
export async function listerPrestatairesProches(params: {
  latitude: number;
  longitude: number;
  rayonKm?: number;
  categorie?: string;
  ville?: string;
}) {
  const { latitude, longitude, rayonKm = 10, categorie, ville } = params;
  // 1 degré ≈ 111 km ; on calcule une bounding box
  const delta = rayonKm / 111;
  const where: any = {
    statut: "APPROUVE",
    latitude: { gte: latitude - delta, lte: latitude + delta },
    longitude: { gte: longitude - delta, lte: longitude + delta },
  };
  if (categorie) where.categorie = categorie;
  if (ville) where.ville = ville;

  return prisma.prestataire.findMany({
    where,
    include: { utilisateur: { select: { nom: true, telephone: true, photoUrl: true } }, services: true },
    orderBy: { noteMoyenne: "desc" },
  });
}

/** Vérifie que le prestataire est bien approuvé — utilisé avant toute action sensible (créer un créneau, etc.) */
async function exigerPrestataireApprouve(utilisateurId: string) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) {
    throw new ErreurNonTrouve("Profil prestataire non trouvé");
  }
  if (prestataire.statut !== "APPROUVE") {
    throw new ErreurInterdit(
      "Votre profil prestataire doit être approuvé par l'équipe RESERVA avant de pouvoir proposer des services"
    );
  }
  return prestataire;
}

/** Crée un nouveau service proposé par le prestataire connecté */
export async function creerServiceOffert(utilisateurId: string, input: CreerServiceOffertInput) {
  const prestataire = await exigerPrestataireApprouve(utilisateurId);
  await verifierQuotaServices(prestataire.id);

  return prisma.serviceOffert.create({
    data: { ...input, prestataireId: prestataire.id },
  });
}

/** Modifie un service existant (vérifie la propriété) */
export async function modifierServiceOffert(utilisateurId: string, serviceId: string, input: ModifierServiceOffertInput) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) {
    throw new ErreurNonTrouve("Profil prestataire non trouvé");
  }

  const service = await prisma.serviceOffert.findUnique({ where: { id: serviceId } });
  if (!service || service.prestataireId !== prestataire.id) {
    throw new ErreurNonTrouve("Service non trouvé");
  }

  return prisma.serviceOffert.update({ where: { id: serviceId }, data: input });
}

/** Liste les services du prestataire connecté */
export async function listerMesServices(utilisateurId: string) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) {
    throw new ErreurNonTrouve("Profil prestataire non trouvé");
  }
  return prisma.serviceOffert.findMany({ where: { prestataireId: prestataire.id }, orderBy: { creeLe: "desc" } });
}

/** Tableau de bord prestataire : réservations du jour, statistiques de base */
/** Retourne l'abonnement actif du prestataire avec les détails du plan */
export async function obtenirMonAbonnement(utilisateurId: string) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) throw new ErreurNonTrouve("Profil prestataire non trouvé");
  const abonnement = await prisma.abonnementPrestataire.findFirst({
    where: { prestataireId: prestataire.id, statut: "ACTIF" },
    include: { plan: true },
    orderBy: { dateDebut: "desc" },
  });
  if (!abonnement) return { abonnement: null, message: "Aucun abonnement actif" };
  return { abonnement };
}

export async function obtenirTableauDeBord(utilisateurId: string) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) {
    throw new ErreurNonTrouve("Profil prestataire non trouvé");
  }

  const debutJour = new Date();
  debutJour.setHours(0, 0, 0, 0);
  const finJour = new Date();
  finJour.setHours(23, 59, 59, 999);

  const finProchaines7Jours = new Date();
  finProchaines7Jours.setDate(finProchaines7Jours.getDate() + 7);
  finProchaines7Jours.setHours(23, 59, 59, 999);

  const debutSemaine = new Date();
  debutSemaine.setDate(debutSemaine.getDate() - debutSemaine.getDay());
  debutSemaine.setHours(0, 0, 0, 0);

  const debutMois = new Date();
  debutMois.setDate(1);
  debutMois.setHours(0, 0, 0, 0);

  const debutAn = new Date();
  debutAn.setMonth(0, 1);
  debutAn.setHours(0, 0, 0, 0);

  const [reservationsAujourdhui, totalSemaine, totalMois, revenusMois, enAttenteCount,
    reservationsParService, revenusParService, tousCreneauxMois, revenusAnnuels,
    meilleurMois, revenusMoisPrecedent, prochainesReservations] = await Promise.all([
    prisma.reservation.findMany({
      where: { prestataireId: prestataire.id, creneau: { debut: { gte: debutJour, lte: finJour } } },
      include: { client: { select: { nom: true, telephone: true } }, service: true, creneau: true },
      orderBy: { creneau: { debut: "asc" } },
    }),
    prisma.reservation.count({
      where: { prestataireId: prestataire.id, creneau: { debut: { gte: debutSemaine } } },
    }),
    prisma.reservation.count({
      where: { prestataireId: prestataire.id, creneau: { debut: { gte: debutMois } } },
    }),
    prisma.reservation.aggregate({
      where: { prestataireId: prestataire.id, statutPaiement: "PAYE", creneau: { debut: { gte: debutMois } } },
      _sum: { montantPaye: true },
    }),
    prisma.reservation.count({
      where: { prestataireId: prestataire.id, statut: "EN_ATTENTE" },
    }),
    prisma.reservation.groupBy({
      by: ["serviceId"],
      where: { prestataireId: prestataire.id, creneau: { debut: { gte: debutMois } } },
      _count: true,
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.reservation.groupBy({
      by: ["serviceId"],
      where: { prestataireId: prestataire.id, statutPaiement: "PAYE", creneau: { debut: { gte: debutMois } } },
      _sum: { montantPaye: true },
    }),
    prisma.creneau.findMany({
      where: { service: { prestataireId: prestataire.id }, debut: { gte: debutMois, lte: finJour } },
    }),
    prisma.reservation.aggregate({
      where: { prestataireId: prestataire.id, statutPaiement: "PAYE", creneau: { debut: { gte: debutAn } } },
      _sum: { montantPaye: true },
    }),
    prisma.reservation.groupBy({
      by: ["serviceId"],
      where: { prestataireId: prestataire.id, creneau: { debut: { gte: debutMois } } },
      _count: true,
      orderBy: { _count: { id: "desc" } },
      take: 1,
    }),
    prisma.reservation.aggregate({
      where: { prestataireId: prestataire.id, statutPaiement: "PAYE", creneau: { debut: { gte: debutMoisPrecedent(), lt: debutMois } } },
      _sum: { montantPaye: true },
    }),
    prisma.reservation.findMany({
      where: {
        prestataireId: prestataire.id,
        creneau: { debut: { gt: finJour, lte: finProchaines7Jours } },
        statut: { notIn: ["ANNULEE", "REFUSEE", "TERMINEE"] },
      },
      include: { client: { select: { nom: true, telephone: true } }, service: true, creneau: true },
      orderBy: { creneau: { debut: "asc" } },
    }),
  ]);

  // Calcul du taux d'occupation
  const capaciteTotale = tousCreneauxMois.reduce((s, c) => s + c.capaciteTotale, 0);
  const capaciteReservee = tousCreneauxMois.reduce((s, c) => s + c.capaciteReservee, 0);
  const tauxOccupation = capaciteTotale > 0 ? (capaciteReservee / capaciteTotale) * 100 : 0;

  // Services populaires
  const servicesPopulaires = await Promise.all(
    reservationsParService.slice(0, 5).map(async (rs) => {
      const service = await prisma.serviceOffert.findUnique({ where: { id: rs.serviceId } });
      const revenu = revenusParService.find((r) => r.serviceId === rs.serviceId);
      return {
        serviceId: rs.serviceId,
        nom: service?.nom ?? "Inconnu",
        reservations: rs._count,
        revenus: revenu?._sum.montantPaye ?? 0,
      };
    })
  );

  // Répartition par statut
  const parStatut = await prisma.reservation.groupBy({
    by: ["statut"],
    where: { prestataireId: prestataire.id },
    _count: true,
  });

  // Évolution mensuelle (6 derniers mois)
  const evolution = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    const fin = new Date(d);
    fin.setMonth(fin.getMonth() + 1);
    const stats = await prisma.reservation.aggregate({
      where: { prestataireId: prestataire.id, statutPaiement: "PAYE", creneau: { debut: { gte: d, lt: fin } } },
      _sum: { montantPaye: true },
      _count: true,
    });
    evolution.push({
      mois: d.toLocaleDateString("fr-FR", { month: "short", year: "numeric" }),
      revenus: stats._sum.montantPaye ?? 0,
      reservations: stats._count,
    });
  }

  return {
    reservationsAujourdhui,
    prochainesReservations,
    statistiques: {
      totalReservationsSemaine: totalSemaine,
      totalReservationsMois: totalMois,
      revenusMoisEnCours: revenusMois._sum.montantPaye ?? 0,
      revenusAnnuels: revenusAnnuels._sum.montantPaye ?? 0,
      reservationsEnAttenteAction: enAttenteCount,
      noteMoyenne: prestataire.noteMoyenne,
      nombreAvis: prestataire.nombreAvis,
      tauxOccupation: Math.round(tauxOccupation * 10) / 10,
      meilleurMois: meilleurMois.length > 0 ? meilleurMois[0]._count : 0,
      evolutionMensuelle: evolution,
      evolutionMoisPrecedent: revenusMoisPrecedent._sum.montantPaye ?? 0,
    },
    servicesPopulaires,
    parStatut,
  };
}

function debutMoisPrecedent(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * [PRESTATAIRE] Calendrier visuel : tous les créneaux d'un mois pour les services du prestataire,
 * chacun avec les réservations associées (client, statut, numéro).
 */
export async function obtenirCalendrier(utilisateurId: string, mois?: string) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) {
    throw new ErreurNonTrouve("Profil prestataire non trouvé");
  }

  const maintenant = new Date();
  const debutMois = mois ? new Date(`${mois}-01T00:00:00.000Z`) : new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
  const finMois = new Date(debutMois);
  finMois.setMonth(finMois.getMonth() + 1);

  const creneaux = await prisma.creneau.findMany({
    where: {
      service: { prestataireId: prestataire.id },
      debut: { gte: debutMois, lt: finMois },
    },
    include: {
      service: { select: { id: true, nom: true, prix: true, devise: true } },
      reservations: {
        select: {
          id: true,
          numero: true,
          statut: true,
          statutPaiement: true,
          montantPaye: true,
          client: { select: { nom: true, telephone: true } },
        },
      },
    },
    orderBy: { debut: "asc" },
  });

  const jours: Record<string, any[]> = {};
  for (const creneau of creneaux) {
    const cle = creneau.debut.toISOString().slice(0, 10);
    if (!jours[cle]) jours[cle] = [];
    jours[cle].push({
      id: creneau.id,
      debut: creneau.debut.toISOString(),
      fin: creneau.fin.toISOString(),
      capaciteTotale: creneau.capaciteTotale,
      capaciteReservee: creneau.capaciteReservee,
      service: creneau.service,
      reservations: creneau.reservations,
    });
  }

  // Périodes bloquées par le prestataire sur ce mois (journées entières ou par service)
  const periodesBloquees = await prisma.periodeIndisponible.findMany({
    where: {
      prestataireId: prestataire.id,
      dateDebut: { lt: finMois },
      dateFin: { gt: debutMois },
    },
    include: { service: { select: { id: true, nom: true } } },
    orderBy: { dateDebut: "asc" },
  });

  return {
    mois: `${debutMois.getFullYear()}-${String(debutMois.getMonth() + 1).padStart(2, "0")}`,
    totalCreneaux: creneaux.length,
    totalReservations: creneaux.reduce((s, c) => s + c.reservations.length, 0),
    jours,
    periodesBloquees: periodesBloquees.map((p) => ({
      id: p.id,
      dateDebut: p.dateDebut.toISOString(),
      dateFin: p.dateFin.toISOString(),
      motif: p.motif,
      service: p.service,
    })),
  };
}

/**
 * [PRESTATAIRE] Statistiques détaillées : activité sur les 30 derniers jours,
 * répartition par service/statut, distribution des notes et top clients.
 */
export async function obtenirStatistiquesDetaillees(utilisateurId: string) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) {
    throw new ErreurNonTrouve("Profil prestataire non trouvé");
  }

  const debutMois = new Date();
  debutMois.setDate(1);
  debutMois.setHours(0, 0, 0, 0);
  const finMois = new Date(debutMois);
  finMois.setMonth(finMois.getMonth() + 1);

  const debut30 = new Date();
  debut30.setDate(debut30.getDate() - 29);
  debut30.setHours(0, 0, 0, 0);

  const [reservations30, parStatut, avisListe, parServiceCount, revenusParService, services, topClientsGroup, totalCount, annuleCount] = await Promise.all([
    prisma.reservation.findMany({
      where: { prestataireId: prestataire.id, creneau: { debut: { gte: debut30 } } },
      select: { montantPaye: true, statutPaiement: true, creneau: { select: { debut: true } } },
    }),
    prisma.reservation.groupBy({
      by: ["statut"],
      where: { prestataireId: prestataire.id },
      _count: true,
    }),
    prisma.avis.findMany({
      where: { prestataireId: prestataire.id },
      select: { note: true },
    }),
    prisma.reservation.groupBy({
      by: ["serviceId"],
      where: { prestataireId: prestataire.id, creneau: { debut: { gte: debutMois } } },
      _count: true,
    }),
    prisma.reservation.groupBy({
      by: ["serviceId"],
      where: { prestataireId: prestataire.id, statutPaiement: "PAYE", creneau: { debut: { gte: debutMois } } },
      _sum: { montantPaye: true },
    }),
    prisma.serviceOffert.findMany({
      where: { prestataireId: prestataire.id },
      select: { id: true, nom: true },
    }),
    prisma.reservation.groupBy({
      by: ["clientId"],
      where: { prestataireId: prestataire.id },
      _count: true,
      _sum: { montantPaye: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
    prisma.reservation.count({ where: { prestataireId: prestataire.id } }),
    prisma.reservation.count({ where: { prestataireId: prestataire.id, statut: "ANNULEE" } }),
  ]);

  // Activité jour par jour sur les 30 derniers jours
  const parJour: { date: string; reservations: number; revenus: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const jour = new Date();
    jour.setDate(jour.getDate() - i);
    jour.setHours(0, 0, 0, 0);
    const finJour = new Date(jour);
    finJour.setHours(23, 59, 59, 999);
    const duJour = reservations30.filter((r) => {
      const d = r.creneau.debut;
      return d >= jour && d <= finJour;
    });
    parJour.push({
      date: jour.toISOString().slice(0, 10),
      reservations: duJour.length,
      revenus: duJour.reduce((s, r) => s + (r.statutPaiement === "PAYE" ? r.montantPaye : 0), 0),
    });
  }

  // Répartition par service (mois courant)
  const parService = parServiceCount.map((ps) => {
    const service = services.find((s) => s.id === ps.serviceId);
    const revenu = revenusParService.find((r) => r.serviceId === ps.serviceId);
    return {
      serviceId: ps.serviceId,
      nom: service?.nom ?? "Inconnu",
      reservations: ps._count,
      revenus: revenu?._sum.montantPaye ?? 0,
    };
  });

  // Distribution des notes
  const repartitionNotes = [1, 2, 3, 4, 5].map((note) => ({
    note,
    nombre: avisListe.filter((a) => a.note === note).length,
  }));

  // Meilleurs clients
  const clients = await prisma.utilisateur.findMany({
    where: { id: { in: topClientsGroup.map((t) => t.clientId) } },
    select: { id: true, nom: true, telephone: true },
  });
  const topClients = topClientsGroup.map((t) => ({
    clientId: t.clientId,
    nom: clients.find((c) => c.id === t.clientId)?.nom ?? "Client",
    telephone: clients.find((c) => c.id === t.clientId)?.telephone ?? "",
    reservations: t._count,
    totalDepense: t._sum.montantPaye ?? 0,
  }));

  return {
    noteMoyenne: prestataire.noteMoyenne,
    nombreAvis: prestataire.nombreAvis,
    totalReservations: totalCount,
    tauxAnnulation: totalCount > 0 ? Math.round((annuleCount / totalCount) * 1000) / 10 : 0,
    parJour,
    parService,
    parStatut,
    repartitionNotes,
    topClients,
  };
}
