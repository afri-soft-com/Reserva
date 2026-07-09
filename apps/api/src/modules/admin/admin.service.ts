import { prisma } from "../../config/prisma";

export async function obtenirStatistiquesPlateforme() {
  const maintenant = new Date();
  const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
  const debutSemaine = new Date(maintenant);
  debutSemaine.setDate(debutSemaine.getDate() - debutSemaine.getDay());
  debutSemaine.setHours(0, 0, 0, 0);

  const [
    totalUtilisateurs,
    totalPrestataires,
    totalReservations,
    reservationsMois,
    reservationsSemaine,
    prestatairesEnAttente,
    prestatairesApprouves,
    revenusMois,
    reservationsParStatut,
    utilisateursMois,
  ] = await Promise.all([
    prisma.utilisateur.count(),
    prisma.prestataire.count(),
    prisma.reservation.count(),
    prisma.reservation.count({ where: { creeLe: { gte: debutMois } } }),
    prisma.reservation.count({ where: { creeLe: { gte: debutSemaine } } }),
    prisma.prestataire.count({ where: { statut: "EN_ATTENTE_VALIDATION" } }),
    prisma.prestataire.count({ where: { statut: "APPROUVE" } }),
    prisma.reservation.aggregate({
      where: { statutPaiement: "PAYE", creeLe: { gte: debutMois } },
      _sum: { montantPaye: true },
    }),
    prisma.reservation.groupBy({ by: ["statut"], _count: true }),
    prisma.utilisateur.count({ where: { creeLe: { gte: debutMois } } }),
  ]);

  const repartitionStatuts: Record<string, number> = {};
  for (const groupe of reservationsParStatut) {
    repartitionStatuts[groupe.statut] = groupe._count;
  }

  const evolution = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    const fin = new Date(d);
    fin.setMonth(fin.getMonth() + 1);
    const stats = await prisma.reservation.aggregate({
      where: { statutPaiement: "PAYE", creeLe: { gte: d, lt: fin } },
      _sum: { montantPaye: true },
      _count: true,
    });
    const count = await prisma.reservation.count({
      where: { creeLe: { gte: d, lt: fin } },
    });
    evolution.push({
      mois: d.toLocaleDateString("fr-FR", { month: "short", year: "numeric" }),
      revenus: stats._sum.montantPaye ?? 0,
      reservations: count,
      reservationsPayees: stats._count,
    });
  }

  return {
    utilisateurs: {
      total: totalUtilisateurs,
      nouveauxCeMois: utilisateursMois,
    },
    prestataires: {
      total: totalPrestataires,
      enAttente: prestatairesEnAttente,
      approuves: prestatairesApprouves,
    },
    reservations: {
      total: totalReservations,
      cetteSemaine: reservationsSemaine,
      ceMois: reservationsMois,
      parStatut: repartitionStatuts,
    },
    revenus: {
      ceMois: revenusMois._sum.montantPaye ?? 0,
    },
    evolution,
  };
}

export async function listerTousPrestataires(page = 1, parPage = 20) {
  const skip = (page - 1) * parPage;
  const [items, total] = await Promise.all([
    prisma.prestataire.findMany({
      skip,
      take: parPage,
      include: { utilisateur: { select: { nom: true, telephone: true, email: true, creeLe: true } } },
      orderBy: { creeLe: "desc" },
    }),
    prisma.prestataire.count(),
  ]);
  return { items, total, page, parPage, totalPages: Math.ceil(total / parPage) };
}

export async function listerTousUtilisateurs(page = 1, parPage = 20) {
  const skip = (page - 1) * parPage;
  const [items, total] = await Promise.all([
    prisma.utilisateur.findMany({
      skip,
      take: parPage,
      select: { id: true, nom: true, telephone: true, email: true, role: true, langue: true, telephoneVerifie: true, creeLe: true },
      orderBy: { creeLe: "desc" },
    }),
    prisma.utilisateur.count(),
  ]);
  return { items, total, page, parPage, totalPages: Math.ceil(total / parPage) };
}

export async function suspendrePrestataire(prestataireId: string) {
  const prestataire = await prisma.prestataire.findUnique({ where: { id: prestataireId } });
  if (!prestataire) throw new Error("Prestataire non trouvé");
  return prisma.prestataire.update({ where: { id: prestataireId }, data: { statut: "SUSPENDU" } });
}

// ---- Plans d'abonnement ----

export async function listerPlans(page = 1, parPage = 50) {
  const skip = (page - 1) * parPage;
  const [items, total] = await Promise.all([
    prisma.planAbonnement.findMany({ skip, take: parPage, orderBy: { prix: "asc" } }),
    prisma.planAbonnement.count(),
  ]);
  return { items, total, page, parPage, totalPages: Math.ceil(total / parPage) };
}

export async function creerPlan(donnees: {
  nom: string; description?: string; prix: number; devise?: string;
  dureeJours: number; maxServices?: number; commissionReduite?: number; fonctionnalites?: string;
}) {
  return prisma.planAbonnement.create({ data: donnees });
}

export async function modifierPlan(id: string, donnees: Partial<{
  nom: string; description: string; prix: number; devise: string;
  dureeJours: number; maxServices: number; commissionReduite: number; fonctionnalites: string; actif: boolean;
}>) {
  const plan = await prisma.planAbonnement.findUnique({ where: { id } });
  if (!plan) throw new Error("Plan d'abonnement non trouvé");
  return prisma.planAbonnement.update({ where: { id }, data: donnees });
}

