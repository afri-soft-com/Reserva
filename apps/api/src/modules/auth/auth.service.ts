import bcrypt from "bcryptjs";
import { prisma } from "../../config/prisma";
import { genererToken } from "../../middlewares/auth";
import { envoyerOtpSms } from "../notifications/sms.adapter";
import { ErreurValidation, ErreurNonTrouve, ErreurNonAutorise } from "../../utils/erreurs";
import {
  genererOtp,
  normaliserTelephone,
  InscriptionInput,
  VerifierOtpInput,
  ConnexionPinInput,
  DefinirPinInput,
  DUREE_VALIDITE_OTP_MINUTES,
  TENTATIVES_MAX_OTP,
  TENTATIVES_MAX_PIN,
  DUREE_BLOCAGE_PIN_MINUTES,
  RoleUtilisateur,
} from "@reserva/shared";

/** Étape 1 de l'inscription : crée le compte (non vérifié) et envoie un OTP par SMS */
export async function demarrerInscription(input: InscriptionInput) {
  const telephone = normaliserTelephone(input.telephone);

  const utilisateurExistant = await prisma.utilisateur.findUnique({ where: { telephone } });
  if (utilisateurExistant) {
    throw new ErreurValidation("Ce numéro de téléphone est déjà associé à un compte RESERVA");
  }

  const utilisateur = await prisma.utilisateur.create({
    data: {
      telephone,
      nom: input.nom,
      email: input.email || null,
      langue: input.langue,
      telephoneVerifie: false,
    },
  });

  await genererEtEnvoyerOtp(utilisateur.id, telephone);

  return { utilisateurId: utilisateur.id, telephone };
}

/** Génère un nouvel OTP, l'enregistre en base et l'envoie par SMS */
async function genererEtEnvoyerOtp(utilisateurId: string, telephone: string): Promise<void> {
  const code = genererOtp();
  const expireLe = new Date(Date.now() + DUREE_VALIDITE_OTP_MINUTES * 60 * 1000);

  await prisma.otp.create({
    data: { utilisateurId, code, expireLe },
  });

  await envoyerOtpSms(telephone, code);
}

/** Renvoie un nouvel OTP (ex: si le précédent a expiré ou n'est pas arrivé) */
export async function renvoyerOtp(telephone: string) {
  const telephoneNormalise = normaliserTelephone(telephone);
  const utilisateur = await prisma.utilisateur.findUnique({ where: { telephone: telephoneNormalise } });

  if (!utilisateur) {
    throw new ErreurNonTrouve("Aucun compte associé à ce numéro de téléphone");
  }
  if (utilisateur.telephoneVerifie) {
    throw new ErreurValidation("Ce numéro de téléphone est déjà vérifié");
  }

  await genererEtEnvoyerOtp(utilisateur.id, telephoneNormalise);
  return { telephone: telephoneNormalise };
}

/** Étape 2 de l'inscription : vérifie le code OTP reçu par SMS */
export async function verifierOtp(input: VerifierOtpInput) {
  const telephone = normaliserTelephone(input.telephone);
  const utilisateur = await prisma.utilisateur.findUnique({ where: { telephone } });

  if (!utilisateur) {
    throw new ErreurNonTrouve("Aucun compte associé à ce numéro de téléphone");
  }

  const otp = await prisma.otp.findFirst({
    where: { utilisateurId: utilisateur.id, utilise: false },
    orderBy: { creeLe: "desc" },
  });

  if (!otp) {
    throw new ErreurValidation("Aucun code de vérification en attente. Demandez un nouveau code.");
  }
  if (otp.tentatives >= TENTATIVES_MAX_OTP) {
    throw new ErreurValidation("Nombre maximal de tentatives atteint. Demandez un nouveau code.");
  }
  if (new Date() > otp.expireLe) {
    throw new ErreurValidation("Ce code a expiré. Demandez un nouveau code.");
  }

  if (otp.code !== input.code) {
    await prisma.otp.update({ where: { id: otp.id }, data: { tentatives: { increment: 1 } } });
    throw new ErreurValidation("Code de vérification incorrect");
  }

  await prisma.$transaction([
    prisma.otp.update({ where: { id: otp.id }, data: { utilise: true } }),
    prisma.utilisateur.update({ where: { id: utilisateur.id }, data: { telephoneVerifie: true } }),
  ]);

  return { utilisateurId: utilisateur.id, telephone, telephoneVerifie: true };
}

