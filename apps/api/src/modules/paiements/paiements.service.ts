import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { ErreurNonTrouve, ErreurValidation, ErreurInterdit, ErreurConflit } from "../../utils/erreurs";
import { InitierPaiementInput } from "@reserva/shared";
import { initierPaiementMobileMoney } from "./mobilemoney.adapter";
import { referenceHubPaiement, uuidDepuisCle } from "./afrisoft-pay.hub";
import { ajouterPointsGain } from "../fidelite/fidelite.service";
import { enregistrerPaiementReservation } from "../economie/economie.service";

/** Échappe les caractères HTML pour éviter toute injection dans les documents générés */
function echapperHtml(valeur: string | null | undefined): string {
  return String(valeur ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Initie le paiement d'une réservation. Supporte le paiement intégral ou un acompte partiel
 * (US-005 du cahier des charges — acompte de 30% pour les hôtels par exemple).
 */
export async function initierPaiement(clientId: string, input: InitierPaiementInput) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: input.reservationId },
    include: { prestataire: true },
  });

  if (!reservation) {
    throw new ErreurNonTrouve("Réservation non trouvée");
  }
  if (reservation.clientId !== clientId) {
    throw new ErreurInterdit("Vous ne pouvez payer que vos propres réservations");
  }
  if (reservation.statut === "ANNULEE" || reservation.statut === "REFUSEE") {
    throw new ErreurValidation("Cette réservation ne peut plus être payée");
  }
  if (reservation.statutPaiement === "PAYE") {
    throw new ErreurValidation("Cette réservation est déjà payée intégralement");
  }

  const montantRestant = reservation.montantTotal - reservation.montantPaye;
  // Acompte échelonné : si demandé, plafonner au % acompte de la réservation
  let montantAPayer = input.montant;
  if (input.acompteUniquement && reservation.statutPaiement === "EN_ATTENTE") {
    const pct = reservation.acomptePourcent > 0 ? reservation.acomptePourcent : 30;
    const plafondAcompte = Math.round((reservation.montantTotal * pct) / 100);
    if (montantAPayer > plafondAcompte) montantAPayer = plafondAcompte;
  }
  if (montantAPayer > montantRestant) {
    throw new ErreurValidation(`Le montant dépasse le solde restant à payer (${montantRestant} ${reservation.devise})`);
  }
  input = { ...input, montant: montantAPayer };

  const cleIdempotence = input.idempotencyKey?.trim();
  // Référence hub déterministe si clé client → lookup local avant appel opérateur
  let referenceAttendue: string | undefined;
  if (cleIdempotence) {
    const appId = env.AFRISOFT_HUB_APP_ID.trim().toLowerCase() || "reserva";
    referenceAttendue = referenceHubPaiement(appId, "pay", uuidDepuisCle(`pay:${cleIdempotence}`));
    const existante = await prisma.transaction.findFirst({
      where: {
        reservationId: reservation.id,
        OR: [
          { referenceExterne: cleIdempotence },
          { referenceExterne: referenceAttendue },
        ],
      },
    });
    if (existante) {
      return {
        transaction: existante,
        statutOperateur: existante.statut,
        messageOperateur: "Paiement déjà enregistré (idempotent)",
        idempotent: true,
      };
    }
  }

  const resultatOperateur = await initierPaiementMobileMoney({
    operateur: input.operateur,
    telephonePaiement: input.telephonePaiement ?? "",
    montant: input.montant,
    devise: reservation.devise,
    reservationId: reservation.id,
    idempotencyKey: cleIdempotence,
    metadata: { numero_reservation: reservation.numero, client_id: clientId },
  });

  // Simulation : conserver la clé client comme référence pour l'idempotence locale.
  // Production : référence hub (`{app}_pay_{uuid}`) pour le matching webhook.
  const referenceExterne =
    env.MODE_PAIEMENT === "simulation" && cleIdempotence
      ? cleIdempotence
      : resultatOperateur.referenceExterne ||
        referenceAttendue ||
        resultatOperateur.paymentId ||
        `TX-${Date.now()}`;

  const transaction = await prisma.transaction.create({
    data: {
      reservationId: reservation.id,
      operateur: input.operateur,
      montant: input.montant,
      devise: reservation.devise,
      statut:
        resultatOperateur.statut === "PAYE"
          ? "PAYE"
          : resultatOperateur.statut === "ECHOUE"
            ? "ECHOUE"
            : "EN_ATTENTE",
      referenceExterne,
      telephonePaiement: input.telephonePaiement,
    },
  });

  if (resultatOperateur.statut === "PAYE") {
    await appliquerPaiementConfirme(transaction.id);
  }

  const maj = await prisma.transaction.findUnique({ where: { id: transaction.id } });

  return {
    transaction: maj ?? transaction,
    statutOperateur: resultatOperateur.statut,
    messageOperateur: resultatOperateur.messageOperateur,
    paymentUrl: resultatOperateur.paymentUrl,
    paymentId: resultatOperateur.paymentId,
  };
}

