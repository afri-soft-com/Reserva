import { env } from "../../config/env";
import { OperateurMobileMoney } from "@reserva/shared";

/**
 * Adaptateur Mobile Money — abstrait les appels aux API des opérateurs congolais
 * (M-Pesa/Vodacom, Airtel Money, Orange Money). En mode "simulation", aucune clé
 * API réelle n'est nécessaire : les paiements sont automatiquement approuvés après
 * un court délai, ce qui permet de développer et démontrer le flux complet sans
 * compte marchand réel.
 *
 * Pour passer en production : renseigner les clés API dans .env (MODE_PAIEMENT=production)
 * et implémenter les appels HTTP réels vers les API de chaque opérateur dans les
 * fonctions correspondantes ci-dessous.
 */

export interface ResultatInitiationPaiement {
  succes: boolean;
  referenceExterne: string;
  statut: "EN_ATTENTE" | "PAYE" | "ECHOUE";
  messageOperateur?: string;
}

export interface ResultatRemboursement {
  succes: boolean;
  referenceExterne: string;
  messageOperateur?: string;
}

/** Initie un paiement Mobile Money auprès de l'opérateur choisi */
export async function initierPaiementMobileMoney(params: {
  operateur: OperateurMobileMoney;
  telephonePaiement: string;
  montant: number;
}): Promise<ResultatInitiationPaiement> {
  if (params.operateur === "ESPECES") {
    // Paiement en espèces : aucun appel externe, statut en attente jusqu'à confirmation manuelle au point de service
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

  // Mode production : appels réels aux API des opérateurs
  switch (params.operateur) {
    case "MPESA":
      throw new Error("Intégration M-Pesa production non implémentée. Renseignez MPESA_API_KEY et complétez ce bloc.");
    case "AIRTEL_MONEY":
      throw new Error("Intégration Airtel Money production non implémentée. Renseignez AIRTEL_MONEY_API_KEY et complétez ce bloc.");
    case "ORANGE_MONEY":
      throw new Error("Intégration Orange Money production non implémentée. Renseignez ORANGE_MONEY_API_KEY et complétez ce bloc.");
    default:
      throw new Error(`Opérateur de paiement non supporté : ${params.operateur}`);
  }
}

/** Simule un paiement Mobile Money — 92% de taux de succès, pour tester aussi les cas d'échec */
async function simulerPaiement(
  operateur: OperateurMobileMoney,
  montant: number
): Promise<ResultatInitiationPaiement> {
  // Petite latence artificielle pour imiter un appel réseau réel
  await new Promise((resolve) => setTimeout(resolve, 400));

  const succes = Math.random() < 0.92;
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

/** Initie un remboursement vers le compte Mobile Money du client */
export async function rembourserMobileMoney(params: {
  operateur: OperateurMobileMoney;
  telephonePaiement: string;
  montant: number;
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
    console.log(`\n[REMBOURSEMENT SIMULÉ] ${params.operateur} — Montant: ${params.montant} — Réf: ${reference}\n`);
    return { succes: true, referenceExterne: reference, messageOperateur: "Remboursement approuvé (simulation)" };
  }

  throw new Error(`Remboursement production non implémenté pour ${params.operateur}. Complétez ce bloc avec l'API réelle.`);
}
