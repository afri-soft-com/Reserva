import crypto from "node:crypto";
import { env } from "../../config/env";
import { OperateurMobileMoney } from "@reserva/shared";
import { obtenirConfigTarif } from "../economie/economie.service";
import {
  initierPaiementViaHubAfriSoft,
  referenceHubPaiement,
  uuidDepuisCle,
} from "./afrisoft-pay.hub";

/**
 * Adaptateur Mobile Money — simulation locale, ou hub AfriSoft (pay.afri-soft.com) en production.
 * Ne jamais appeler SerdiPay / CinetPay directement depuis RESERVA (IP non whitelistée).
 */

export interface ResultatInitiationPaiement {
  succes: boolean;
  referenceExterne: string;
  /** payment_id hub (webhook / polling) */
  paymentId?: string;
  paymentUrl?: string;
  statut: "EN_ATTENTE" | "PAYE" | "ECHOUE";
  messageOperateur?: string;
  /** Montant réellement envoyé au hub (CDF entier) — pour fail-closed webhook */
  amountCdf?: number;
}

export interface ResultatRemboursement {
  succes: boolean;
  referenceExterne: string;
  messageOperateur?: string;
}

/** Convertit un montant métier (CDF ou USD) en francs congolais entiers pour le hub */
export async function montantVersCdf(montant: number, devise: string): Promise<number> {
  const d = (devise || "CDF").toUpperCase();
  if (d === "CDF" || d === "FC") return Math.round(montant);
  if (d === "USD" || d === "$") {
    const { tauxUsdCdf } = await obtenirConfigTarif();
    return Math.round(montant * tauxUsdCdf);
  }
  throw new Error(`Devise non supportée pour Mobile Money : ${devise}`);
}

/** Initie un paiement Mobile Money auprès de l'opérateur choisi */
export async function initierPaiementMobileMoney(params: {
  operateur: OperateurMobileMoney;
  telephonePaiement: string;
  montant: number;
  devise?: string;
  reservationId?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}): Promise<ResultatInitiationPaiement> {
  if (params.operateur === "ESPECES") {
    return {
      succes: true,
      referenceExterne: `ESP-${Date.now()}`,
      statut: "EN_ATTENTE",
      messageOperateur: "Paiement en espèces à régler sur place",
    };
  }

  if (env.MODE_PAIEMENT === "simulation") {
    return simulerPaiement(params.operateur, params.montant);
  }

  if (!params.telephonePaiement?.trim()) {
    return {
      succes: false,
      referenceExterne: "",
      statut: "ECHOUE",
      messageOperateur: "Numéro Mobile Money requis pour le paiement",
    };
  }

  const amountCdf = await montantVersCdf(params.montant, params.devise || "CDF");
  if (amountCdf < 500) {
    return {
      succes: false,
      referenceExterne: "",
      statut: "ECHOUE",
      messageOperateur: `Montant trop faible pour Mobile Money (${amountCdf} FC). Minimum hub : 500 FC.`,
    };
  }

  const appId = env.AFRISOFT_HUB_APP_ID.trim().toLowerCase() || "reserva";
  const uuid = params.idempotencyKey
    ? uuidDepuisCle(`pay:${params.idempotencyKey}`)
    : crypto.randomUUID();
  const reference = referenceHubPaiement(appId, "pay", uuid);
  const idempotencyKey =
    params.idempotencyKey ||
    (params.reservationId
      ? `${appId}:reservation:${params.reservationId}:${amountCdf}`
      : undefined);

  const hub = await initierPaiementViaHubAfriSoft({
    operateur: params.operateur,
    telephone: params.telephonePaiement,
    amountCdf,
    reference,
    purpose: "pay",
    kind: "C2B",
    idempotencyKey,
    metadata: {
      ...(params.metadata || {}),
      reservation_id: params.reservationId,
      montant_metier: params.montant,
      devise: params.devise || "CDF",
    },
  });

  if (!hub.succes) {
    return {
      succes: false,
      referenceExterne: hub.reference || reference,
      paymentId: hub.paymentId,
      statut: "ECHOUE",
      messageOperateur: hub.message || "Échec initiation Mobile Money",
      amountCdf,
    };
  }

  const statut: ResultatInitiationPaiement["statut"] =
    hub.statut === "COMPLETED" ? "PAYE" : hub.statut === "FAILED" ? "ECHOUE" : "EN_ATTENTE";

  return {
    succes: statut !== "ECHOUE",
    referenceExterne: hub.reference || reference,
    paymentId: hub.paymentId,
    paymentUrl: hub.paymentUrl,
    statut,
    messageOperateur:
      hub.message ||
      (statut === "EN_ATTENTE"
        ? "Confirmez le paiement sur votre téléphone Mobile Money."
        : undefined),
    amountCdf: hub.amountCdf ?? amountCdf,
  };
}

