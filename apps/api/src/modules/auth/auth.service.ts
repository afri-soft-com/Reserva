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
  AuthGoogleInput,
  DUREE_VALIDITE_OTP_MINUTES,
  TENTATIVES_MAX_OTP,
  TENTATIVES_MAX_PIN,
  DUREE_BLOCAGE_PIN_MINUTES,
  RoleUtilisateur,
} from "@reserva/shared";
import { telephoneSynthetiqueGoogle, verifierIdTokenGoogle } from "./google.service";

/** Étape 1 de l'inscription : crée le compte (non vérifié) et envoie un OTP par SMS */
export async function demarrerInscription(input: InscriptionInput) {
  const telephone = normaliserTelephone(input.telephone);

  const utilisateurExistant = await prisma.utilisateur.findUnique({ where: { telephone } });
  if (utilisateurExistant) {
    throw new ErreurValidation("Ce numéro de téléphone est déjà associé à un compte RESERVA");
  }

  // Parrainage : rattache le nouveau compte au parrain si le code est valide
  let parraineParId: string | null = null;
  if (input.codeParrainage) {
    const code = input.codeParrainage.trim().toUpperCase();
    const parrain = await prisma.utilisateur.findUnique({ where: { codeParrainage: code } });
    if (!parrain) {
      throw new ErreurValidation("Code de parrainage invalide");
    }
    parraineParId = parrain.id;
  }

  const role = input.role === "PRESTATAIRE" ? "PRESTATAIRE" : "CLIENT";

  const utilisateur = await prisma.utilisateur.create({
    data: {
      telephone,
      nom: input.nom,
      email: input.email || null,
      langue: input.langue,
      role,
      telephoneVerifie: false,
      codeParrainage: genererCodeParrainage(input.nom),
      parraineParId,
    },
  });

  // App Pro : fiche prestataire brouillon (validation admin)
  if (role === "PRESTATAIRE") {
    await prisma.prestataire.create({
      data: {
        utilisateurId: utilisateur.id,
        nomEntreprise: input.nom,
        categorie: "HOTELLERIE",
        ville: "Kinshasa",
        quartier: "À compléter",
        description: "Profil prestataire — à compléter après validation.",
        statut: "EN_ATTENTE_VALIDATION",
      },
    });
  }

  await genererEtEnvoyerOtp(utilisateur.id, telephone);

  return { utilisateurId: utilisateur.id, telephone };
}

/** Génère un code de parrainage unique à partir du nom, ex: RESV-AGUY-4821 */
function genererCodeParrainage(nom: string): string {
  const prefixe = nom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 4)
    .toUpperCase() || "USER";
  const numero = Math.floor(1000 + Math.random() * 9000);
  return `RESV-${prefixe}-${numero}`;
}

/** Crédite le parrain en points de fidélité lorsqu'un filleul active son compte (une seule fois) */
async function crediterParrainage(parrainId: string, filleulId: string): Promise<void> {
  const dejaCredite = await prisma.pointTransaction.findFirst({
    where: { utilisateurId: parrainId, description: `Parrainage de ${filleulId}` },
  });
  if (dejaCredite) return;

  const { obtenirConfigTarif } = await import("../economie/economie.service");
  const config = await obtenirConfigTarif();
  const POINTS_PARRAINAGE = config.pointsParrainage;

  const gains = await prisma.pointTransaction.aggregate({
    where: { utilisateurId: parrainId, type: "GAIN" },
    _sum: { montantPoints: true },
  });
  const depenses = await prisma.pointTransaction.aggregate({
    where: { utilisateurId: parrainId, type: "DEPENSE" },
    _sum: { montantPoints: true },
  });
  const solde = (gains._sum.montantPoints ?? 0) - (depenses._sum.montantPoints ?? 0);

  await prisma.pointTransaction.create({
    data: {
      utilisateurId: parrainId,
      type: "GAIN",
      montantPoints: POINTS_PARRAINAGE,
      soldeApres: solde + POINTS_PARRAINAGE,
      description: `Parrainage de ${filleulId}`,
    },
  });

  await prisma.notification.create({
    data: {
      utilisateurId: parrainId,
      titre: "Points de parrainage",
      message: `Vous avez gagné ${POINTS_PARRAINAGE} points ! Une personne s'est inscrite avec votre code de parrainage.`,
      type: "SYSTEME",
    },
  });
}

