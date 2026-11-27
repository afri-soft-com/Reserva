import { genererOtp, DUREE_VALIDITE_OTP_MINUTES } from "@reserva/shared";
import { prisma } from "../../config/prisma";
import { envoyerOtpSms } from "../notifications/sms.adapter";
import { emailValide, envoyerCodeActivationEmail } from "../notifications/email.adapter";
import { telephoneSynthetiqueGoogle } from "../auth/google.service";
import { ErreurNonTrouve, ErreurValidation, ErreurInterdit } from "../../utils/erreurs";

/** Préfixe stocké dans OTP pour distinguer activation vs login */
const PREFIXE_ACTIVATION = "ACT:";

/** Délai minimal entre deux envois demandés par le prestataire (anti-spam SMS / e-mail). */
export const DELAI_RENVOI_ACTIVATION_SECONDES = 30;

export type CanalActivation = "sms" | "email";

export type ResultatActivation = {
  codeActivation: string;
  /** Premier canal ayant réussi (compatibilité console admin). */
  canal: CanalActivation;
  canaux: CanalActivation[];
  destinataire: string;
  message: string;
};

export type OptionsEnvoiActivation = {
  /** Absent : SMS si numéro réel + e-mail du compte s'il existe. */
  canal?: CanalActivation;
  /** Adresse saisie par le prestataire (canal e-mail) ; sinon e-mail du compte. */
  email?: string | null;
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

type Destinations = { telephone: string | null; email: string | null };

/** Choisit où envoyer le code selon le canal demandé. Lève une erreur claire si impossible. */
export function destinationsActivation(
  user: { telephone: string | null; googleId: string | null; email: string | null },
  options: OptionsEnvoiActivation = {},
): Destinations {
  const telephone = telephoneActivationReel(user) ? user.telephone!.trim() : null;
  const emailSaisi = options.email?.trim() || null;
  const email = emailSaisi ?? (emailValide(user.email) ? user.email!.trim() : null);

  if (options.canal === "sms") {
    if (!telephone) {
      throw new ErreurValidation(
        "Aucun numéro de téléphone réel sur ce compte. Recevez le code par e-mail.",
      );
    }
    return { telephone, email: null };
  }
  if (options.canal === "email") {
    if (!email) throw new ErreurValidation("Indiquez une adresse e-mail pour recevoir le code.");
    if (!emailValide(email)) throw new ErreurValidation("Adresse e-mail invalide.");
    return { telephone: null, email };
  }
  if (!telephone && !email) {
    throw new ErreurValidation(
      "Aucun numéro de téléphone ni e-mail pour envoyer le code. Ajoutez-en un sur le compte, puis renvoyez le code.",
    );
  }
  return { telephone, email };
}

/**
 * Génère un code, l'enregistre (OTP) et l'envoie par SMS et/ou e-mail.
 * Réussit si au moins un canal a fonctionné.
 */
export async function genererEtEnvoyerCodeActivation(
  utilisateurId: string,
  options: OptionsEnvoiActivation = {},
): Promise<ResultatActivation> {
  const user = await prisma.utilisateur.findUnique({ where: { id: utilisateurId } });
  if (!user) throw new Error("Utilisateur introuvable");

  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (prestataire?.activationConfirmeeLe) {
    throw new ErreurValidation("Ce compte prestataire est déjà activé");
  }

  const destinations = destinationsActivation(user, options);

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

  const canaux: CanalActivation[] = [];
  const destinataires: string[] = [];

  if (destinations.telephone) {
    const envoi = await envoyerOtpSms(destinations.telephone, code).catch((e) => {
      console.error("[activation] SMS", e);
      return { succes: false };
    });
    if (envoi.succes) {
      canaux.push("sms");
      destinataires.push(destinations.telephone);
    }
  }
  if (destinations.email) {
    const envoi = await envoyerCodeActivationEmail(destinations.email, code, DUREE_VALIDITE_OTP_MINUTES);
    if (envoi.succes) {
      canaux.push("email");
      destinataires.push(destinations.email);
    }
  }

  if (canaux.length === 0) {
    const seulEmail = !destinations.telephone;
    const seulSms = !destinations.email;
    throw new ErreurValidation(
      seulEmail
        ? "L'e-mail d'activation n'a pas pu être envoyé. Vérifiez l'adresse ou réessayez dans un instant."
        : seulSms
          ? "Le SMS d'activation n'a pas pu être envoyé. Réessayez dans un instant ou recevez le code par e-mail."
          : "Le code d'activation n'a pas pu être envoyé. Réessayez dans un instant.",
    );
  }

  const parCanal = canaux.map((c) => (c === "sms" ? "SMS" : "e-mail")).join(" et ");
  await prisma.notification.create({
    data: {
      utilisateurId,
      titre: "Code d'activation requis",
      message: `Votre dossier est approuvé. Saisissez le code reçu par ${parCanal} pour ouvrir votre espace Pro.`,
      type: "SYSTEME",
    },
  }).catch(() => undefined);

  return {
    codeActivation: code,
    canal: canaux[0],
    canaux,
    destinataire: destinataires.join(", "),
    message: `Code envoyé par ${parCanal} à ${destinataires.join(" et ")}`,
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

export async function renvoyerCodeActivation(
  utilisateurId: string,
  options: OptionsEnvoiActivation = {},
) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) throw new ErreurNonTrouve("Profil prestataire non trouvé");
  if (prestataire.statut !== "APPROUVE") {
    throw new ErreurInterdit("Votre profil doit d'abord être approuvé");
  }
  if (prestataire.activationConfirmeeLe) {
    throw new ErreurValidation("Ce compte est déjà activé");
  }
  const dernier = await prisma.otp.findFirst({
    where: { utilisateurId, code: { startsWith: PREFIXE_ACTIVATION } },
    orderBy: { creeLe: "desc" },
    select: { creeLe: true },
  });
  if (dernier && Date.now() - dernier.creeLe.getTime() < DELAI_RENVOI_ACTIVATION_SECONDES * 1000) {
    throw new ErreurValidation(
      `Un code vient d'être envoyé. Patientez ${DELAI_RENVOI_ACTIVATION_SECONDES} secondes avant d'en demander un autre.`,
    );
  }
  // Masquer le code dans la réponse publique (admin le voit encore via valider)
  const resultat = await genererEtEnvoyerCodeActivation(utilisateurId, options);
  return {
    canal: resultat.canal,
    canaux: resultat.canaux,
    destinataire: resultat.destinataire,
    message: resultat.message,
  };
}
