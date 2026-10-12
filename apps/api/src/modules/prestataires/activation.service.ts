import { genererOtp, DUREE_VALIDITE_OTP_MINUTES } from "@reserva/shared";
import { prisma } from "../../config/prisma";
import { envoyerSms } from "../notifications/sms.adapter";
import { envoyerEmail } from "../notifications/email.adapter";
import { telephoneSynthetiqueGoogle } from "../auth/google.service";

export type ResultatActivation = {
  codeActivation: string;
  canal: "sms" | "email" | "notification";
  destinataire: string;
  message: string;
};

/** Génère un code, l'enregistre (OTP), l'envoie SMS ou email selon le mode d'inscription. */
export async function genererEtEnvoyerCodeActivation(
  utilisateurId: string,
): Promise<ResultatActivation> {
  const user = await prisma.utilisateur.findUnique({ where: { id: utilisateurId } });
  if (!user) throw new Error("Utilisateur introuvable");

  const code = genererOtp();
  const expireLe = new Date(Date.now() + DUREE_VALIDITE_OTP_MINUTES * 60 * 1000);
  await prisma.otp.create({
    data: { utilisateurId, code, expireLe },
  });

  const messageSms = `RESERVA Pro : votre code d'activation est ${code}. Valable ${DUREE_VALIDITE_OTP_MINUTES} min.`;
  const estGoogle = !!user.googleId;
  const telSynthetique =
    estGoogle && user.googleId
      ? telephoneSynthetiqueGoogle(user.googleId) === user.telephone
      : false;

  if (estGoogle && user.email && (telSynthetique || !user.telephoneVerifie)) {
    await envoyerEmail({
      to: user.email,
      sujet: "RESERVA Pro — Code d'activation",
      texte: `Bonjour ${user.nom},\n\nVotre dossier prestataire a été approuvé.\nCode d'activation : ${code}\nValable ${DUREE_VALIDITE_OTP_MINUTES} minutes.\n\nL'équipe RESERVA`,
    });
    await prisma.notification.create({
      data: {
        utilisateurId,
        titre: "Code d'activation",
        message: `Votre code d'activation prestataire : ${code}`,
        type: "SYSTEME",
      },
    });
    return {
      codeActivation: code,
      canal: "email",
      destinataire: user.email,
      message: `Code envoyé par e-mail à ${user.email}`,
    };
  }

  await envoyerSms(user.telephone, messageSms, "otp");
  await prisma.notification.create({
    data: {
      utilisateurId,
      titre: "Code d'activation",
      message: `Votre code d'activation prestataire : ${code}`,
      type: "SYSTEME",
    },
  });
  return {
    codeActivation: code,
    canal: "sms",
    destinataire: user.telephone,
    message: `Code envoyé par SMS au ${user.telephone}`,
  };
}