/** Génère un nouvel OTP, l'enregistre en base et l'envoie par SMS (cooldown 60 s / numéro). */
async function genererEtEnvoyerOtp(utilisateurId: string, telephone: string): Promise<void> {
  const recent = await prisma.otp.findFirst({
    where: { utilisateurId, creeLe: { gte: new Date(Date.now() - 60_000) } },
    orderBy: { creeLe: "desc" },
  });
  if (recent) {
    throw new ErreurValidation("Veuillez patienter 60 secondes avant de renvoyer un SMS.");
  }

  const depuis = new Date(Date.now() - 15 * 60_000);
  const count = await prisma.otp.count({ where: { utilisateurId, creeLe: { gte: depuis } } });
  if (count >= 5) {
    throw new ErreurValidation("Trop de SMS envoyés. Réessayez dans 15 minutes.");
  }

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

  // Parrainage : crédite le parrain (une seule fois) lors de l'activation du compte du filleul
  const utilisateurComplet = await prisma.utilisateur.findUnique({
    where: { id: utilisateur.id },
    include: { parrainePar: { select: { id: true } } },
  });
  if (utilisateurComplet?.parrainePar) {
    await crediterParrainage(utilisateurComplet.parrainePar.id, utilisateur.id);
  }

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
  const misAJour = await prisma.utilisateur.update({ where: { id: utilisateurId }, data: { deuxFAActif: active } });
  return { utilisateur: formaterUtilisateurPublic(misAJour) };
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

/** Renvoie le code de parrainage de l'utilisateur (le génère s'il est absent) */
export async function monCodeParrainage(utilisateurId: string) {
  const utilisateur = await prisma.utilisateur.findUnique({ where: { id: utilisateurId } });
  if (!utilisateur) {
    throw new ErreurNonTrouve("Utilisateur non trouvé");
  }

  let codeParrainage = utilisateur.codeParrainage;
  if (!codeParrainage) {
    codeParrainage = genererCodeParrainage(utilisateur.nom);
    await prisma.utilisateur.update({ where: { id: utilisateurId }, data: { codeParrainage } });
  }

  const points = await prisma.pointTransaction.aggregate({
    where: { utilisateurId, description: { startsWith: "Parrainage de" } },
    _sum: { montantPoints: true },
  });

  return { codeParrainage, pointsGagnesParrainage: points._sum.montantPoints ?? 0 };
}

/** Liste les personnes inscrites avec le code de parrainage de l'utilisateur */
export async function mesParrainages(utilisateurId: string) {
  const filleuls = await prisma.utilisateur.findMany({
    where: { parraineParId: utilisateurId },
    select: { id: true, nom: true, telephone: true, creeLe: true },
    orderBy: { creeLe: "desc" },
  });

  return filleuls.map((f) => ({ id: f.id, nom: f.nom, telephone: f.telephone, creeLe: f.creeLe.toISOString() }));
}

/**
 * Inscription / connexion Google.
 * Si le compte n'a pas encore de PIN → pinRequis=true (écran création PIN, sans SMS).
 */
export async function connecterAvecGoogle(input: AuthGoogleInput) {
  const profil = await verifierIdTokenGoogle(input.idToken);
  const role = input.role === "PRESTATAIRE" ? "PRESTATAIRE" : "CLIENT";

  let utilisateur = await prisma.utilisateur.findFirst({
    where: {
      OR: [{ googleId: profil.googleId }, ...(profil.email ? [{ email: profil.email }] : [])],
    },
  });

  if (!utilisateur) {
    const telephone = telephoneSynthetiqueGoogle(profil.googleId);
    utilisateur = await prisma.utilisateur.create({
      data: {
        telephone,
        email: profil.email,
        googleId: profil.googleId,
        nom: profil.nom,
        photoUrl: profil.photoUrl || null,
        role,
        telephoneVerifie: true,
        codeParrainage: genererCodeParrainage(profil.nom),
      },
    });

    if (role === "PRESTATAIRE") {
      await prisma.prestataire.create({
        data: {
          utilisateurId: utilisateur.id,
          nomEntreprise: profil.nom,
          categorie: "HOTELLERIE",
          ville: "Kinshasa",
          quartier: "À compléter",
          description: "Profil prestataire Google — à compléter après validation.",
          statut: "EN_ATTENTE_VALIDATION",
        },
      });
    }
  } else {
    // Lie googleId / email / photo si manquants
    utilisateur = await prisma.utilisateur.update({
      where: { id: utilisateur.id },
      data: {
        googleId: utilisateur.googleId || profil.googleId,
        email: utilisateur.email || profil.email,
        photoUrl: utilisateur.photoUrl || profil.photoUrl || null,
        telephoneVerifie: true,
      },
    });
  }

  const pinRequis = !utilisateur.pinHash;
  const token = genererToken({
    utilisateurId: utilisateur.id,
    role: utilisateur.role as RoleUtilisateur,
    telephone: utilisateur.telephone,
  });

  return {
    token,
    pinRequis,
    nouvelInscrit: pinRequis,
    utilisateur: formaterUtilisateurPublic(utilisateur),
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
  deuxFAActif: boolean;
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
    deuxFAActif: utilisateur.deuxFAActif,
    creeLe: utilisateur.creeLe.toISOString(),
  };
}
