import {
  schemaActiverAgent,
  schemaCanalSmsInbound,
  schemaCreerBeneficiaire,
  schemaOuvrirLitige,
  schemaReclamerGarantie,
  schemaTrancheLitige,
} from "@reserva/shared";
import { prisma } from "../../config/prisma";
import { ErreurInterdit, ErreurNonTrouve, ErreurValidation } from "../../utils/erreurs";
import { creerAvoir } from "../avoirs/avoirs.service";
import { envoyerSms } from "../notifications/sms.adapter";
import { recalculerConfiancePrestataire, recalculerTousLesScores } from "./confiance.service";

// --- Kit famille ---

export async function listerBeneficiaires(utilisateurId: string) {
  return prisma.beneficiaire.findMany({
    where: { utilisateurId },
    orderBy: { creeLe: "desc" },
  });
}

export async function creerBeneficiaire(utilisateurId: string, brut: unknown) {
  const data = schemaCreerBeneficiaire.parse(brut);
  return prisma.beneficiaire.create({
    data: {
      utilisateurId,
      nom: data.nom,
      telephone: data.telephone,
      lienParente: data.lienParente,
    },
  });
}

export async function supprimerBeneficiaire(utilisateurId: string, id: string) {
  const b = await prisma.beneficiaire.findUnique({ where: { id } });
  if (!b || b.utilisateurId !== utilisateurId) throw new ErreurNonTrouve("Bénéficiaire introuvable");
  await prisma.beneficiaire.delete({ where: { id } });
  return { ok: true };
}

// --- Garantie arrivée ---

export async function reclamerGarantie(utilisateurId: string, brut: unknown) {
  const data = schemaReclamerGarantie.parse(brut);
  const reservation = await prisma.reservation.findUnique({
    where: { id: data.reservationId },
    include: { service: true },
  });
  if (!reservation) throw new ErreurNonTrouve("Réservation introuvable");
  if (reservation.clientId !== utilisateurId) throw new ErreurInterdit("Réservation non autorisée");
  if (!reservation.garantieActive) throw new ErreurValidation("Garantie non active sur cette réservation");
  if (reservation.garantieUtilisee) throw new ErreurValidation("Garantie déjà utilisée");
  if (!["CONFIRMEE", "EN_COURS", "ABSENCE"].includes(reservation.statut) && reservation.statut !== "TERMINEE") {
    // Autoriser aussi si payée mais prestataire n'a pas délivré (CONFIRMEE/EN_COURS trop tard sans check-in)
  }
  if (reservation.statutPaiement !== "PAYE" && reservation.statutPaiement !== "PARTIEL") {
    throw new ErreurValidation("La garantie s'applique aux réservations payées");
  }
  // Non délivré = CONFIRMEE > 2h après créneau OU ABSENCE côté prestataire faute
  const montant = reservation.montantPaye > 0 ? reservation.montantPaye : reservation.montantTotal;
  const avoir = await creerAvoir({
    utilisateurId,
    montant,
    devise: reservation.devise,
    sourceReservationId: reservation.id,
  });
  await prisma.reservation.update({
    where: { id: reservation.id },
    data: {
      garantieUtilisee: true,
      notes: `${reservation.notes ?? ""}\n[GARANTIE] ${data.motif}`.trim(),
    },
  });
  await recalculerConfiancePrestataire(reservation.prestataireId);
  return {
    message: "Garantie honoree : credit AVOIR cree. Vous pouvez rebooker en 1 tap.",
    avoir,
    reservationId: reservation.id,
  };
}

// --- Litiges / mediation ---

export async function ouvrirLitige(utilisateurId: string, brut: unknown) {
  const data = schemaOuvrirLitige.parse(brut);
  const reservation = await prisma.reservation.findUnique({ where: { id: data.reservationId } });
  if (!reservation) throw new ErreurNonTrouve("Réservation introuvable");
  if (reservation.clientId !== utilisateurId) {
    const prestataire = await prisma.prestataire.findFirst({
      where: { id: reservation.prestataireId, utilisateurId },
    });
    if (!prestataire) throw new ErreurInterdit("Non autorisé");
  }
  const existant = await prisma.litige.findFirst({
    where: { reservationId: data.reservationId, statut: { in: ["OUVERT", "EN_MEDIATION"] } },
  });
  if (existant) throw new ErreurValidation("Un litige est déjà ouvert sur cette réservation");

  return prisma.litige.create({
    data: {
      reservationId: data.reservationId,
      ouvertParId: utilisateurId,
      motif: data.motif,
      description: data.description,
      preuvesJson: data.preuvesUrl ? JSON.stringify(data.preuvesUrl) : null,
      statut: "OUVERT",
    },
  });
}