/** Étape 3 de l'inscription : définit le code PIN à 4 chiffres après vérification du téléphone */
export async function definirPin(input: DefinirPinInput) {
  const telephone = normaliserTelephone(input.telephone);
  const utilisateur = await prisma.utilisateur.findUnique({ where: { telephone } });

  if (!utilisateur) {
    throw new ErreurNonTrouve("Aucun compte associé à ce numéro de téléphone");
  }
  if (!utilisateur.telephoneVerifie) {
    throw new ErreurValidation("Le numéro de téléphone doit être vérifié avant de définir un code PIN");
  }

  const pinHash = await bcrypt.hash(input.pin, 10);
  await prisma.utilisateur.update({ where: { id: utilisateur.id }, data: { pinHash } });

  const token = genererToken({ utilisateurId: utilisateur.id, role: utilisateur.role as RoleUtilisateur, telephone: utilisateur.telephone });

  return {
    token,
    utilisateur: formaterUtilisateurPublic(utilisateur),
  };
}

/** Connexion par code PIN — avec verrouillage temporaire après plusieurs échecs */
export async function connecterParPin(input: ConnexionPinInput) {
  const telephone = normaliserTelephone(input.telephone);
  const utilisateur = await prisma.utilisateur.findUnique({ where: { telephone } });

  if (!utilisateur || !utilisateur.pinHash) {
    throw new ErreurNonAutorise("Identifiants invalides");
  }

  if (utilisateur.bloqueJusquA && new Date() < utilisateur.bloqueJusquA) {
    const minutesRestantes = Math.ceil((utilisateur.bloqueJusquA.getTime() - Date.now()) / 60000);
    throw new ErreurNonAutorise(`Compte temporairement bloqué. Réessayez dans ${minutesRestantes} minute(s).`);
  }

  const pinValide = await bcrypt.compare(input.pin, utilisateur.pinHash);

  if (!pinValide) {
    const nouvellesTentatives = utilisateur.tentativesPin + 1;
    const doitBloquer = nouvellesTentatives >= TENTATIVES_MAX_PIN;

    await prisma.utilisateur.update({
      where: { id: utilisateur.id },
      data: {
        tentativesPin: doitBloquer ? 0 : nouvellesTentatives,
        bloqueJusquA: doitBloquer ? new Date(Date.now() + DUREE_BLOCAGE_PIN_MINUTES * 60 * 1000) : null,
      },
    });

    if (doitBloquer) {
      throw new ErreurNonAutorise(`Trop de tentatives échouées. Compte bloqué pendant ${DUREE_BLOCAGE_PIN_MINUTES} minutes.`);
    }
    throw new ErreurNonAutorise("Identifiants invalides");
  }

  // Connexion réussie : réinitialise le compteur de tentatives
  await prisma.utilisateur.update({
    where: { id: utilisateur.id },
    data: { tentativesPin: 0, bloqueJusquA: null },
  });

  // Si la 2FA est activée, on envoie un OTP et on exige une vérification supplémentaire
  if (utilisateur.deuxFAActif) {
    await genererEtEnvoyerOtp(utilisateur.id, telephone);
    return {
      deuxfaRequis: true,
      telephone,
      message: "Code de vérification 2FA envoyé par SMS",
    };
  }

  const token = genererToken({ utilisateurId: utilisateur.id, role: utilisateur.role as RoleUtilisateur, telephone: utilisateur.telephone });

  return {
    token,
    utilisateur: formaterUtilisateurPublic(utilisateur),
  };
}

