import { prisma } from "../../config/prisma";
import { ErreurNonTrouve, ErreurValidation, ErreurInterdit } from "../../utils/erreurs";
import {
  calculerTarificationReservation,
  normaliserPourcent,
  TarificationReservation,
} from "@reserva/shared";
import { initierPaiementMobileMoney } from "../paiements/mobilemoney.adapter";
import { OperateurMobileMoney } from "@reserva/shared";

export const CLES_TARIF = {
  COMMISSION_PRESTATAIRE: "COMMISSION_PRESTATAIRE",
  COMMISSION_CLIENT: "COMMISSION_CLIENT",
  FRAIS_SERVICE_SEUIL_USD: "FRAIS_SERVICE_SEUIL_USD",
  FRAIS_SERVICE_MONTANT_USD: "FRAIS_SERVICE_MONTANT_USD",
  FRAIS_SERVICE_MONTANT_CDF: "FRAIS_SERVICE_MONTANT_CDF",
  TAUX_USD_CDF: "TAUX_USD_CDF",
  VERSEMENT_MINIMUM_CDF: "VERSEMENT_MINIMUM_CDF",
  VERSEMENT_MINIMUM_USD: "VERSEMENT_MINIMUM_USD",
} as const;

const DEFAUTS: Record<string, string> = {
  COMMISSION_PRESTATAIRE: "5",
  COMMISSION_CLIENT: "0",
  FRAIS_SERVICE_SEUIL_USD: "50",
  FRAIS_SERVICE_MONTANT_USD: "2",
  FRAIS_SERVICE_MONTANT_CDF: "5000",
  TAUX_USD_CDF: "2800",
  VERSEMENT_MINIMUM_CDF: "20000",
  VERSEMENT_MINIMUM_USD: "10",
};

export interface ConfigTarif {
  commissionPrestataireDefaut: number;
  fraisServiceSeuilUsd: number;
  fraisServiceMontantUsd: number;
  fraisServiceMontantCdf: number;
  tauxUsdCdf: number;
  versementMinimumCdf: number;
  versementMinimumUsd: number;
}

function lireNombre(valeur: string | undefined, fallback: number): number {
  const n = parseFloat(valeur ?? "");
  return Number.isFinite(n) ? n : fallback;
}

export async function obtenirConfigTarif(): Promise<ConfigTarif> {
  const lignes = await prisma.configurationTarification.findMany({
    where: { actif: true, cle: { in: Object.values(CLES_TARIF) } },
  });
  const map = Object.fromEntries(lignes.map((l) => [l.cle, l.valeur]));
  return {
    commissionPrestataireDefaut: normaliserPourcent(
      lireNombre(map[CLES_TARIF.COMMISSION_PRESTATAIRE] ?? map.COMMISSION_PRESTATAIRE_DEFAUT, 5)
    ),
    fraisServiceSeuilUsd: lireNombre(map[CLES_TARIF.FRAIS_SERVICE_SEUIL_USD], 50),
    fraisServiceMontantUsd: lireNombre(map[CLES_TARIF.FRAIS_SERVICE_MONTANT_USD], 2),
    fraisServiceMontantCdf: lireNombre(map[CLES_TARIF.FRAIS_SERVICE_MONTANT_CDF], 5000),
    tauxUsdCdf: lireNombre(map[CLES_TARIF.TAUX_USD_CDF], 2800),
    versementMinimumCdf: lireNombre(map[CLES_TARIF.VERSEMENT_MINIMUM_CDF], 20000),
    versementMinimumUsd: lireNombre(map[CLES_TARIF.VERSEMENT_MINIMUM_USD], 10),
  };
}

