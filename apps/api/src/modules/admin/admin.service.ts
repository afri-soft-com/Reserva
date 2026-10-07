import { prisma } from "../../config/prisma";

export interface FiltresStatistiques {
  periode?: string; // mois | trimestre | annee | tout
  ville?: string;
  categorie?: string;
}

function construireFiltres(filtres?: FiltresStatistiques) {
  const maintenant = new Date();
  const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
  const debutSemaine = new Date(maintenant);
  debutSemaine.setDate(debutSemaine.getDate() - debutSemaine.getDay());
  debutSemaine.setHours(0, 0, 0, 0);

  const filtrePrestataire: { ville?: string; categorie?: string } = {};
  if (filtres?.ville) filtrePrestataire.ville = filtres.ville;
  if (filtres?.categorie) filtrePrestataire.categorie = filtres.categorie;

  const filtreActif = filtrePrestataire.ville !== undefined || filtrePrestataire.categorie !== undefined;
  const wherePrestataire = filtreActif ? { prestataire: filtrePrestataire } : {};

  let debutPeriode: Date | null = null;
  const periode = filtres?.periode ?? "mois";
  if (periode === "semaine") debutPeriode = debutSemaine;
  else if (periode === "mois") debutPeriode = debutMois;
  else if (periode === "trimestre") {
    debutPeriode = new Date(maintenant);
    debutPeriode.setDate(debutPeriode.getDate() - 90);
    debutPeriode.setHours(0, 0, 0, 0);
  } else if (periode === "annee") {
    debutPeriode = new Date(maintenant.getFullYear(), 0, 1);
  }

  const filtreDates = debutPeriode ? { creeLe: { gte: debutPeriode } } : {};
  const baseWhere = { ...wherePrestataire, ...filtreDates };
  const libellePeriode =
    periode === "semaine" ? "Cette semaine"
    : periode === "mois" ? "Ce mois-ci"
    : periode === "trimestre" ? "90 derniers jours"
    : periode === "annee" ? "Cette année"
    : "Toute la période";

  return { maintenant, debutMois, debutSemaine, filtrePrestataire, wherePrestataire, filtreDates, baseWhere, libellePeriode };
}

