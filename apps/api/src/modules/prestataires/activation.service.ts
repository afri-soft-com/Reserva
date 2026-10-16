import { genererOtp, DUREE_VALIDITE_OTP_MINUTES } from "@reserva/shared";
import { prisma } from "../../config/prisma";
import { envoyerSms } from "../notifications/sms.adapter";
import { envoyerEmail } from "../notifications/email.adapter";
import { telephoneSynthetiqueGoogle } from "../auth/google.service";
import { ErreurNonTrouve, ErreurValidation, ErreurInterdit } from "../../utils/erreurs";

/** Préfixe stocké dans OTP pour distinguer activation vs login */
const PREFIXE_ACTIVATION = "ACT:";

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

  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (prestataire?.activationConfirmeeLe) {
    throw new ErreurValidation("Ce compte prestataire est déjà activé");
  }

  const code = genererOtp();
  const expireLe = new Date(Date.now() + DUREE_VALIDITE_OTP_MINUTES * 60 * 1000);
  // Invalide les anciens codes d'activation non utilisés
  await prisma.otp.deleteMany({
    where: { utilisateurId, code: { startsWith: PREFIXE_ACTIVATION }, utilise: false },
  }).catch(() => undefined);

  await prisma.otp.create({
    data: { utilisateurId, code: `${PREFIXE_ACTIVATION}${code}`, expireLe },
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
      texte: `Bonjour ${user.nom},\n\nVotre dossier prestataire a été approuvé.\nEntrez ce code dans RESERVA Pro pour activer votre espace de travail.\nCode : ${code}\nValable ${DUREE_VALIDITE_OTP_MINUTES} minutes.\n\nL'équipe RESERVA`,
    });
    await prisma.notification.create({
      data: {
        utilisateurId,
        titre: "Code d'activation requis",
        message: "Votre dossier est approuvé. Saisissez le code reçu par e-mail pour ouvrir votre espace Pro.",
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
      titre: "Code d'activation requis",
      message: "Votre dossier est approuvé. Saisissez le code reçu par SMS pour ouvrir votre espace Pro.",
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

/** Vérifie le code d'activation et débloque l'espace prestataire. */
export async function verifierCodeActivation(utilisateurId: string, codeBrut: string) {
  const code = codeBrut.replace(/\D/g, "").trim();
  if (code.length !== 6) {
    throw new ErreurValidation("Le code d'activation doit contenir 6 chiffres");
  }

  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) throw new ErreurNonTrouve("Profil prestataire non trouvé");
  if (prestataire.statut !== "APPROUVE") {
    throw new ErreurInterdit("Votre profil doit d'abord être approuvé par RESERVA");
  }
  if (prestataire.activationConfirmeeLe) {
    return { active: true, dejaActive: true };
  }

  const otp = await prisma.otp.findFirst({
    where: {
      utilisateurId,
      code: `${PREFIXE_ACTIVATION}${code}`,
      utilise: false,
      expireLe: { gte: new Date() },
    },
    orderBy: { creeLe: "desc" },
  });
  if (!otp) {
    throw new ErreurValidation("Code d'activation invalide ou expiré");
  }

  await prisma.$transaction([
    prisma.otp.update({ where: { id: otp.id }, data: { utilise: true } }),
    prisma.prestataire.update({
      where: { id: prestataire.id },
      data: { activationConfirmeeLe: new Date() },
    }),
  ]);

  await prisma.notification.create({
    data: {
      utilisateurId,
      titre: "Espace Pro activé",
      message: "Bienvenue ! Votre espace de travail prestataire est maintenant ouvert.",
      type: "SYSTEME",
    },
  }).catch(() => undefined);

  return { active: true, dejaActive: false };
}

export async function renvoyerCodeActivation(utilisateurId: string) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) throw new ErreurNonTrouve("Profil prestataire non trouvé");
  if (prestataire.statut !== "APPROUVE") {
    throw new ErreurInterdit("Votre profil doit d'abord être approuvé");
  }
  if (prestataire.activationConfirmeeLe) {
    throw new ErreurValidation("Ce compte est déjà activé");
  }
  // Masquer le code dans la réponse publique (admin le voit encore via valider)
  const resultat = await genererEtEnvoyerCodeActivation(utilisateurId);
  return {
    canal: resultat.canal,
    destinataire: resultat.destinataire,
    message: resultat.message,
  };
}