export async function resoudreTauxCommission(prestataireId: string): Promise<number> {
  const config = await obtenirConfigTarif();
  const maintenant = new Date();
  const abonnement = await prisma.abonnementPrestataire.findFirst({
    where: { prestataireId, statut: "ACTIF", dateFin: { gte: maintenant } },
    include: { plan: true },
    orderBy: { dateDebut: "desc" },
  });

  if (abonnement?.plan.commissionReduite != null) {
    return normaliserPourcent(abonnement.plan.commissionReduite);
  }

  const prestataire = await prisma.prestataire.findUnique({ where: { id: prestataireId } });
  if (prestataire?.tauxCommissionPourcent != null && prestataire.tauxCommissionPourcent > 0) {
    return normaliserPourcent(prestataire.tauxCommissionPourcent);
  }
  return config.commissionPrestataireDefaut;
}

export async function calculerPourReservation(params: {
  prestataireId: string;
  prixService: number;
  devise: string;
  montantReduction?: number;
}): Promise<TarificationReservation> {
  const [config, taux] = await Promise.all([
    obtenirConfigTarif(),
    resoudreTauxCommission(params.prestataireId),
  ]);
  return calculerTarificationReservation({
    prixService: params.prixService,
    devise: params.devise,
    montantReduction: params.montantReduction,
    tauxCommissionPourcent: taux,
    fraisServiceSeuilUsd: config.fraisServiceSeuilUsd,
    fraisServiceMontantUsd: config.fraisServiceMontantUsd,
    fraisServiceMontantCdf: config.fraisServiceMontantCdf,
    tauxUsdCdf: config.tauxUsdCdf,
  });
}

export async function simulerTarification(params: {
  prix: number;
  devise: string;
  prestataireId?: string;
}): Promise<TarificationReservation> {
  if (params.prestataireId) {
    return calculerPourReservation({
      prestataireId: params.prestataireId,
      prixService: params.prix,
      devise: params.devise,
    });
  }
  const config = await obtenirConfigTarif();
  return calculerTarificationReservation({
    prixService: params.prix,
    devise: params.devise,
    tauxCommissionPourcent: config.commissionPrestataireDefaut,
    fraisServiceSeuilUsd: config.fraisServiceSeuilUsd,
    fraisServiceMontantUsd: config.fraisServiceMontantUsd,
    fraisServiceMontantCdf: config.fraisServiceMontantCdf,
    tauxUsdCdf: config.tauxUsdCdf,
  });
}

type ClientTx = {
  ecritureComptable: {
    create: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any[]>;
    aggregate: (args: any) => Promise<any>;
  };
  versementPrestataire: {
    findMany: (args: any) => Promise<any[]>;
    create: (args: any) => Promise<any>;
    findUnique: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    count: (args: any) => Promise<number>;
  };
  reservation: { update: (args: any) => Promise<any> };
};

async function ecrire(
  client: ClientTx,
  data: {
    type: string;
    compte: "PLATEFORME" | "PRESTATAIRE";
    sens: "CREDIT" | "DEBIT";
    montant: number;
    devise: string;
    prestataireId?: string | null;
    reservationId?: string | null;
    abonnementId?: string | null;
    versementId?: string | null;
    description?: string;
  }
) {
  if (data.montant <= 0) return null;
  return client.ecritureComptable.create({
    data: {
      type: data.type,
      compte: data.compte,
      sens: data.sens,
      montant: data.montant,
      devise: data.devise,
      prestataireId: data.prestataireId ?? undefined,
      reservationId: data.reservationId ?? undefined,
      abonnementId: data.abonnementId ?? undefined,
      versementId: data.versementId ?? undefined,
      description: data.description,
    },
  });
}