export async function listerMesLitiges(utilisateurId: string, role: string) {
  if (role === "ADMIN") {
    return prisma.litige.findMany({
      include: {
        reservation: { include: { service: true, client: { select: { nom: true, telephone: true } } } },
        ouvertPar: { select: { nom: true, telephone: true, role: true } },
      },
      orderBy: { creeLe: "desc" },
      take: 100,
    });
  }
  return prisma.litige.findMany({
    where: { ouvertParId: utilisateurId },
    include: { reservation: { include: { service: true } } },
    orderBy: { creeLe: "desc" },
  });
}

export async function trancheLitige(adminId: string, brut: unknown) {
  const data = schemaTrancheLitige.parse(brut);
  const litige = await prisma.litige.findUnique({
    where: { id: data.litigeId },
    include: { reservation: true },
  });
  if (!litige) throw new ErreurNonTrouve("Litige introuvable");
  if (litige.statut === "TRANCHE" || litige.statut === "REJETE") {
    throw new ErreurValidation("Litige déjà tranché");
  }

  let montantAvoir = data.montantAvoir ?? null;
  if (data.decision === "AVOIR_TOTAL") {
    montantAvoir = litige.reservation.montantPaye || litige.reservation.montantTotal;
  }
  if (data.decision === "AVOIR_PARTIEL" && (!montantAvoir || montantAvoir <= 0)) {
    throw new ErreurValidation("Montant avoir requis pour AVOIR_PARTIEL");
  }
  if ((data.decision === "AVOIR_TOTAL" || data.decision === "AVOIR_PARTIEL") && montantAvoir) {
    await creerAvoir({
      utilisateurId: litige.reservation.clientId,
      montant: montantAvoir,
      devise: litige.reservation.devise,
      sourceReservationId: litige.reservation.id,
    });
  }

  const statut = data.decision === "REJET" ? "REJETE" : "TRANCHE";
  return prisma.litige.update({
    where: { id: litige.id },
    data: {
      statut,
      decision: `${data.decision}${data.commentaire ? `: ${data.commentaire}` : ""}`,
      montantAvoir: montantAvoir ?? undefined,
      trancheParId: adminId,
    },
  });
}

// --- Agents de quartier ---

export async function activerAgent(adminId: string, brut: unknown) {
  void adminId;
  const { obtenirConfigTarif } = await import("../economie/economie.service");
  const config = await obtenirConfigTarif();
  const data = schemaActiverAgent.parse(brut);
  const commissionPourcent = data.commissionPourcent ?? config.commissionAgentDefaut;
  const u = await prisma.utilisateur.findUnique({ where: { id: data.utilisateurId } });
  if (!u) throw new ErreurNonTrouve("Utilisateur introuvable");
  if (u.role === "ADMIN" || u.role === "PRESTATAIRE") {
    throw new ErreurValidation("Seuls les comptes CLIENT peuvent devenir AGENT");
  }
  return prisma.utilisateur.update({
    where: { id: u.id },
    data: {
      role: "AGENT",
      commissionAgentPourcent: commissionPourcent,
    },
    select: {
      id: true,
      nom: true,
      telephone: true,
      role: true,
      commissionAgentPourcent: true,
      codeParrainage: true,
    },
  });
}

export async function listerAgents() {
  const agents = await prisma.utilisateur.findMany({
    where: { role: "AGENT" },
    select: {
      id: true,
      nom: true,
      telephone: true,
      commissionAgentPourcent: true,
      codeParrainage: true,
      creeLe: true,
      _count: { select: { reservationsAgent: true } },
    },
    orderBy: { creeLe: "desc" },
  });
  return agents.map((a) => ({
    id: a.id,
    nom: a.nom,
    telephone: a.telephone,
    commissionPourcent: a.commissionAgentPourcent,
    codeParrainage: a.codeParrainage,
    nombreReservations: a._count.reservationsAgent,
    creeLe: a.creeLe,
  }));
}

