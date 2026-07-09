import { prisma } from "../../config/prisma";
import { ErreurNonTrouve, ErreurValidation, ErreurInterdit } from "../../utils/erreurs";
import { InitierPaiementInput } from "@reserva/shared";
import { initierPaiementMobileMoney } from "./mobilemoney.adapter";
import { ajouterPointsGain } from "../fidelite/fidelite.service";

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
  if (input.montant > montantRestant) {
    throw new ErreurValidation(`Le montant dépasse le solde restant à payer (${montantRestant} ${reservation.devise})`);
  }

  const resultatOperateur = await initierPaiementMobileMoney({
    operateur: input.operateur,
    telephonePaiement: input.telephonePaiement ?? "",
    montant: input.montant,
  });

  const transaction = await prisma.transaction.create({
    data: {
      reservationId: reservation.id,
      operateur: input.operateur,
      montant: input.montant,
      devise: reservation.devise,
      statut: resultatOperateur.statut === "PAYE" ? "PAYE" : resultatOperateur.statut === "ECHOUE" ? "ECHOUE" : "EN_ATTENTE",
      referenceExterne: resultatOperateur.referenceExterne,
      telephonePaiement: input.telephonePaiement,
    },
  });

  // Si le paiement (simulé ou réel) est immédiatement confirmé, met à jour la réservation
  if (resultatOperateur.statut === "PAYE") {
    const nouveauMontantPaye = reservation.montantPaye + input.montant;
    const statutPaiement = nouveauMontantPaye >= reservation.montantTotal ? "PAYE" : "PARTIEL";

    await prisma.reservation.update({
      where: { id: reservation.id },
      data: { montantPaye: nouveauMontantPaye, statutPaiement },
    });

    await prisma.notification.create({
      data: {
        utilisateurId: clientId,
        reservationId: reservation.id,
        titre: "Paiement confirmé",
        message: `Votre paiement de ${input.montant} ${reservation.devise} pour la réservation ${reservation.numero} a été confirmé.`,
        type: "PAIEMENT",
      },
    });

    await ajouterPointsGain(clientId, input.montant, reservation.id).catch(() => {});
  }

  return {
    transaction,
    statutOperateur: resultatOperateur.statut,
    messageOperateur: resultatOperateur.messageOperateur,
  };
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
  const transactionsHtml = reservation.transactions.map((t) =>
    `<tr><td>${new Date(t.creeLe).toLocaleDateString("fr-FR")}</td><td>${t.operateur}</td><td>${t.montant}</td><td>${t.statut}</td></tr>`
  ).join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Reçu RESERVA - ${reservation.numero}</title>
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
    <p class="ref">Réf. ${reservation.numero} | Émis le ${dateEmission}</p>
  </div>
  <div class="grille">
    <div class="bloc">
      <h3>Client</h3>
      <p>${reservation.client.nom}</p>
      <p>${reservation.client.telephone}</p>
    </div>
    <div class="bloc">
      <h3>Prestataire</h3>
      <p>${reservation.prestataire.nomEntreprise}</p>
      <p>${reservation.prestataire.ville}, ${reservation.prestataire.quartier}</p>
    </div>
  </div>
  <div class="grille">
    <div class="bloc">
      <h3>Service</h3>
      <p>${reservation.service.nom}</p>
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