/** Enregistre les écritures proportionnelles à un paiement confirmé. */
export async function enregistrerPaiementReservation(
  client: ClientTx,
  reservation: {
    id: string;
    prestataireId: string;
    montantTotal: number;
    montantCommission: number;
    montantFraisService: number;
    montantNetPrestataire: number;
    devise: string;
    numero: string;
  },
  montantPaye: number
) {
  if (reservation.montantTotal <= 0 || montantPaye <= 0) return;
  const ratio = Math.min(1, montantPaye / reservation.montantTotal);
  const commission = reservation.montantCommission * ratio;
  const frais = reservation.montantFraisService * ratio;
  const net = reservation.montantNetPrestataire * ratio;

  await ecrire(client, {
    type: "COMMISSION",
    compte: "PLATEFORME",
    sens: "CREDIT",
    montant: commission,
    devise: reservation.devise,
    prestataireId: reservation.prestataireId,
    reservationId: reservation.id,
    description: `Commission réservation ${reservation.numero}`,
  });
  await ecrire(client, {
    type: "FRAIS_SERVICE",
    compte: "PLATEFORME",
    sens: "CREDIT",
    montant: frais,
    devise: reservation.devise,
    prestataireId: reservation.prestataireId,
    reservationId: reservation.id,
    description: `Frais de service ${reservation.numero}`,
  });
  await ecrire(client, {
    type: "NET_PRESTATAIRE",
    compte: "PRESTATAIRE",
    sens: "CREDIT",
    montant: net,
    devise: reservation.devise,
    prestataireId: reservation.prestataireId,
    reservationId: reservation.id,
    description: `Net prestataire ${reservation.numero}`,
  });

  await client.reservation.update({
    where: { id: reservation.id },
    data: { commissionStatut: "ACQUISE" },
  });
}

/** Inverse proportionnellement les écritures lors d'un remboursement. */
export async function enregistrerRemboursement(
  client: ClientTx,
  reservation: {
    id: string;
    prestataireId: string;
    montantPaye: number;
    montantCommission: number;
    montantFraisService: number;
    montantNetPrestataire: number;
    devise: string;
    numero: string;
    commissionStatut: string;
  },
  montantRembourse: number
) {
  if (montantRembourse <= 0 || reservation.montantPaye <= 0) return;
  if (reservation.commissionStatut !== "ACQUISE") return;

  const ratio = Math.min(1, montantRembourse / reservation.montantPaye);
  await ecrire(client, {
    type: "REMBOURSEMENT",
    compte: "PLATEFORME",
    sens: "DEBIT",
    montant: reservation.montantCommission * ratio,
    devise: reservation.devise,
    prestataireId: reservation.prestataireId,
    reservationId: reservation.id,
    description: `Annulation commission ${reservation.numero}`,
  });
  await ecrire(client, {
    type: "REMBOURSEMENT",
    compte: "PLATEFORME",
    sens: "DEBIT",
    montant: reservation.montantFraisService * ratio,
    devise: reservation.devise,
    prestataireId: reservation.prestataireId,
    reservationId: reservation.id,
    description: `Annulation frais ${reservation.numero}`,
  });
  await ecrire(client, {
    type: "REMBOURSEMENT",
    compte: "PRESTATAIRE",
    sens: "DEBIT",
    montant: reservation.montantNetPrestataire * ratio,
    devise: reservation.devise,
    prestataireId: reservation.prestataireId,
    reservationId: reservation.id,
    description: `Annulation net ${reservation.numero}`,
  });

  const statut = ratio >= 0.999 ? "REMBOURSEE" : "ACQUISE";
  await client.reservation.update({
    where: { id: reservation.id },
    data: { commissionStatut: statut },
  });
}

export async function listerPlansPublics() {
  return prisma.planAbonnement.findMany({
    where: { actif: true },
    orderBy: [{ commissionReduite: "desc" }, { prix: "asc" }],
  });
}

export async function attribuerPlanGratuit(prestataireId: string) {
  const plan = await prisma.planAbonnement.findFirst({
    where: { actif: true, prix: 0 },
    orderBy: { creeLe: "asc" },
  });
  if (!plan) return null;

  const existant = await prisma.abonnementPrestataire.findFirst({
    where: { prestataireId, statut: "ACTIF" },
  });
  if (existant) return existant;

  const debut = new Date();
  const fin = new Date(debut);
  fin.setDate(fin.getDate() + plan.dureeJours);

  return prisma.abonnementPrestataire.create({
    data: {
      prestataireId,
      planId: plan.id,
      dateDebut: debut,
      dateFin: fin,
      statut: "ACTIF",
      statutPaiement: "GRATUIT",
      montantPaye: 0,
    },
    include: { plan: true },
  });
}