export async function modifierCommissionAgent(agentId: string, commissionPourcent: number) {
  if (commissionPourcent < 0.5 || commissionPourcent > 10) {
    throw new ErreurValidation("Commission agent entre 0,5 % et 10 %");
  }
  const u = await prisma.utilisateur.findUnique({ where: { id: agentId } });
  if (!u || u.role !== "AGENT") throw new ErreurNonTrouve("Agent introuvable");
  return prisma.utilisateur.update({
    where: { id: agentId },
    data: { commissionAgentPourcent: commissionPourcent },
    select: {
      id: true,
      nom: true,
      telephone: true,
      role: true,
      commissionAgentPourcent: true,
    },
  });
}

export async function desactiverAgent(agentId: string) {
  const u = await prisma.utilisateur.findUnique({ where: { id: agentId } });
  if (!u || u.role !== "AGENT") throw new ErreurNonTrouve("Agent introuvable");
  return prisma.utilisateur.update({
    where: { id: agentId },
    data: { role: "CLIENT" },
    select: { id: true, nom: true, telephone: true, role: true },
  });
}

export async function statsAgent(agentId: string) {
  const reservations = await prisma.reservation.findMany({
    where: { agentId },
    select: { montantTotal: true, montantPaye: true, statutPaiement: true, devise: true },
  });
  const agent = await prisma.utilisateur.findUnique({
    where: { id: agentId },
    select: { commissionAgentPourcent: true, nom: true, role: true },
  });
  if (!agent || agent.role !== "AGENT") throw new ErreurInterdit("Compte agent requis");
  const volume = reservations.reduce((s, r) => s + r.montantPaye, 0);
  const commissionEstimee = (volume * (agent.commissionAgentPourcent ?? 2)) / 100;
  return {
    agent: agent.nom,
    nombreReservations: reservations.length,
    volumePaye: volume,
    commissionEstimee,
    tauxCommission: agent.commissionAgentPourcent,
    devise: reservations[0]?.devise ?? "CDF",
  };
}

// --- Canal SMS / USSD (simulation) ---

