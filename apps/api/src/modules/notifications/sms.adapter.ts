import { env } from "../../config/env";
import { envoyerSmsViaHubAfriSoft } from "./afrisoft-sms.hub";

/**
 * Adaptateur SMS — simulation locale ou hub AfriSoft (sms.afri-soft.com) en production.
 */

interface ResultatEnvoiSms {
  succes: boolean;
  referenceExterne?: string;
}

/**
 * Envoi SMS. Les purposes « otp » restent critiques (échec → exception).
 * Confirmation / rappel / annulation : best-effort — un échec hub ne doit pas
 * faire échouer l’acceptation ou l’annulation d’une réservation (500 smoke).
 */
export async function envoyerSms(
  telephone: string,
  message: string,
  purpose = "sms"
): Promise<ResultatEnvoiSms> {
  const critique = purpose === "otp";

  if (env.MODE_SMS === "simulation") {
    console.log(`\n[SMS SIMULÉ] → ${telephone}\n${message}\n`);
    return { succes: true, referenceExterne: `SIM-${Date.now()}` };
  }

  if (!env.AFRISOFT_HUB_APP_ID || !env.AFRISOFT_HUB_API_KEY) {
    const err = new Error(
      "MODE_SMS=production mais AFRISOFT_HUB_APP_ID / AFRISOFT_HUB_API_KEY manquants"
    );
    if (critique) throw err;
    console.error(`[SMS] ${err.message} (purpose=${purpose})`);
    return { succes: false };
  }

  try {
    return await envoyerSmsViaHubAfriSoft({ telephone, text: message, purpose });
  } catch (e) {
    if (critique) throw e;
    console.error(`[SMS] échec non bloquant (${purpose}) → ${telephone}:`, e);
    return { succes: false };
  }
}

export async function envoyerOtpSms(telephone: string, code: string): Promise<ResultatEnvoiSms> {
  // Format optimisé autofill iOS/Android (one-time-code / Messages).
  // Hash Android SMS Retriever optionnel via SMS_APP_HASH (11 car.).
  const hash = (process.env.SMS_APP_HASH || "").trim();
  const base = `RESERVA: votre code est ${code}. Valide 5 minutes.`;
  const message = hash
    ? `<#> ${base}\n${hash}`
    : `${base}\n@reserva.app #${code}`;
  return envoyerSms(telephone, message, "otp");
}

export async function envoyerRappelReservation(params: {
  telephone: string;
  numeroReservation: string;
  nomPrestataire: string;
  dateHeure: string;
}): Promise<ResultatEnvoiSms> {
  const message = `RESERVA : Rappel — RDV chez ${params.nomPrestataire} le ${params.dateHeure}. Réf : ${params.numeroReservation}`;
  return envoyerSms(params.telephone, message, "rappel");
}

export async function envoyerConfirmationReservation(params: {
  telephone: string;
  numeroReservation: string;
  nomPrestataire: string;
  dateHeure: string;
}): Promise<ResultatEnvoiSms> {
  const message = `RESERVA : Réservation confirmée chez ${params.nomPrestataire} le ${params.dateHeure}. Réf : ${params.numeroReservation}`;
  return envoyerSms(params.telephone, message, "confirmation");
}

export async function envoyerNotificationAnnulation(params: {
  telephone: string;
  numeroReservation: string;
  montantRembourse?: number;
}): Promise<ResultatEnvoiSms> {
  const messageRemboursement = params.montantRembourse
    ? ` Remboursement de ${params.montantRembourse} en cours.`
    : "";
  const message = `RESERVA : Réservation ${params.numeroReservation} annulée.${messageRemboursement}`;
  return envoyerSms(params.telephone, message, "annulation");
}
