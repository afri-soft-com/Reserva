import { env } from "../../config/env";
import { envoyerSmsViaHubAfriSoft } from "./afrisoft-sms.hub";

/**
 * Adaptateur SMS — simulation locale ou hub AfriSoft (sms.afri-soft.com) en production.
 */

interface ResultatEnvoiSms {
  succes: boolean;
  referenceExterne?: string;
}

export async function envoyerSms(telephone: string, message: string, purpose = "sms"): Promise<ResultatEnvoiSms> {
  if (env.MODE_SMS === "simulation") {
    console.log(`\n[SMS SIMULÉ] → ${telephone}\n${message}\n`);
    return { succes: true, referenceExterne: `SIM-${Date.now()}` };
  }

  if (!env.AFRISOFT_HUB_APP_ID || !env.AFRISOFT_HUB_API_KEY) {
    throw new Error(
      "MODE_SMS=production mais AFRISOFT_HUB_APP_ID / AFRISOFT_HUB_API_KEY manquants"
    );
  }

  return envoyerSmsViaHubAfriSoft({ telephone, text: message, purpose });
}

export async function envoyerOtpSms(telephone: string, code: string): Promise<ResultatEnvoiSms> {
  const message = `Votre code RESERVA : ${code} Valide 5 minutes`;
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
