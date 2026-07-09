import { env } from "../../config/env";

/**
 * Adaptateur SMS — abstrait l'envoi de SMS pour permettre de développer sans
 * compte opérateur réel (mode "simulation") et de basculer vers un fournisseur
 * réel (ex: Africa's Talking) en production sans changer le code appelant.
 */

interface ResultatEnvoiSms {
  succes: boolean;
  referenceExterne?: string;
}

export async function envoyerSms(telephone: string, message: string): Promise<ResultatEnvoiSms> {
  if (env.MODE_SMS === "simulation") {
    // En mode simulation, on affiche le SMS dans les logs serveur au lieu de l'envoyer réellement.
    // Pratique pour le développement et les démos sans frais d'opérateur.
    console.log(`\n[SMS SIMULÉ] → ${telephone}\n${message}\n`);
    return { succes: true, referenceExterne: `SIM-${Date.now()}` };
  }

  // Mode production : intégration réelle avec un fournisseur SMS (ex: Africa's Talking)
  // À implémenter avec les vraies clés API lors du passage en production.
  throw new Error(
    "Le mode SMS production n'est pas encore configuré. Renseignez AFRICASTALKING_API_KEY et implémentez l'appel réel dans sms.adapter.ts"
  );
}

export async function envoyerOtpSms(telephone: string, code: string): Promise<ResultatEnvoiSms> {
  const message = `RESERVA : votre code de vérification est ${code}. Valide 10 minutes. Ne le partagez avec personne.`;
  return envoyerSms(telephone, message);
}

export async function envoyerRappelReservation(params: {
  telephone: string;
  numeroReservation: string;
  nomPrestataire: string;
  dateHeure: string;
}): Promise<ResultatEnvoiSms> {
  const message = `RESERVA : Rappel — vous avez un rendez-vous chez ${params.nomPrestataire} le ${params.dateHeure}. Réf : ${params.numeroReservation}`;
  return envoyerSms(params.telephone, message);
}

export async function envoyerConfirmationReservation(params: {
  telephone: string;
  numeroReservation: string;
  nomPrestataire: string;
  dateHeure: string;
}): Promise<ResultatEnvoiSms> {
  const message = `RESERVA : Réservation confirmée chez ${params.nomPrestataire} le ${params.dateHeure}. Réf : ${params.numeroReservation}. Merci de votre confiance !`;
  return envoyerSms(params.telephone, message);
}

export async function envoyerNotificationAnnulation(params: {
  telephone: string;
  numeroReservation: string;
  montantRembourse?: number;
}): Promise<ResultatEnvoiSms> {
  const messageRemboursement = params.montantRembourse
    ? ` Remboursement de ${params.montantRembourse} en cours.`
    : "";
  const message = `RESERVA : Votre réservation ${params.numeroReservation} a été annulée.${messageRemboursement}`;
  return envoyerSms(params.telephone, message);
}