export async function supprimerPlan(id: string) {
  const plan = await prisma.planAbonnement.findUnique({ where: { id } });
  if (!plan) throw new Error("Plan d'abonnement non trouvé");
  return prisma.planAbonnement.delete({ where: { id } });
}

// ---- Abonnements prestataire ----

export async function listerAbonnements(page = 1, parPage = 20) {
  const skip = (page - 1) * parPage;
  const [items, total] = await Promise.all([
    prisma.abonnementPrestataire.findMany({
      skip, take: parPage, orderBy: { creeLe: "desc" },
      include: {
        plan: { select: { nom: true, prix: true, devise: true, dureeJours: true } },
        prestataire: { select: { nomEntreprise: true, ville: true } },
      },
    }),
    prisma.abonnementPrestataire.count(),
  ]);
  return { items, total, page, parPage, totalPages: Math.ceil(total / parPage) };
}

export async function creerAbonnement(donnees: {
  prestataireId: string; planId: string; dateDebut: string; dateFin: string; statut?: string;
}) {
  return prisma.abonnementPrestataire.create({
    data: donnees,
    include: {
      plan: { select: { nom: true, prix: true, devise: true } },
      prestataire: { select: { nomEntreprise: true } },
    },
  });
}

// ---- Configuration tarification ----

export async function listerConfigurations(page = 1, parPage = 50) {
  const skip = (page - 1) * parPage;
  const [items, total] = await Promise.all([
    prisma.configurationTarification.findMany({ skip, take: parPage, orderBy: { cle: "asc" } }),
    prisma.configurationTarification.count(),
  ]);
  return { items, total, page, parPage, totalPages: Math.ceil(total / parPage) };
}

export async function creerOuModifierConfig(donnees: {
  cle: string; valeur: string; description?: string; type?: string; actif?: boolean;
}) {
  return prisma.configurationTarification.upsert({
    where: { cle: donnees.cle },
    update: { valeur: donnees.valeur, description: donnees.description, type: donnees.type, actif: donnees.actif },
    create: donnees,
  });
}

export async function supprimerConfig(id: string) {
  const config = await prisma.configurationTarification.findUnique({ where: { id } });
  if (!config) throw new Error("Configuration non trouvée");
  return prisma.configurationTarification.delete({ where: { id } });
}

function echapperCSV(valeur: unknown): string {
  if (valeur === null || valeur === undefined) return "";
  const str = String(valeur);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function exporterReservationsCSV(): Promise<string> {
  const lignes = [["ID", "Numéro", "Client", "Téléphone", "Service", "Prestataire", "Date", "Statut", "Paiement", "Montant", "Devise", "Réduction", "Créé le"]];
  const reservations = await prisma.reservation.findMany({
    include: { client: true, service: true, prestataire: true, creneau: true },
    orderBy: { creeLe: "desc" },
    take: 5000,
  });
  for (const r of reservations) {
    lignes.push([
      r.id, r.numero, r.client.nom, r.client.telephone,
      r.service.nom, r.prestataire.nomEntreprise,
      r.creneau.debut.toISOString(),
      r.statut, r.statutPaiement,
      String(r.montantTotal), r.devise, String(r.montantReduction ?? 0),
      r.creeLe.toISOString(),
    ].map(echapperCSV));
  }
  return lignes.map((l) => l.join(",")).join("\n");
}

async function exporterPrestatairesCSV(): Promise<string> {
  const lignes = [["ID", "Entreprise", "Catégorie", "Ville", "Quartier", "Statut", "Note", "Avis", "Créé le"]];
  const prestataires = await prisma.prestataire.findMany({
    orderBy: { creeLe: "desc" },
    take: 5000,
  });
  for (const p of prestataires) {
    lignes.push([
      p.id, p.nomEntreprise, p.categorie, p.ville, p.quartier,
      p.statut, String(p.noteMoyenne), String(p.nombreAvis),
      p.creeLe.toISOString(),
    ].map(echapperCSV));
  }
  return lignes.map((l) => l.join(",")).join("\n");
}

async function exporterUtilisateursCSV(): Promise<string> {
  const lignes = [["ID", "Nom", "Téléphone", "Email", "Rôle", "Langue", "Vérifié", "2FA", "Créé le"]];
  const utilisateurs = await prisma.utilisateur.findMany({
    orderBy: { creeLe: "desc" },
    take: 5000,
  });
  for (const u of utilisateurs) {
    lignes.push([
      u.id, u.nom, u.telephone, u.email ?? "",
      u.role, u.langue, String(u.telephoneVerifie), String(u.deuxFAActif ?? false),
      u.creeLe.toISOString(),
    ].map(echapperCSV));
  }
  return lignes.map((l) => l.join(",")).join("\n");
}

export async function genererExportCSV(type: string, _query: any): Promise<string> {
  switch (type) {
    case "reservations": return exporterReservationsCSV();
    case "prestataires": return exporterPrestatairesCSV();
    case "utilisateurs": return exporterUtilisateursCSV();
    default: throw new Error("Type d'export invalide. Types supportés : reservations, prestataires, utilisateurs");
  }
}