/**
 * Applique un paiement confirmé (simulation immédiate ou webhook hub COMPLETED).
 * Idempotent : ignore si la transaction n'est plus EN_ATTENTE.
 */
export async function appliquerPaiementConfirme(transactionId: string) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { reservation: true },
  });
  if (!transaction) {
    throw new ErreurNonTrouve("Transaction non trouvée");
  }
  if (transaction.statut === "PAYE") {
    return { dejaTraite: true, transaction };
  }
  if (transaction.statut !== "EN_ATTENTE") {
    throw new ErreurValidation(`Transaction non confirmable (statut ${transaction.statut})`);
  }

  const reservation = transaction.reservation;
  const montantAvant = reservation.montantPaye;
  const nouveauMontantPaye = montantAvant + transaction.montant;
  const statutPaiement = nouveauMontantPaye >= reservation.montantTotal ? "PAYE" : "PARTIEL";

  await prisma.$transaction(async (tx) => {
    const majTx = await tx.transaction.updateMany({
      where: { id: transaction.id, statut: "EN_ATTENTE" },
      data: { statut: "PAYE" },
    });
    if (majTx.count === 0) return;

    const maj = await tx.reservation.updateMany({
      where: { id: reservation.id, montantPaye: montantAvant },
      data: { montantPaye: nouveauMontantPaye, statutPaiement },
    });
    if (maj.count === 0) {
      throw new ErreurConflit("Paiement concurrent détecté. Vérifiez le solde et réessayez.");
    }
    await enregistrerPaiementReservation(tx, reservation, transaction.montant);
  });

  await prisma.notification.create({
    data: {
      utilisateurId: reservation.clientId,
      reservationId: reservation.id,
      titre: "Paiement confirmé",
      message: `Votre paiement de ${transaction.montant} ${reservation.devise} pour la réservation ${reservation.numero} a été confirmé.`,
      type: "PAIEMENT",
    },
  });

  await ajouterPointsGain(reservation.clientId, transaction.montant, reservation.id).catch(() => {});

  const maj = await prisma.transaction.findUnique({ where: { id: transaction.id } });
  return { dejaTraite: false, transaction: maj };
}

/** Marque une transaction en échec (webhook payment.failed) — idempotent */
export async function marquerPaiementEchoue(transactionId: string, motif?: string) {
  const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!transaction) throw new ErreurNonTrouve("Transaction non trouvée");
  if (transaction.statut === "PAYE" || transaction.statut === "ECHOUE") {
    return { dejaTraite: true, transaction };
  }
  const maj = await prisma.transaction.update({
    where: { id: transactionId },
    data: { statut: "ECHOUE" },
  });
  if (motif) {
    await prisma.notification.create({
      data: {
        utilisateurId: (
          await prisma.reservation.findUniqueOrThrow({
            where: { id: transaction.reservationId },
            select: { clientId: true },
          })
        ).clientId,
        reservationId: transaction.reservationId,
        titre: "Paiement échoué",
        message: motif.slice(0, 400),
        type: "PAIEMENT",
      },
    });
  }
  return { dejaTraite: false, transaction: maj };
}

