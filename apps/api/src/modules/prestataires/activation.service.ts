import { genererOtp, DUREE_VALIDITE_OTP_MINUTES } from "@reserva/shared";
import { prisma } from "../../config/prisma";
import { envoyerOtpSms } from "../notifications/sms.adapter";
import { telephoneSynthetiqueGoogle } from "../auth/google.service";
import { ErreurNonTrouve, ErreurValidation, ErreurInterdit } from "../../utils/erreurs";

/** Préfixe stocké dans OTP pour distinguer activation vs login */
const PREFIXE_ACTIVATION = "ACT:";

export type ResultatActivation = {
  codeActivation: string;
  canal: "sms";
  destinataire: string;
  message: string;
};

/** Numéro Google fictif (+2439 + hash) : un SMS ne peut pas y arriver. */
export function telephoneActivationReel(user: {
  telephone: string | null;
  googleId: string | null;
}): boolean {
  const tel = user.telephone?.trim() ?? "";
  if (!tel) return false;
  if (user.googleId && telephoneSynthetiqueGoogle(user.googleId) === tel) return false;
  return true;
}

/**
 * Génère un code, l'enregistre (OTP) et l'envoie par le même SMS que la connexion.
 * L'e-mail n'est pas utilisé : sans SMTP configuré, l'adaptateur ne fait que logger.
 */
export async function genererEtEnvoyerCodeActivation(
  utilisateurId: string,
): Promise<ResultatActivation> {
  const user = await prisma.utilisateur.findUnique({ where: { id: utilisateurId } });
  if (!user) throw new Error("Utilisateur introuvable");

  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (prestataire?.activationConfirmeeLe) {
    throw new ErreurValidation("Ce compte prestataire est déjà activé");
  }

  if (!telephoneActivationReel(user)) {
    throw new ErreurValidation(
      "Aucun numéro de téléphone pour envoyer le code. Ajoutez un numéro réel sur le compte, puis renvoyez le code.",
    );
  }

  const code = genererOtp();
  const expireLe = new Date(Date.now() + DUREE_VALIDITE_OTP_MINUTES * 60 * 1000);
  await prisma.otp.deleteMany({
    where: { utilisateurId, code: { startsWith: PREFIXE_ACTIVATION }, utilise: false },
  }).catch(() => undefined);

  await prisma.otp.create({
    data: {
      utilisateurId,
      code: `${PREFIXE_ACTIVATION}${code}`,
      purpose: "ACTIVATION",
      expireLe,
    },
  });

  const envoi = await envoyerOtpSms(user.telephone, code);
  if (!envoi.succes) {
    throw new ErreurValidation("Le SMS d'activation n'a pas pu être envoyé. Réessayez dans un instant.");
  }

  await prisma.notification.create({
    data: {
      utilisateurId,
      titre: "Code d'activation requis",
      message: "Votre dossier est approuvé. Saisissez le code reçu par SMS pour ouvrir votre espace Pro.",
      type: "SYSTEME",
    },
  }).catch(() => undefined);

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