/** Simule un paiement Mobile Money — 92% de taux de succès, pour tester aussi les cas d'échec */
async function simulerPaiement(
  operateur: OperateurMobileMoney,
  montant: number
): Promise<ResultatInitiationPaiement> {
  await new Promise((resolve) => setTimeout(resolve, 400));

  const deterministe =
    process.env.CI === "true" ||
    process.env.PAIEMENT_SIM_DETERMINISTE === "1" ||
    process.env.SMOKE_WRITE === "1";
  const succes = deterministe ? true : Math.random() < 0.92;
  const reference = `SIM-${operateur}-${Date.now()}`;

  console.log(
    `\n[PAIEMENT SIMULÉ] ${operateur} — Montant: ${montant} — Statut: ${succes ? "RÉUSSI ✓" : "ÉCHOUÉ ✗"} — Réf: ${reference}\n`
  );

  return {
    succes,
    referenceExterne: reference,
    statut: succes ? "PAYE" : "ECHOUE",
    messageOperateur: succes
      ? "Transaction approuvée par l'opérateur (simulation)"
      : "Solde insuffisant ou transaction refusée par l'opérateur (simulation)",
  };
}

/** Initie un remboursement vers le compte Mobile Money du client (B2C hub) */
export async function rembourserMobileMoney(params: {
  operateur: OperateurMobileMoney;
  telephonePaiement: string;
  montant: number;
  devise?: string;
  reservationId?: string;
}): Promise<ResultatRemboursement> {
  if (params.operateur === "ESPECES") {
    return {
      succes: true,
      referenceExterne: `REMB-ESP-${Date.now()}`,
      messageOperateur: "Remboursement en espèces à traiter manuellement au point de service",
    };
  }

  if (env.MODE_PAIEMENT === "simulation") {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const reference = `REMB-SIM-${Date.now()}`;
    console.log(
      `\n[REMBOURSEMENT SIMULÉ] ${params.operateur} — Montant: ${params.montant} — Réf: ${reference}\n`
    );
    return {
      succes: true,
      referenceExterne: reference,
      messageOperateur: "Remboursement approuvé (simulation)",
    };
  }

  const amountCdf = await montantVersCdf(params.montant, params.devise || "CDF");
  if (amountCdf < 500) {
    return {
      succes: false,
      referenceExterne: "",
      messageOperateur: `Montant trop faible pour remboursement Mobile Money (${amountCdf} FC).`,
    };
  }

  const appId = env.AFRISOFT_HUB_APP_ID.trim().toLowerCase() || "reserva";
  const reference = referenceHubPaiement(appId, "refund");
  const hub = await initierPaiementViaHubAfriSoft({
    operateur: params.operateur,
    telephone: params.telephonePaiement,
    amountCdf,
    reference,
    purpose: "refund",
    kind: "B2C",
    idempotencyKey: params.reservationId
      ? `${appId}:refund:${params.reservationId}:${amountCdf}:${Math.floor(Date.now() / 60_000)}`
      : undefined,
    metadata: {
      reservation_id: params.reservationId,
      montant_metier: params.montant,
      devise: params.devise || "CDF",
    },
  });

  return {
    succes: hub.succes,
    referenceExterne: hub.reference || hub.paymentId || reference,
    messageOperateur: hub.message,
  };
}