export async function obtenirStatistiquesPlateforme(filtres?: FiltresStatistiques) {
  const { maintenant, debutMois, debutSemaine, filtrePrestataire, wherePrestataire, filtreDates, baseWhere, libellePeriode } = construireFiltres(filtres);

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
    prisma.prestataire.count({ where: filtrePrestataire }),
    prisma.reservation.count({ where: baseWhere }),
    prisma.reservation.count({ where: { ...baseWhere, creeLe: { gte: debutMois } } }),
    prisma.reservation.count({ where: { ...baseWhere, creeLe: { gte: debutSemaine } } }),
    prisma.prestataire.count({ where: { ...filtrePrestataire, statut: "EN_ATTENTE_VALIDATION" } }),
    prisma.prestataire.count({ where: { ...filtrePrestataire, statut: "APPROUVE" } }),
    prisma.reservation.aggregate({
      where: { ...baseWhere, statutPaiement: { in: ["PAYE", "PARTIEL"] } },
      _sum: { montantPaye: true, montantCommission: true, montantFraisService: true },
    }),
    prisma.reservation.groupBy({ by: ["statut"], where: baseWhere, _count: true }),
    prisma.utilisateur.count({ where: filtreDates }),
  ]);

  const repartitionStatuts: Record<string, number> = {};
  for (const groupe of reservationsParStatut) {
    repartitionStatuts[groupe.statut] = groupe._count;
  }

  const nbMois = (filtres?.periode ?? "mois") === "annee" ? 12 : 6;
  const evolution = [];
  for (let i = nbMois - 1; i >= 0; i--) {
    const d = new Date(maintenant.getFullYear(), maintenant.getMonth() - i, 1);
    d.setHours(0, 0, 0, 0);
    const fin = new Date(d);
    fin.setMonth(fin.getMonth() + 1);
    const stats = await prisma.reservation.aggregate({
      where: { ...wherePrestataire, statutPaiement: "PAYE", creeLe: { gte: d, lt: fin } },
      _sum: { montantPaye: true },
      _count: true,
    });
    const count = await prisma.reservation.count({
      where: { ...wherePrestataire, creeLe: { gte: d, lt: fin } },
    });
    evolution.push({
      mois: d.toLocaleDateString("fr-FR", { month: "short", year: "numeric" }),
      revenus: stats._sum.montantPaye ?? 0,
      reservations: count,
      reservationsPayees: stats._count,
    });
  }

  return {
    periode: libellePeriode,
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
      gmv: revenusMois._sum.montantPaye ?? 0,
      commissions: revenusMois._sum.montantCommission ?? 0,
      fraisService: revenusMois._sum.montantFraisService ?? 0,
      plateforme: (revenusMois._sum.montantCommission ?? 0) + (revenusMois._sum.montantFraisService ?? 0),
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

export async function listerTousUtilisateurs(
  page = 1,
  parPage = 20,
  opts?: { recherche?: string }
) {
  const skip = (page - 1) * parPage;
  const where: Record<string, unknown> = {};
  if (opts?.recherche?.trim()) {
    const q = opts.recherche.trim();
    where.OR = [
      { nom: { contains: q } },
      { telephone: { contains: q } },
      { email: { contains: q } },
    ];
  }
  const [items, total] = await Promise.all([
    prisma.utilisateur.findMany({
      where,
      skip,
      take: parPage,
      select: {
        id: true,
        nom: true,
        telephone: true,
        email: true,
        role: true,
        langue: true,
        telephoneVerifie: true,
        commissionAgentPourcent: true,
        creeLe: true,
      },
      orderBy: { creeLe: "desc" },
    }),
    prisma.utilisateur.count({ where }),
  ]);
  return { items, total, page, parPage, totalPages: Math.ceil(total / parPage) };
}

export async function listerReservationsAdmin(params: {
  page?: number;
  parPage?: number;
  statut?: string;
  statutPaiement?: string;
  recherche?: string;
}) {
  const page = params.page ?? 1;
  const parPage = params.parPage ?? 20;
  const skip = (page - 1) * parPage;
  const where: Record<string, unknown> = {};
  if (params.statut) where.statut = params.statut;
  if (params.statutPaiement) where.statutPaiement = params.statutPaiement;
  if (params.recherche?.trim()) {
    const q = params.recherche.trim();
    where.OR = [
      { numero: { contains: q } },
      { client: { nom: { contains: q } } },
      { client: { telephone: { contains: q } } },
      { prestataire: { nomEntreprise: { contains: q } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      skip,
      take: parPage,
      orderBy: { creeLe: "desc" },
      include: {
        client: { select: { nom: true, telephone: true } },
        prestataire: { select: { nomEntreprise: true, ville: true, categorie: true } },
        service: { select: { nom: true } },
        creneau: { select: { debut: true, fin: true } },
      },
    }),
    prisma.reservation.count({ where }),
  ]);

  return { items, total, page, parPage, totalPages: Math.ceil(total / parPage) || 1 };
}

export async function obtenirPilotageAdmin() {
  const maintenant = new Date();
  const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
  const [
    stats,
    prestatairesEnAttente,
    versementsEnAttente,
    reservationsRecentes,
    abonnementsExpirant,
    paiementsEnAttente,
  ] = await Promise.all([
    obtenirStatistiquesPlateforme({ periode: "mois" }),
    prisma.prestataire.findMany({
      where: {
        OR: [
          { statut: "EN_ATTENTE_VALIDATION" },
          { kycStatut: { in: ["EN_REVUE", "INFO_MANQUANTE"] } },
        ],
      },
      take: 8,
      orderBy: { creeLe: "desc" },
      select: {
        id: true,
        nomEntreprise: true,
        ville: true,
        categorie: true,
        creeLe: true,
        statut: true,
        kycStatut: true,
        utilisateur: { select: { telephone: true, nom: true } },
      },
    }),
    prisma.versementPrestataire.findMany({
      where: { statut: "DEMANDE" },
      take: 8,
      orderBy: { demandeLe: "desc" },
      include: { prestataire: { select: { nomEntreprise: true } } },
    }),
    prisma.reservation.findMany({
      take: 8,
      orderBy: { creeLe: "desc" },
      include: {
        client: { select: { nom: true } },
        prestataire: { select: { nomEntreprise: true } },
        service: { select: { nom: true } },
      },
    }),
    prisma.abonnementPrestataire.findMany({
      where: {
        statut: "ACTIF",
        dateFin: {
          gte: maintenant,
          lte: new Date(maintenant.getTime() + 14 * 24 * 60 * 60 * 1000),
        },
      },
      take: 8,
      orderBy: { dateFin: "asc" },
      include: {
        plan: { select: { nom: true } },
        prestataire: { select: { nomEntreprise: true } },
      },
    }),
    prisma.reservation.count({
      where: { statutPaiement: "EN_ATTENTE", creeLe: { gte: debutMois } },
    }),
  ]);

  return {
    stats,
    alertes: {
      prestatairesEnAttente: prestatairesEnAttente.length,
      versementsEnAttente: versementsEnAttente.length,
      abonnementsExpirant: abonnementsExpirant.length,
      paiementsEnAttente,
    },
    files: {
      prestatairesEnAttente,
      versementsEnAttente,
      reservationsRecentes,
      abonnementsExpirant,
    },
  };
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

/** Génère un rapport PDF des statistiques de la plateforme (filtrable par période, ville et catégorie) */
export async function genererStatistiquesPdf(filtres?: FiltresStatistiques): Promise<Buffer> {
  const stats = await obtenirStatistiquesPlateforme(filtres);

  const PDFDocument = require("pdfkit");
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const buffers: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => buffers.push(chunk));

  const bleu = "#1A56DB";
  const gris = "#6B7280";
  const deviseSymbole = "FC";

  doc.font("Helvetica-Bold").fontSize(24).fillColor(bleu).text("RESERVA", { align: "center" });
  doc.font("Helvetica").fontSize(10).fillColor(gris).text("Rapport de statistiques — Réservez. Sereinement.", { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(8).fillColor(gris).text(`Période : ${stats.periode} | Généré le ${new Date().toLocaleString("fr-FR")}`, { align: "center" });
  if (filtres?.ville || filtres?.categorie) {
    const libelleFiltres = [filtres?.categorie ? `Catégorie : ${filtres.categorie}` : "", filtres?.ville ? `Ville : ${filtres.ville}` : ""]
      .filter(Boolean).join(" · ");
    doc.fontSize(8).fillColor(gris).text(libelleFiltres, { align: "center" });
  }
  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(bleu).lineWidth(2).stroke();
  doc.moveDown(0.5);

  const kpis: Array<[string, string]> = [
    ["Utilisateurs", String(stats.utilisateurs.total)],
    ["Prestataires", String(stats.prestataires.total)],
    ["Réservations", String(stats.reservations.total)],
    ["Revenus", `${Math.round(stats.revenus.ceMois)} ${deviseSymbole}`],
  ];
  const kpiTop = doc.y;
  const kpiCols = [50, 170, 290, 410];
  kpis.forEach((kpi, i) => {
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#0F2A5E").text(kpi[0], kpiCols[i], kpiTop);
    doc.font("Helvetica").fontSize(16).fillColor(bleu).text(kpi[1], kpiCols[i], kpiTop + 16);
  });
  doc.moveDown(2.2);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#E5E7EB").lineWidth(1).stroke();
  doc.moveDown(0.5);

  doc.font("Helvetica-Bold").fontSize(12).fillColor("#0F2A5E").text("Évolution mensuelle");
  doc.moveDown(0.3);
  const cols = [50, 200, 350, 450];
  const largeurs = [140, 140, 90, 90];
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#0F2A5E");
  const yEnTete = doc.y;
  ["Mois", "Réservations", "Réservations payées", "Revenus"].forEach((l, i) => doc.text(l, cols[i], yEnTete, { width: largeurs[i] }));
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#EBF2FF").lineWidth(1).stroke();
  doc.moveDown(0.3);
  for (const e of stats.evolution) {
    if (doc.y > 740) {
      doc.addPage();
      doc.moveDown(0.5);
    }
    const y = doc.y;
    doc.font("Helvetica").fontSize(9).fillColor("#1F2937");
    doc.text(e.mois, cols[0], y, { width: largeurs[0] });
    doc.text(String(e.reservations), cols[1], y, { width: largeurs[1] });
    doc.text(String(e.reservationsPayees), cols[2], y, { width: largeurs[2] });
    doc.text(`${Math.round(e.revenus)} ${deviseSymbole}`, cols[3], y, { width: largeurs[3] });
    doc.moveDown(0.5);
  }

  doc.moveDown(1);
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#0F2A5E").text("Réservations par statut");
  doc.moveDown(0.3);
  const parStatut = Object.entries(stats.reservations.parStatut);
  if (parStatut.length === 0) {
    doc.font("Helvetica").fontSize(9).fillColor(gris).text("Aucune réservation.", 50, doc.y);
  } else {
    const yStatut = doc.y;
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#0F2A5E").text("Statut", cols[0], yStatut);
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#0F2A5E").text("Nombre", cols[1], yStatut);
    doc.moveDown(0.5);
    for (const [statut, nombre] of parStatut) {
      const y = doc.y;
      doc.font("Helvetica").fontSize(9).fillColor("#1F2937");
      doc.text(statut, cols[0], y, { width: largeurs[0] });
      doc.text(String(nombre), cols[1], y, { width: largeurs[1] });
      doc.moveDown(0.5);
    }
  }

  doc.moveDown(2);
  doc.font("Helvetica").fontSize(8).fillColor("#9CA3AF").text(
    `RESERVA RDC — Rapport généré automatiquement. Fait à Kinshasa, le ${new Date().toLocaleDateString("fr-FR")}.`,
    { align: "center" }
  );

  doc.end();
  return new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(buffers)));
  });
}