export async function souscrireAbonnement(
  utilisateurId: string,
  input: { planId: string; operateur?: OperateurMobileMoney; telephonePaiement?: string }
) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) throw new ErreurNonTrouve("Profil prestataire non trouvé");
  if (prestataire.statut !== "APPROUVE") {
    throw new ErreurInterdit("Votre profil doit être approuvé avant de souscrire un abonnement");
  }

  const plan = await prisma.planAbonnement.findUnique({ where: { id: input.planId } });
  if (!plan || !plan.actif) throw new ErreurNonTrouve("Plan d'abonnement introuvable");

  let referencePaiement: string | undefined;
  let statutPaiement = "GRATUIT";
  let montantPaye = 0;

  if (plan.prix > 0) {
    if (!input.operateur) {
      throw new ErreurValidation("Choisissez un opérateur Mobile Money pour payer cet abonnement");
    }
    const resultat = await initierPaiementMobileMoney({
      operateur: input.operateur,
      telephonePaiement: input.telephonePaiement ?? "",
      montant: plan.prix,
    });
    if (resultat.statut !== "PAYE") {
      throw new ErreurValidation(resultat.messageOperateur || "Le paiement de l'abonnement a échoué. Réessayez.");
    }
    referencePaiement = resultat.referenceExterne;
    statutPaiement = "PAYE";
    montantPaye = plan.prix;
  }

  const debut = new Date();
  const fin = new Date(debut);
  fin.setDate(fin.getDate() + plan.dureeJours);

  const abonnement = await prisma.$transaction(async (tx) => {
    await tx.abonnementPrestataire.updateMany({
      where: { prestataireId: prestataire.id, statut: "ACTIF" },
      data: { statut: "REMPLACE" },
    });

    const cree = await tx.abonnementPrestataire.create({
      data: {
        prestataireId: prestataire.id,
        planId: plan.id,
        dateDebut: debut,
        dateFin: fin,
        statut: "ACTIF",
        montantPaye,
        operateurPaiement: input.operateur,
        referencePaiement,
        statutPaiement,
      },
      include: { plan: true },
    });

    if (montantPaye > 0) {
      await ecrire(tx as unknown as ClientTx, {
        type: "ABONNEMENT",
        compte: "PLATEFORME",
        sens: "CREDIT",
        montant: montantPaye,
        devise: plan.devise,
        prestataireId: prestataire.id,
        abonnementId: cree.id,
        description: `Abonnement ${plan.nom}`,
      });
    }

    if (plan.commissionReduite != null) {
      await tx.prestataire.update({
        where: { id: prestataire.id },
        data: { tauxCommissionPourcent: normaliserPourcent(plan.commissionReduite) },
      });
    }

    return cree;
  });

  return abonnement;
}

async function soldePrestataire(prestataireId: string, devise?: string) {
  const where: any = { prestataireId, compte: "PRESTATAIRE" };
  if (devise) where.devise = devise;

  const [credits, debits, demandes] = await Promise.all([
    prisma.ecritureComptable.aggregate({
      where: { ...where, sens: "CREDIT" },
      _sum: { montant: true },
    }),
    prisma.ecritureComptable.aggregate({
      where: { ...where, sens: "DEBIT" },
      _sum: { montant: true },
    }),
    prisma.versementPrestataire.findMany({
      where: { prestataireId, statut: "DEMANDE", ...(devise ? { devise } : {}) },
    }),
  ]);

  const credit = credits._sum.montant ?? 0;
  const debit = debits._sum.montant ?? 0;
  const enAttente = demandes.reduce((s, v) => s + v.montant, 0);
  return {
    brut: credit,
    verse: debit,
    enAttente,
    disponible: Math.max(0, credit - debit - enAttente),
  };
}