/**
 * Traite un webhook hub AfriSoft (payment.completed / payment.failed).
 * Fail-closed sur le montant CDF attendu (métadonnée ou conversion).
 */
export async function traiterWebhookAfriSoft(payload: {
  event?: string;
  payment_id?: string;
  status?: string;
  reference?: string;
  amount_cdf?: number;
  purpose?: string;
  failure_reason?: string;
  metadata?: Record<string, unknown>;
}) {
  const purpose = String(payload.purpose || "pay").toLowerCase();
  // Les payouts (refund) sont suivis séparément — pas de crédit réservation
  if (purpose === "withdraw" || purpose === "refund") {
    return { ignore: true, raison: "payout" };
  }

  const refs = [payload.reference, payload.payment_id].filter(Boolean) as string[];
  if (refs.length === 0) {
    throw new ErreurValidation("Webhook sans reference / payment_id");
  }

  const transaction = await prisma.transaction.findFirst({
    where: { referenceExterne: { in: refs } },
    include: { reservation: true },
  });
  if (!transaction) {
    // Accepter 200 pour éviter les retries infinis sur orphelins inconnus
    return { ignore: true, raison: "transaction_introuvable" };
  }

  const status = String(payload.status || "").toUpperCase();
  const event = String(payload.event || "").toLowerCase();

  if (status === "FAILED" || event.includes("failed")) {
    return marquerPaiementEchoue(transaction.id, payload.failure_reason || "Paiement refusé par l'opérateur");
  }

  if (status !== "COMPLETED" && !event.includes("completed")) {
    return { ignore: true, raison: "statut_non_final" };
  }

  // Fail-closed : si le hub envoie amount_cdf, vérifier vs montant métier converti
  if (typeof payload.amount_cdf === "number" && Number.isFinite(payload.amount_cdf)) {
    const { montantVersCdf } = await import("./mobilemoney.adapter");
    const attendu = await montantVersCdf(transaction.montant, transaction.devise);
    if (Math.abs(payload.amount_cdf - attendu) > 1) {
      console.error(
        `[WEBHOOK PAY] montant mismatch tx=${transaction.id} hub=${payload.amount_cdf} attendu=${attendu}`
      );
      throw new ErreurValidation("Montant webhook incohérent avec la transaction");
    }
  }

  return appliquerPaiementConfirme(transaction.id);
}

/** Liste l'historique des transactions d'une réservation */
export async function listerTransactionsReservation(utilisateurId: string, reservationId: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { prestataire: { include: { utilisateur: true } } },
  });
  if (!reservation) {
    throw new ErreurNonTrouve("Réservation non trouvée");
  }

  const aAcces = reservation.clientId === utilisateurId || reservation.prestataire.utilisateur.id === utilisateurId;
  if (!aAcces) {
    throw new ErreurInterdit("Accès refusé à cette ressource");
  }

  return prisma.transaction.findMany({ where: { reservationId }, orderBy: { creeLe: "desc" } });
}

/** Génère un reçu au format HTML prêt à être imprimé / converti en PDF côté client */
export async function genererRecuHtml(utilisateurId: string, reservationId: string): Promise<string> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { client: true, prestataire: { include: { utilisateur: true } }, service: true, creneau: true, transactions: { where: { statut: "PAYE" } } },
  });

  if (!reservation) {
    throw new ErreurNonTrouve("Réservation non trouvée");
  }
  if (reservation.clientId !== utilisateurId && reservation.prestataire.utilisateur.id !== utilisateurId) {
    throw new ErreurInterdit("Accès refusé à ce reçu");
  }

  const dateEmission = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const dateService = new Date(reservation.creneau.debut).toLocaleString("fr-FR");
  const devise = reservation.devise === "USD" ? "$" : "FC";
  const montantTotal = reservation.devise === "USD"
    ? `$${reservation.montantTotal.toFixed(2)}`
    : `${reservation.montantTotal.toLocaleString("fr-FR")} FC`;
  const montantPaye = reservation.devise === "USD"
    ? `$${reservation.montantPaye.toFixed(2)}`
    : `${reservation.montantPaye.toLocaleString("fr-FR")} FC`;
  const numero = echapperHtml(reservation.numero);
  const nomClient = echapperHtml(reservation.client.nom);
  const telephoneClient = echapperHtml(reservation.client.telephone);
  const nomEntreprise = echapperHtml(reservation.prestataire.nomEntreprise);
  const adressePrestataire = `${echapperHtml(reservation.prestataire.ville)}, ${echapperHtml(reservation.prestataire.quartier)}`;
  const nomService = echapperHtml(reservation.service.nom);
  const transactionsHtml = reservation.transactions.map((t) =>
    `<tr><td>${new Date(t.creeLe).toLocaleDateString("fr-FR")}</td><td>${echapperHtml(t.operateur)}</td><td>${t.montant}</td><td>${t.statut}</td></tr>`
  ).join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Reçu RESERVA - ${numero}</title>