/**
 * Génère et enregistre le rapport hebdomadaire (PDF) dans le dossier des rapports.
 * Conçu pour être déclenché chaque semaine par un cron externe (voir docs/cron.md).
 */
export async function genererRapportHebdomadaire() {
  const fs = await import("fs");
  const path = await import("path");

  const dossierRapports = path.join(process.cwd(), "rapports");
  fs.mkdirSync(dossierRapports, { recursive: true });

  const maintenant = new Date();
  const nomFichier = `rapport-hebdomadaire-${maintenant.toISOString().slice(0, 10)}.pdf`;
  const cheminComplet = path.join(dossierRapports, nomFichier);

  const pdf = await genererStatistiquesPdf({ periode: "semaine" });
  fs.writeFileSync(cheminComplet, pdf);

  return {
    fichier: nomFichier,
    chemin: cheminComplet,
    tailleOctets: pdf.length,
    genereLe: maintenant.toISOString(),
  };
}

/**
 * [CRON] Fait passer à "EXPIRE" tout abonnement dont la date de fin est dépassée.
 * Retourne le nombre d'abonnements expirés pour journalisation du scheduler.
 */
export async function expirerAbonnements() {
  const maintenant = new Date();

  const abonnementsExpires = await prisma.abonnementPrestataire.updateMany({
    where: { statut: "ACTIF", dateFin: { lt: maintenant } },
    data: { statut: "EXPIRE" },
  });

  return {
    expires: abonnementsExpires.count,
    traiteLe: maintenant.toISOString(),
  };
}

/** [ADMIN] Broadcast : délègue au service notifications (type SYSTEME) */
export async function broadcastNotifications(input: { titre: string; message: string; role?: string }) {
  const { broadcastNotifications: envoyer } = await import("../notifications/notifications.service");
  return envoyer(input);
}