export async function obtenirFinancesPrestataire(utilisateurId: string) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) throw new ErreurNonTrouve("Profil prestataire non trouvé");

  const [soldeCdf, soldeUsd, versements, abonnement, config] = await Promise.all([
    soldePrestataire(prestataire.id, "CDF"),
    soldePrestataire(prestataire.id, "USD"),
    prisma.versementPrestataire.findMany({
      where: { prestataireId: prestataire.id },
      orderBy: { creeLe: "desc" },
      take: 20,
    }),
    prisma.abonnementPrestataire.findFirst({
      where: { prestataireId: prestataire.id, statut: "ACTIF" },
      include: { plan: true },
      orderBy: { dateDebut: "desc" },
    }),
    obtenirConfigTarif(),
  ]);

  const taux = await resoudreTauxCommission(prestataire.id);

  return {
    prestataireId: prestataire.id,
    tauxCommission: taux,
    abonnement,
    soldes: { CDF: soldeCdf, USD: soldeUsd },
    minimums: { CDF: config.versementMinimumCdf, USD: config.versementMinimumUsd },
    versements,
  };
}

export async function demanderVersement(
  utilisateurId: string,
  input: { montant: number; devise: string; operateur: OperateurMobileMoney; telephonePaiement: string }
) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) throw new ErreurNonTrouve("Profil prestataire non trouvé");
  if (prestataire.statut !== "APPROUVE") {
    throw new ErreurInterdit("Profil prestataire non approuvé");
  }

  const devise = input.devise === "USD" ? "USD" : "CDF";
  const config = await obtenirConfigTarif();
  const minimum = devise === "USD" ? config.versementMinimumUsd : config.versementMinimumCdf;
  if (input.montant < minimum) {
    throw new ErreurValidation(`Le versement minimum est de ${minimum} ${devise}`);
  }

  const solde = await soldePrestataire(prestataire.id, devise);
  if (input.montant > solde.disponible) {
    throw new ErreurValidation(`Solde insuffisant. Disponible : ${solde.disponible} ${devise}`);
  }

  return prisma.versementPrestataire.create({
    data: {
      prestataireId: prestataire.id,
      montant: input.montant,
      devise,
      statut: "DEMANDE",
      operateur: input.operateur,
      telephonePaiement: input.telephonePaiement,
    },
  });
}

export async function listerVersementsPrestataire(utilisateurId: string) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) throw new ErreurNonTrouve("Profil prestataire non trouvé");
  return prisma.versementPrestataire.findMany({
    where: { prestataireId: prestataire.id },
    orderBy: { creeLe: "desc" },
  });
}

export async function listerVersementsAdmin(page = 1, parPage = 20, statut?: string) {
  const skip = (page - 1) * parPage;
  const where = statut ? { statut } : {};
  const [items, total] = await Promise.all([
    prisma.versementPrestataire.findMany({
      where,
      skip,
      take: parPage,
      orderBy: { creeLe: "desc" },
      include: { prestataire: { select: { nomEntreprise: true, ville: true, categorie: true } } },
    }),
    prisma.versementPrestataire.count({ where }),
  ]);
  return { items, total, page, parPage, totalPages: Math.ceil(total / parPage) };
}

export async function traiterVersementAdmin(
  versementId: string,
  input: { payer: boolean; noteAdmin?: string }
) {
  const versement = await prisma.versementPrestataire.findUnique({ where: { id: versementId } });
  if (!versement) throw new ErreurNonTrouve("Demande de versement introuvable");
  if (versement.statut !== "DEMANDE") {
    throw new ErreurValidation("Cette demande a déjà été traitée");
  }

  if (!input.payer) {
    return prisma.versementPrestataire.update({
      where: { id: versementId },
      data: { statut: "REFUSE", noteAdmin: input.noteAdmin, traiteLe: new Date() },
    });
  }

  return prisma.$transaction(async (tx) => {
    const maj = await tx.versementPrestataire.update({
      where: { id: versementId },
      data: {
        statut: "PAYE",
        noteAdmin: input.noteAdmin,
        traiteLe: new Date(),
        referenceExterne: `VRS-${Date.now()}`,
      },
    });
    await ecrire(tx as unknown as ClientTx, {
      type: "VERSEMENT",
      compte: "PRESTATAIRE",
      sens: "DEBIT",
      montant: versement.montant,
      devise: versement.devise,
      prestataireId: versement.prestataireId,
      versementId: versement.id,
      description: `Versement ${maj.referenceExterne}`,
    });
    return maj;
  });
}