/** Demande la réinitialisation du code PIN — envoie un OTP par SMS */
export async function demanderReinitialisationPin(telephone: string) {
  const telephoneNormalise = normaliserTelephone(telephone);
  const utilisateur = await prisma.utilisateur.findUnique({ where: { telephone: telephoneNormalise } });

  if (!utilisateur) {
    throw new ErreurNonTrouve("Aucun compte associé à ce numéro de téléphone");
  }

  await genererEtEnvoyerOtp(utilisateur.id, telephoneNormalise);
  return { telephone: telephoneNormalise };
}

/** Réinitialise le code PIN après vérification OTP */
export async function reinitialiserPin(input: { telephone: string; code: string; nouveauPin: string }) {
  const telephone = normaliserTelephone(input.telephone);
  const utilisateur = await prisma.utilisateur.findUnique({ where: { telephone } });

  if (!utilisateur) {
    throw new ErreurNonTrouve("Aucun compte associé à ce numéro de téléphone");
  }

  const otp = await prisma.otp.findFirst({
    where: { utilisateurId: utilisateur.id, utilise: false },
    orderBy: { creeLe: "desc" },
  });

  if (!otp) {
    throw new ErreurValidation("Aucun code de vérification en attente. Demandez un nouveau code.");
  }
  if (otp.tentatives >= TENTATIVES_MAX_OTP) {
    throw new ErreurValidation("Nombre maximal de tentatives atteint. Demandez un nouveau code.");
  }
  if (new Date() > otp.expireLe) {
    throw new ErreurValidation("Ce code a expiré. Demandez un nouveau code.");
  }
  if (otp.code !== input.code) {
    await prisma.otp.update({ where: { id: otp.id }, data: { tentatives: { increment: 1 } } });
    throw new ErreurValidation("Code de vérification incorrect");
  }

  const pinHash = await bcrypt.hash(input.nouveauPin, 10);

  await prisma.$transaction([
    prisma.otp.update({ where: { id: otp.id }, data: { utilise: true } }),
    prisma.utilisateur.update({
      where: { id: utilisateur.id },
      data: { pinHash, tentativesPin: 0, bloqueJusquA: null },
    }),
  ]);

  const token = genererToken({ utilisateurId: utilisateur.id, role: utilisateur.role as RoleUtilisateur, telephone: utilisateur.telephone });

  return {
    token,
    utilisateur: formaterUtilisateurPublic(utilisateur),
  };
}

/** Met à jour les informations du profil (nom, email, langue) */
export async function mettreAJourProfil(utilisateurId: string, donnees: { nom?: string; email?: string; langue?: string }) {
  const utilisateur = await prisma.utilisateur.findUnique({ where: { id: utilisateurId } });
  if (!utilisateur) throw new ErreurNonTrouve("Utilisateur non trouvé");
  if (donnees.email && donnees.email !== utilisateur.email) {
    const existant = await prisma.utilisateur.findUnique({ where: { email: donnees.email } });
    if (existant) throw new ErreurValidation("Cet email est déjà utilisé par un autre compte");
  }
  const misAJour = await prisma.utilisateur.update({
    where: { id: utilisateurId },
    data: {
      ...(donnees.nom !== undefined && { nom: donnees.nom }),
      ...(donnees.email !== undefined && { email: donnees.email }),
      ...(donnees.langue !== undefined && { langue: donnees.langue }),
    },
  });
  return { utilisateur: formaterUtilisateurPublic(misAJour) };
}

/** Met à jour la photo de profil (reçoit une URL ou une data URI base64) */
export async function mettreAJourPhoto(utilisateurId: string, photoUrl: string) {
  const utilisateur = await prisma.utilisateur.findUnique({ where: { id: utilisateurId } });
  if (!utilisateur) {
    throw new ErreurNonTrouve("Utilisateur non trouvé");
  }
  return prisma.utilisateur.update({ where: { id: utilisateurId }, data: { photoUrl } });
}