<style>
  body { font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 20px; color: #1F2937; }
  .en-tete { text-align: center; border-bottom: 2px solid #1A56DB; padding-bottom: 16px; margin-bottom: 20px; }
  .en-tete h1 { color: #1A56DB; margin: 0; font-size: 24px; }
  .en-tete p { color: #6B7280; margin: 4px 0; }
  .ref { font-size: 12px; color: #6B7280; font-family: monospace; }
  .grille { display: flex; justify-content: space-between; margin-bottom: 20px; }
  .bloc { width: 48%; }
  .bloc h3 { color: #0F2A5E; font-size: 12px; text-transform: uppercase; margin: 0 0 4px; }
  .bloc p { margin: 2px 0; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th { background: #EBF2FF; text-align: left; padding: 8px; font-size: 12px; color: #0F2A5E; }
  td { padding: 8px; border-bottom: 1px solid #E5E7EB; font-size: 13px; }
  .total { text-align: right; margin-top: 16px; font-size: 18px; font-weight: bold; color: #0F2A5E; }
  .pied { margin-top: 32px; text-align: center; font-size: 11px; color: #9CA3AF; }
  @media print { body { padding: 0; } }
</style></head>
<body>
  <div class="en-tete">
    <h1>RESERVA</h1>
    <p>Reçu de paiement — Réservez. Sereinement.</p>
    <p class="ref">Réf. ${numero} | Émis le ${dateEmission}</p>
  </div>
  <div class="grille">
    <div class="bloc">
      <h3>Client</h3>
      <p>${nomClient}</p>
      <p>${telephoneClient}</p>
    </div>
    <div class="bloc">
      <h3>Prestataire</h3>
      <p>${nomEntreprise}</p>
      <p>${adressePrestataire}</p>
    </div>
  </div>
  <div class="grille">
    <div class="bloc">
      <h3>Service</h3>
      <p>${nomService}</p>
    </div>
    <div class="bloc">
      <h3>Date du service</h3>
      <p>${dateService}</p>
    </div>
  </div>
  <table>
    <thead><tr><th>Date</th><th>Opérateur</th><th>Montant</th><th>Statut</th></tr></thead>
    <tbody>${transactionsHtml || "<tr><td colspan='4'>Aucune transaction enregistrée</td></tr>"}</tbody>
  </table>
  <div class="total">Total : ${montantTotal} | Payé : ${montantPaye}</div>
  <div class="pied">RESERVA RDC — Document généré automatiquement. Fait à Kinshasa, le ${dateEmission}.</div>
</body></html>`;
}

/** Génère un rapport CSV des réservations pour un prestataire (export) */
export async function genererRapportCsv(utilisateurId: string, dateDebut?: string, dateFin?: string): Promise<string> {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) {
    throw new ErreurNonTrouve("Profil prestataire non trouvé");
  }

  const filtreDate: any = {};
  if (dateDebut) filtreDate.gte = new Date(dateDebut);
  if (dateFin) filtreDate.lte = new Date(dateFin);

  const reservations = await prisma.reservation.findMany({
    where: {
      prestataireId: prestataire.id,
      ...(filtreDate.gte || filtreDate.lte ? { creneau: { debut: filtreDate } } : {}),
    },
    include: { client: { select: { nom: true, telephone: true } }, service: true, creneau: true },
    orderBy: { creneau: { debut: "desc" } },
  });

  const lignes = [
    ["Numéro", "Client", "Téléphone", "Service", "Date", "Statut", "Montant", "Devise", "Payé", "Créé le"].join(","),
    ...reservations.map((r) =>
      [
        r.numero,
        `"${r.client.nom}"`,
        r.client.telephone,
        `"${r.service.nom}"`,
        r.creneau.debut.toISOString(),
        r.statut,
        r.montantTotal,
        r.devise,
        r.montantPaye,
        r.creeLe.toISOString(),
      ].join(",")
    ),
  ];

  return lignes.join("\n");
}

/** Calcule la plage [debut, fin) correspondant à la période demandée (jour / semaine / mois) */
function plagePeriode(periode: string): { debut: Date; fin: Date; libelle: string } {
  const maintenant = new Date();
  const debut = new Date(maintenant);
  const fin = new Date(maintenant);
  let libelle: string;

  if (periode === "jour") {
    debut.setHours(0, 0, 0, 0);
    fin.setHours(0, 0, 0, 0);
    fin.setDate(fin.getDate() + 1);
    libelle = `Aujourd'hui (${debut.toLocaleDateString("fr-FR")})`;
  } else if (periode === "semaine") {
    const jour = debut.getDay();
    const ecartLundi = jour === 0 ? -6 : 1 - jour;
    debut.setHours(0, 0, 0, 0);
    debut.setDate(debut.getDate() + ecartLundi);
    fin.setTime(debut.getTime());
    fin.setDate(fin.getDate() + 7);
    libelle = `Semaine du ${debut.toLocaleDateString("fr-FR")} au ${new Date(fin.getTime() - 1).toLocaleDateString("fr-FR")}`;
  } else {
    debut.setDate(1);
    debut.setHours(0, 0, 0, 0);
    fin.setMonth(fin.getMonth() + 1, 1);
    fin.setHours(0, 0, 0, 0);
    libelle = `Mois de ${debut.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`;
  }
  return { debut, fin, libelle };
}

/** Génère un rapport PDF des réservations du prestataire (US-009 — export journalier, hebdomadaire ou mensuel) */
export async function genererRapportPdf(utilisateurId: string, periode = "mois", serviceId?: string): Promise<Buffer> {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) {
    throw new ErreurNonTrouve("Profil prestataire non trouvé");
  }

  const plage = plagePeriode(periode);
  const reservations = await prisma.reservation.findMany({
    where: {
      prestataireId: prestataire.id,
      ...(serviceId ? { serviceId } : {}),
      creneau: { debut: { gte: plage.debut, lt: plage.fin } },
    },
    include: { client: { select: { nom: true, telephone: true } }, service: true, creneau: true },
    orderBy: { creneau: { debut: "asc" } },
  });

  const PDFDocument = require("pdfkit");
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const buffers: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => buffers.push(chunk));

  const bleu = "#1A56DB";
  const gris = "#6B7280";

  doc.font("Helvetica-Bold").fontSize(24).fillColor(bleu).text("RESERVA", { align: "center" });
  doc.font("Helvetica").fontSize(10).fillColor(gris).text("Rapport des réservations — Réservez. Sereinement.", { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(8).fillColor(gris).text(`Prestataire : ${prestataire.nomEntreprise} (${prestataire.ville})`, { align: "center" });
  doc.fontSize(8).fillColor(gris).text(`${plage.libelle} | Généré le ${new Date().toLocaleString("fr-FR")}`, { align: "center" });
  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(bleu).lineWidth(2).stroke();
  doc.moveDown(0.5);

  const cols = [50, 160, 255, 325, 395, 470];
  const largeurs = [100, 90, 60, 60, 60, 60];
  const libelles = ["Date", "Client", "Téléphone", "Service", "Statut", "Montant"];
  const yEnTete = doc.y;
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#0F2A5E");
  libelles.forEach((l, i) => doc.text(l, cols[i], yEnTete, { width: largeurs[i] }));
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#EBF2FF").lineWidth(1).stroke();
  doc.moveDown(0.3);

  if (reservations.length === 0) {
    doc.font("Helvetica").fontSize(9).fillColor(gris).text("Aucune réservation sur cette période.", 50, doc.y);
  } else {
    for (const r of reservations) {
      if (doc.y > 740) {
        doc.addPage();
        doc.moveDown(0.5);
      }
      const y = doc.y;
      doc.font("Helvetica").fontSize(9).fillColor("#1F2937");
      doc.text(new Date(r.creneau.debut).toLocaleString("fr-FR"), cols[0], y, { width: largeurs[0] });
      doc.text(r.client.nom, cols[1], y, { width: largeurs[1] });
      doc.text(r.client.telephone, cols[2], y, { width: largeurs[2] });
      doc.text(r.service.nom, cols[3], y, { width: largeurs[3] });
      doc.text(r.statut, cols[4], y, { width: largeurs[4] });
      doc.text(`${r.montantTotal} ${r.devise === "USD" ? "$" : "FC"}`, cols[5], y, { width: largeurs[5] });
      doc.moveDown(0.5);
    }
  }

  doc.moveDown(1);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#E5E7EB").lineWidth(1).stroke();
  doc.moveDown(0.5);

  const totalMontants = reservations.reduce((s, r) => s + r.montantTotal, 0);
  const totalPaye = reservations.reduce((s, r) => s + r.montantPaye, 0);
  const devise = reservations[0]?.devise === "USD" ? "$" : "FC";
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#0F2A5E").text(
    `Total : ${reservations.length} réservation(s) | Montant global : ${totalMontants} ${devise} | Payé : ${totalPaye} ${devise}`,
    { align: "right" }
  );

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

/** Génère un reçu PDF téléchargeable via PDFKit */
export async function genererRecuPdf(utilisateurId: string, reservationId: string): Promise<Buffer> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { client: true, prestataire: { include: { utilisateur: true } }, service: true, creneau: true, transactions: { where: { statut: "PAYE" } } },
  });

  if (!reservation) {
    throw new ErreurNonTrouve("Réservation non trouvée");
  }
  if (reservation.clientId !== utilisateurId && reservation.prestataire.utilisateur.id !== utilisateurId) {
    throw new ErreurInterdit("Accès refusé à ce reçu");
  }

  const PDFDocument = require("pdfkit");
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const buffers: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => buffers.push(chunk));

  const devise = reservation.devise === "USD" ? "$" : "FC";
  const bleu = "#1A56DB";
  const gris = "#6B7280";

  doc.font("Helvetica-Bold").fontSize(24).fillColor(bleu).text("RESERVA", { align: "center" });
  doc.font("Helvetica").fontSize(10).fillColor(gris).text("Reçu de paiement — Réservez. Sereinement.", { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(8).fillColor(gris).text(`Réf. ${reservation.numero} | Émis le ${new Date().toLocaleDateString("fr-FR")}`, { align: "center" });
  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(bleu).lineWidth(2).stroke();
  doc.moveDown(0.5);

  const yStart = doc.y;
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#0F2A5E").text("CLIENT", 50, yStart);
  doc.font("Helvetica").fontSize(10).fillColor("#1F2937").text(reservation.client.nom, 50, doc.y + 2);
  doc.text(reservation.client.telephone, 50);

  doc.font("Helvetica-Bold").fontSize(8).fillColor("#0F2A5E").text("PRESTATAIRE", 310, yStart);
  doc.font("Helvetica").fontSize(10).fillColor("#1F2937").text(reservation.prestataire.nomEntreprise, 310, doc.y + 2);
  doc.text(`${reservation.prestataire.ville}, ${reservation.prestataire.quartier}`, 310);

  doc.moveDown(1);
  const yService = doc.y;
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#0F2A5E").text("SERVICE", 50, yService);
  doc.font("Helvetica").fontSize(10).fillColor("#1F2937").text(reservation.service.nom, 50, doc.y + 2);

  doc.font("Helvetica-Bold").fontSize(8).fillColor("#0F2A5E").text("DATE DU SERVICE", 310, yService);
  doc.font("Helvetica").fontSize(10).fillColor("#1F2937").text(new Date(reservation.creneau.debut).toLocaleString("fr-FR"), 310, doc.y + 2);

  doc.moveDown(1.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#E5E7EB").lineWidth(1).stroke();
  doc.moveDown(0.3);

  const tableTop = doc.y;
  const cols = [50, 180, 310, 420];
  const colWidths = [120, 120, 100, 80];
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#0F2A5E");
  doc.text("Date", cols[0], tableTop, { width: colWidths[0] });
  doc.text("Opérateur", cols[1], tableTop, { width: colWidths[1] });
  doc.text("Montant", cols[2], tableTop, { width: colWidths[2] });
  doc.text("Statut", cols[3], tableTop, { width: colWidths[3] });

  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#EBF2FF").lineWidth(1).stroke();
  doc.moveDown(0.3);

  const transactions = reservation.transactions;
  if (transactions.length > 0) {
    for (const t of transactions) {
      const rowY = doc.y;
      doc.font("Helvetica").fontSize(9).fillColor("#1F2937");
      doc.text(new Date(t.creeLe).toLocaleDateString("fr-FR"), cols[0], rowY, { width: colWidths[0] });
      doc.text(t.operateur, cols[1], rowY, { width: colWidths[1] });
      doc.text(`${t.montant}`, cols[2], rowY, { width: colWidths[2] });
      doc.text(t.statut, cols[3], rowY, { width: colWidths[3] });
      doc.moveDown(0.5);
    }
  } else {
    doc.font("Helvetica").fontSize(9).fillColor(gris).text("Aucune transaction enregistrée", 50, doc.y);
  }

  doc.moveDown(1);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#E5E7EB").lineWidth(1).stroke();
  doc.moveDown(0.5);

  const totalStr = `${reservation.montantTotal} ${devise}`;
  const payeStr = `${reservation.montantPaye} ${devise}`;
  doc.font("Helvetica-Bold").fontSize(14).fillColor("#0F2A5E").text(`Total : ${totalStr}  |  Payé : ${payeStr}`, { align: "right" });

  doc.moveDown(2);
  doc.font("Helvetica").fontSize(8).fillColor("#9CA3AF").text(
    `RESERVA RDC — Document généré automatiquement. Fait à Kinshasa, le ${new Date().toLocaleDateString("fr-FR")}.`,
    { align: "center" }
  );

  doc.end();
  return new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(buffers)));
  });
}

/** Génère un reçu simplifié (objet structuré — la mise en page PDF sera faite côté frontend ou via un futur module dédié) */
export async function genererRecu(utilisateurId: string, reservationId: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { client: true, prestataire: { include: { utilisateur: true } }, service: true, creneau: true, transactions: { where: { statut: "PAYE" } } },
  });

  if (!reservation) {
    throw new ErreurNonTrouve("Réservation non trouvée");
  }
  if (reservation.clientId !== utilisateurId && reservation.prestataire.utilisateur.id !== utilisateurId) {
    throw new ErreurInterdit("Accès refusé à ce reçu");
  }
  if (reservation.statutPaiement === "EN_ATTENTE") {
    throw new ErreurValidation("Aucun paiement enregistré pour cette réservation");
  }

  return {
    numeroReservation: reservation.numero,
    dateEmission: new Date().toISOString(),
    client: { nom: reservation.client.nom, telephone: reservation.client.telephone },
    prestataire: { nom: reservation.prestataire.nomEntreprise, ville: reservation.prestataire.ville },
    service: reservation.service.nom,
    dateService: reservation.creneau.debut.toISOString(),
    montantTotal: reservation.montantTotal,
    montantPaye: reservation.montantPaye,
    devise: reservation.devise,
    statutPaiement: reservation.statutPaiement,
    transactions: reservation.transactions.map((t) => ({
      operateur: t.operateur,
      montant: t.montant,
      reference: t.referenceExterne,
      date: t.creeLe.toISOString(),
    })),
  };
}