async function totaliserEnCdf(
  where: Record<string, unknown>,
  tauxUsdCdf: number
): Promise<number> {
  const lignes = await prisma.ecritureComptable.groupBy({
    by: ["devise"],
    where,
    _sum: { montant: true },
  });
  return Math.round(
    lignes.reduce((somme, ligne) => {
      const montant = ligne._sum.montant ?? 0;
      return somme + (ligne.devise === "USD" ? montant * tauxUsdCdf : montant);
    }, 0)
  );
}

export async function obtenirFinancesPlateforme(periode = "mois") {
  const config = await obtenirConfigTarif();
  const maintenant = new Date();
  const debut = new Date(maintenant);
  if (periode === "semaine") {
    debut.setDate(debut.getDate() - debut.getDay());
    debut.setHours(0, 0, 0, 0);
  } else if (periode === "annee") {
    debut.setMonth(0, 1);
    debut.setHours(0, 0, 0, 0);
  } else {
    debut.setDate(1);
    debut.setHours(0, 0, 0, 0);
  }

  const filtreDates = { creeLe: { gte: debut } };

  const [
    reservationsPayees,
    creditsPlateforme,
    debitsPlateforme,
    parType,
    abonnementsActifs,
    mrrCdf,
    mrrUsd,
    versementsEnAttente,
    versementsPayes,
    agregatsReservation,
    topPrestatairesBruts,
    abonnementsExpirant,
    ecrituresRecentes,
  ] = await Promise.all([
    prisma.reservation.findMany({
      where: { statutPaiement: { in: ["PAYE", "PARTIEL"] }, ...filtreDates },
      select: { montantPaye: true, devise: true, montantCommission: true, montantFraisService: true },
    }),
    totaliserEnCdf({ compte: "PLATEFORME", sens: "CREDIT", ...filtreDates }, config.tauxUsdCdf),
    totaliserEnCdf({ compte: "PLATEFORME", sens: "DEBIT", ...filtreDates }, config.tauxUsdCdf),
    prisma.ecritureComptable.groupBy({
      by: ["type", "devise"],
      where: { compte: "PLATEFORME", sens: "CREDIT", ...filtreDates },
      _sum: { montant: true },
    }),
    prisma.abonnementPrestataire.count({ where: { statut: "ACTIF", dateFin: { gte: maintenant } } }),
    prisma.abonnementPrestataire.aggregate({
      where: { statut: "ACTIF", dateFin: { gte: maintenant }, plan: { devise: "CDF" } },
      _sum: { montantPaye: true },
    }),
    prisma.abonnementPrestataire.aggregate({
      where: { statut: "ACTIF", dateFin: { gte: maintenant }, plan: { devise: "USD" } },
      _sum: { montantPaye: true },
    }),
    prisma.versementPrestataire.aggregate({
      where: { statut: "DEMANDE" },
      _sum: { montant: true },
      _count: true,
    }),
    prisma.versementPrestataire.aggregate({
      where: { statut: "PAYE", ...filtreDates },
      _sum: { montant: true },
    }),
    prisma.reservation.aggregate({
      where: { statutPaiement: { in: ["PAYE", "PARTIEL"] }, ...filtreDates },
      _sum: { montantCommission: true, montantFraisService: true, montantNetPrestataire: true, montantPaye: true },
      _count: true,
    }),
    prisma.ecritureComptable.groupBy({
      by: ["prestataireId", "devise"],
      where: {
        compte: "PRESTATAIRE",
        sens: "CREDIT",
        type: "NET_PRESTATAIRE",
        prestataireId: { not: null },
        ...filtreDates,
      },
      _sum: { montant: true },
    }),
    prisma.abonnementPrestataire.findMany({
      where: {
        statut: "ACTIF",
        dateFin: {
          gte: maintenant,
          lte: new Date(maintenant.getTime() + 14 * 24 * 60 * 60 * 1000),
        },
      },
      take: 10,
      orderBy: { dateFin: "asc" },
      include: {
        plan: { select: { nom: true, devise: true, prix: true } },
        prestataire: { select: { nomEntreprise: true, ville: true } },
      },
    }),
    prisma.ecritureComptable.findMany({
      take: 8,
      orderBy: { creeLe: "desc" },
      include: { prestataire: { select: { nomEntreprise: true } } },
    }),
  ]);

  const gmvValeur = reservationsPayees.reduce(
    (somme, r) => somme + (r.devise === "USD" ? r.montantPaye * config.tauxUsdCdf : r.montantPaye),
    0
  );
  const recetteBrute = creditsPlateforme;
  const recetteNette = recetteBrute - debitsPlateforme;
  const parTypeMap: Record<string, number> = {};
  for (const ligne of parType) {
    const montant = ligne._sum.montant ?? 0;
    const enCdf = ligne.devise === "USD" ? montant * config.tauxUsdCdf : montant;
    parTypeMap[ligne.type] = (parTypeMap[ligne.type] ?? 0) + enCdf;
  }

  const soldesParPrestataire = new Map<string, number>();
  for (const ligne of topPrestatairesBruts) {
    if (!ligne.prestataireId) continue;
    const montant = ligne._sum.montant ?? 0;
    const enCdf = ligne.devise === "USD" ? montant * config.tauxUsdCdf : montant;
    soldesParPrestataire.set(
      ligne.prestataireId,
      (soldesParPrestataire.get(ligne.prestataireId) ?? 0) + enCdf
    );
  }
  const topIds = [...soldesParPrestataire.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const prestatairesInfos = topIds.length
    ? await prisma.prestataire.findMany({
        where: { id: { in: topIds.map(([id]) => id) } },
        select: { id: true, nomEntreprise: true, ville: true, categorie: true },
      })
    : [];
  const infosMap = Object.fromEntries(prestatairesInfos.map((p) => [p.id, p]));
  const topPrestataires = topIds.map(([id, volumeCdf]) => ({
    prestataireId: id,
    nomEntreprise: infosMap[id]?.nomEntreprise ?? "—",
    ville: infosMap[id]?.ville ?? null,
    categorie: infosMap[id]?.categorie ?? null,
    volumeCdf,
  }));

  const evolution = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(maintenant.getFullYear(), maintenant.getMonth() - i, 1);
    const fin = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const [resaMois, recetteMois] = await Promise.all([
      prisma.reservation.findMany({
        where: { statutPaiement: { in: ["PAYE", "PARTIEL"] }, creeLe: { gte: d, lt: fin } },
        select: { montantPaye: true, devise: true },
      }),
      totaliserEnCdf(
        { compte: "PLATEFORME", sens: "CREDIT", creeLe: { gte: d, lt: fin } },
        config.tauxUsdCdf
      ),
    ]);
    evolution.push({
      mois: d.toLocaleDateString("fr-FR", { month: "short", year: "numeric" }),
      gmv: resaMois.reduce(
        (somme, r) => somme + (r.devise === "USD" ? r.montantPaye * config.tauxUsdCdf : r.montantPaye),
        0
      ),
      recette: recetteMois,
    });
  }

  return {
    periode,
    gmv: gmvValeur,
    recetteBrute,
    recetteNette,
    takeRate: gmvValeur > 0 ? Math.round((recetteNette / gmvValeur) * 10000) / 100 : 0,
    parType: parTypeMap,
    abonnementsActifs,
    mrr: { CDF: mrrCdf._sum.montantPaye ?? 0, USD: mrrUsd._sum.montantPaye ?? 0 },
    versements: {
      enAttente: versementsEnAttente._sum.montant ?? 0,
      nombreEnAttente: versementsEnAttente._count,
      payesPeriode: versementsPayes._sum.montant ?? 0,
    },
    evolution,
    config,
    reservations: {
      payees: agregatsReservation._count,
      commissions: agregatsReservation._sum.montantCommission ?? 0,
      fraisService: agregatsReservation._sum.montantFraisService ?? 0,
      netPrestataires: agregatsReservation._sum.montantNetPrestataire ?? 0,
    },
    topPrestataires,
    abonnementsExpirant,
    ecrituresRecentes,
  };
}