export async function traiterCanalSms(brut: unknown) {
  const data = schemaCanalSmsInbound.parse(brut);
  const log = await prisma.commandeSms.create({
    data: { telephone: data.telephone, texteBrut: data.texte, statut: "RECU" },
  });

  const texte = data.texte.trim().toUpperCase();
  let resultat = "";
  let interprete: Record<string, unknown> = {};

  try {
    const utilisateur = await prisma.utilisateur.findFirst({
      where: {
        OR: [
          { telephone: data.telephone },
          { telephone: data.telephone.replace(/^\+/, "") },
          { telephone: `+${data.telephone.replace(/^\+/, "")}` },
        ],
      },
    });

    if (texte === "AIDE" || texte === "HELP" || texte === "RESERVA") {
      resultat =
        "RESERVA SMS: SOLDE | MES RDV | GARANTIE <numero> | AIDE. Connexion app pour reserver.";
      interprete = { commande: "AIDE" };
    } else if (texte.startsWith("SOLDE")) {
      if (!utilisateur) throw new ErreurValidation("Numero non enregistre. Inscrivez-vous sur l'app RESERVA.");
      const avoirs = await prisma.avoir.findMany({
        where: { utilisateurId: utilisateur.id, statut: "ACTIF", montantRestant: { gt: 0 } },
      });
      const solde = avoirs.reduce((s, a) => s + a.montantRestant, 0);
      resultat = `RESERVA: solde avoir ${solde} CDF. Points: consultez l'app.`;
      interprete = { commande: "SOLDE", solde };
    } else if (texte.startsWith("MES RDV") || texte.startsWith("MESRDV")) {
      if (!utilisateur) throw new ErreurValidation("Numero non enregistre.");
      const rdv = await prisma.reservation.findMany({
        where: {
          clientId: utilisateur.id,
          statut: { in: ["EN_ATTENTE", "CONFIRMEE", "EN_COURS"] },
        },
        include: { service: true },
        orderBy: { creeLe: "desc" },
        take: 3,
      });
      resultat =
        rdv.length === 0
          ? "RESERVA: aucun RDV a venir."
          : `RESERVA: ${rdv.map((r) => `${r.numero} ${r.service.nom} (${r.statut})`).join(" | ")}`;
      interprete = { commande: "MES_RDV", count: rdv.length };
    } else if (texte.startsWith("GARANTIE ")) {
      if (!utilisateur) throw new ErreurValidation("Numero non enregistre.");
      const numero = data.texte.trim().split(/\s+/)[1];
      const reservation = await prisma.reservation.findFirst({
        where: { numero, clientId: utilisateur.id },
      });
      if (!reservation) throw new ErreurValidation("Reservation introuvable");
      const claim = await reclamerGarantie(utilisateur.id, {
        reservationId: reservation.id,
        motif: "Reclamation via SMS/USSD",
      });
      resultat = `RESERVA GARANTIE OK: avoir ${claim.avoir?.montantRestant ?? 0} CDF cree.`;
      interprete = { commande: "GARANTIE", reservationId: reservation.id };
    } else {
      resultat =
        "Commande inconnue. Envoyez AIDE. Reservations completes via l'app RESERVA (kit famille, corridors).";
      interprete = { commande: "INCONNUE" };
    }

    await envoyerSms(data.telephone, resultat, "canal-sms");
    await prisma.commandeSms.update({
      where: { id: log.id },
      data: {
        statut: "TRAITE",
        interpreteJson: JSON.stringify(interprete),
        resultat,
      },
    });
    return { ok: true, resultat, interprete, commandeId: log.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur";
    await prisma.commandeSms.update({
      where: { id: log.id },
      data: { statut: "ERREUR", resultat: msg, interpreteJson: JSON.stringify(interprete) },
    });
    await envoyerSms(data.telephone, `RESERVA: ${msg}`, "canal-sms");
    return { ok: false, resultat: msg, commandeId: log.id };
  }
}

// --- Mode Pro terrain : file du jour ---

export async function fileTerrainAujourdhui(utilisateurId: string) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) throw new ErreurInterdit("Compte prestataire requis");

  const debut = new Date();
  debut.setHours(0, 0, 0, 0);
  const fin = new Date();
  fin.setHours(23, 59, 59, 999);

  const file = await prisma.reservation.findMany({
    where: {
      prestataireId: prestataire.id,
      statut: { in: ["CONFIRMEE", "EN_COURS", "EN_ATTENTE"] },
      creneau: { debut: { gte: debut, lte: fin } },
    },
    include: {
      client: { select: { nom: true, telephone: true } },
      service: { select: { nom: true, dureeMinutes: true } },
      creneau: true,
    },
    orderBy: { creneau: { debut: "asc" } },
  });

  const enCours = file.find((r) => r.statut === "EN_COURS");
  const suivant = file.find((r) => r.statut === "CONFIRMEE");

  return {
    date: debut.toISOString().slice(0, 10),
    total: file.length,
    enCours: enCours
      ? { numero: enCours.numero, client: enCours.client.nom, service: enCours.service.nom }
      : null,
    prochain: suivant
      ? { numero: suivant.numero, client: suivant.client.nom, service: suivant.service.nom, heure: suivant.creneau.debut }
      : null,
    file: file.map((r, i) => ({
      position: i + 1,
      id: r.id,
      numero: r.numero,
      statut: r.statut,
      client: r.client.nom,
      telephone: r.client.telephone,
      service: r.service.nom,
      debut: r.creneau.debut,
      beneficiaires: r.beneficiairesJson ? JSON.parse(r.beneficiairesJson) : [],
      offlineReady: true,
    })),
  };
}

export async function appelerProchain(utilisateurId: string) {
  const file = await fileTerrainAujourdhui(utilisateurId);
  if (!file.prochain) throw new ErreurValidation("Personne en attente");
  const reservation = await prisma.reservation.findFirst({
    where: { numero: file.prochain.numero },
    include: { client: true },
  });
  if (!reservation) throw new ErreurNonTrouve("Réservation introuvable");
  await envoyerSms(
    reservation.client.telephone,
    `RESERVA: C'est votre tour (${reservation.numero}). Presentez-vous au guichet.`,
    "file-terrain"
  );
  return { message: "Client appelé par SMS", numero: reservation.numero, client: reservation.client.nom };
}

export { recalculerTousLesScores, recalculerConfiancePrestataire };