/** Active ou désactive la 2FA pour un utilisateur */
export async function definir2FA(utilisateurId: string, active: boolean) {
  const utilisateur = await prisma.utilisateur.findUnique({ where: { id: utilisateurId } });
  if (!utilisateur) {
    throw new ErreurNonTrouve("Utilisateur non trouvé");
  }
  if (active && !utilisateur.telephoneVerifie) {
    throw new ErreurValidation("Le numéro de téléphone doit être vérifié avant d'activer la 2FA");
  }
  return prisma.utilisateur.update({ where: { id: utilisateurId }, data: { deuxFAActif: active } });
}

/** Vérifie le code 2FA après connexion par PIN */
export async function verifier2FA(input: { telephone: string; code: string }) {
  const telephone = normaliserTelephone(input.telephone);
  const utilisateur = await prisma.utilisateur.findUnique({ where: { telephone } });

  if (!utilisateur) {
    throw new ErreurNonTrouve("Aucun compte associé à ce numéro de téléphone");
  }
  if (!utilisateur.deuxFAActif) {
    throw new ErreurValidation("La 2FA n'est pas activée sur ce compte");
  }

  const otp = await prisma.otp.findFirst({
    where: { utilisateurId: utilisateur.id, utilise: false },
    orderBy: { creeLe: "desc" },
  });

  if (!otp) {
    throw new ErreurValidation("Aucun code de vérification en attente");
  }
  if (otp.tentatives >= TENTATIVES_MAX_OTP) {
    throw new ErreurValidation("Nombre maximal de tentatives atteint. Demandez un nouveau code.");
  }
  if (new Date() > otp.expireLe) {
    throw new ErreurValidation("Ce code a expiré. Demandez un nouveau code.");
  }
  if (otp.code !== input.code) {
    await prisma.otp.update({ where: { id: otp.id }, data: { tentatives: { increment: 1 } } });
    throw new ErreurValidation("Code de vérification incorrect");
  }

  await prisma.otp.update({ where: { id: otp.id }, data: { utilise: true } });
  await prisma.utilisateur.update({ where: { id: utilisateur.id }, data: { tentativesPin: 0, bloqueJusquA: null } });

  const token = genererToken({ utilisateurId: utilisateur.id, role: utilisateur.role as RoleUtilisateur, telephone: utilisateur.telephone });

  return {
    token,
    utilisateur: formaterUtilisateurPublic(utilisateur),
  };
}

/** Récupère le profil de l'utilisateur connecté */
export async function obtenirProfil(utilisateurId: string) {
  const utilisateur = await prisma.utilisateur.findUnique({
    where: { id: utilisateurId },
    include: { prestataire: true },
  });

  if (!utilisateur) {
    throw new ErreurNonTrouve("Utilisateur non trouvé");
  }

  return {
    ...formaterUtilisateurPublic(utilisateur),
    prestataire: utilisateur.prestataire,
  };
}

/** Formate l'utilisateur pour exposition publique (jamais le pinHash) */
function formaterUtilisateurPublic(utilisateur: {
  id: string;
  telephone: string;
  email: string | null;
  nom: string;
  role: string;
  langue: string;
  photoUrl: string | null;
  telephoneVerifie: boolean;
  creeLe: Date;
}) {
  return {
    id: utilisateur.id,
    telephone: utilisateur.telephone,
    email: utilisateur.email,
    nom: utilisateur.nom,
    role: utilisateur.role,
    langue: utilisateur.langue,
    photoUrl: utilisateur.photoUrl,
    telephoneVerifie: utilisateur.telephoneVerifie,
    creeLe: utilisateur.creeLe.toISOString(),
  };
}