export async function listerEcrituresAdmin(params: {
  page?: number;
  parPage?: number;
  type?: string;
  compte?: string;
  devise?: string;
  prestataireId?: string;
}) {
  const page = params.page ?? 1;
  const parPage = params.parPage ?? 30;
  const skip = (page - 1) * parPage;
  const where: Record<string, unknown> = {};
  if (params.type) where.type = params.type;
  if (params.compte) where.compte = params.compte;
  if (params.devise) where.devise = params.devise;
  if (params.prestataireId) where.prestataireId = params.prestataireId;

  const [items, total] = await Promise.all([
    prisma.ecritureComptable.findMany({
      where,
      skip,
      take: parPage,
      orderBy: { creeLe: "desc" },
      include: {
        prestataire: { select: { nomEntreprise: true, ville: true } },
        reservation: { select: { numero: true, statut: true } },
      },
    }),
    prisma.ecritureComptable.count({ where }),
  ]);

  return { items, total, page, parPage, totalPages: Math.ceil(total / parPage) || 1 };
}

export async function obtenirSoldesPrestatairesAdmin(page = 1, parPage = 20) {
  const config = await obtenirConfigTarif();
  const skip = (page - 1) * parPage;
  const [prestataires, total] = await Promise.all([
    prisma.prestataire.findMany({
      where: { statut: "APPROUVE" },
      skip,
      take: parPage,
      orderBy: { nomEntreprise: "asc" },
      select: { id: true, nomEntreprise: true, ville: true, categorie: true },
    }),
    prisma.prestataire.count({ where: { statut: "APPROUVE" } }),
  ]);

  const items = await Promise.all(
    prestataires.map(async (p) => {
      const soldes = await Promise.all(
        (["CDF", "USD"] as const).map(async (devise) => {
          const [credits, debits, enAttente] = await Promise.all([
            prisma.ecritureComptable.aggregate({
              where: { prestataireId: p.id, compte: "PRESTATAIRE", sens: "CREDIT", devise },
              _sum: { montant: true },
            }),
            prisma.ecritureComptable.aggregate({
              where: { prestataireId: p.id, compte: "PRESTATAIRE", sens: "DEBIT", devise },
              _sum: { montant: true },
            }),
            prisma.versementPrestataire.aggregate({
              where: { prestataireId: p.id, statut: "DEMANDE", devise },
              _sum: { montant: true },
            }),
          ]);
          const brut = credits._sum.montant ?? 0;
          const verse = debits._sum.montant ?? 0;
          const attente = enAttente._sum.montant ?? 0;
          return {
            devise,
            brut,
            verse,
            enAttente: attente,
            disponible: Math.max(0, brut - verse - attente),
          };
        })
      );
      return { ...p, soldes, minimums: { CDF: config.versementMinimumCdf, USD: config.versementMinimumUsd } };
    })
  );

  return { items, total, page, parPage, totalPages: Math.ceil(total / parPage) || 1, config };
}

export async function verifierQuotaServices(prestataireId: string) {
  const maintenant = new Date();
  const abonnement = await prisma.abonnementPrestataire.findFirst({
    where: { prestataireId, statut: "ACTIF", dateFin: { gte: maintenant } },
    include: { plan: true },
    orderBy: { dateDebut: "desc" },
  });
  const maxServices = abonnement?.plan.maxServices ?? 3;
  if (maxServices == null) return;

  const actifs = await prisma.serviceOffert.count({
    where: { prestataireId, actif: true },
  });
  if (actifs >= maxServices) {
    throw new ErreurValidation(
      `Votre plan ${abonnement?.plan.nom ?? "actuel"} autorise ${maxServices} service(s) actif(s). Passez à un plan supérieur pour en ajouter.`
    );
  }
}
