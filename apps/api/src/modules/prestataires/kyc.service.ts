import { prisma } from "../../config/prisma";
import { ErreurValidation, ErreurNonTrouve, ErreurInterdit } from "../../utils/erreurs";
import { MettreAJourKycInput, ReviserKycInput } from "./kyc.schema";
import { attribuerPlanGratuit } from "../economie/economie.service";

const CHAMPS_KYC = [
  "kycStatut",
  "pieceIdentiteType",
  "pieceIdentiteNumero",
  "pieceIdentiteRectoUrl",
  "pieceIdentiteVersoUrl",
  "selfieUrl",
  "rccm",
  "nif",
  "adresseLegale",
  "documentRccmUrl",
  "documentNifUrl",
  "attestationUrl",
  "documentJustificatifUrl",
  "kycSoumisLe",
  "kycValideLe",
  "kycMotifRejet",
  "kycRevuParId",
] as const;

export type ChecklistKyc = {
  pieceIdentite: boolean;
  selfie: boolean;
  entreprise: boolean;
  documentsEntreprise: boolean;
  adresseLegale: boolean;
  complet: boolean;
  manquants: string[];
};

function construireChecklist(p: {
  pieceIdentiteType: string | null;
  pieceIdentiteNumero: string | null;
  pieceIdentiteRectoUrl: string | null;
  pieceIdentiteVersoUrl: string | null;
  selfieUrl: string | null;
  rccm: string | null;
  nif: string | null;
  adresseLegale: string | null;
  documentRccmUrl: string | null;
  documentNifUrl: string | null;
  attestationUrl: string | null;
}): ChecklistKyc {
  const manquants: string[] = [];
  const pieceIdentite =
    !!p.pieceIdentiteType &&
    !!p.pieceIdentiteNumero &&
    !!p.pieceIdentiteRectoUrl &&
    (p.pieceIdentiteType === "PASSEPORT" || !!p.pieceIdentiteVersoUrl);
  if (!pieceIdentite) {
    manquants.push("Pièce d'identité (type, numéro, recto" + (p.pieceIdentiteType === "PASSEPORT" ? ")" : " + verso)"));
  }

  const selfie = !!p.selfieUrl;
  if (!selfie) manquants.push("Selfie de vérification");

  const entreprise = !!(p.rccm || p.nif);
  if (!entreprise) manquants.push("RCCM ou NIF");

  const documentsEntreprise = !!(p.documentRccmUrl || p.documentNifUrl || p.attestationUrl);
  if (!documentsEntreprise) manquants.push("Document entreprise (RCCM, NIF ou attestation)");

  const adresseLegale = !!p.adresseLegale;
  if (!adresseLegale) manquants.push("Adresse légale");

  return {
    pieceIdentite,
    selfie,
    entreprise,
    documentsEntreprise,
    adresseLegale,
    complet: pieceIdentite && selfie && entreprise && documentsEntreprise && adresseLegale,
    manquants,
  };
}

async function notifierKyc(utilisateurId: string, titre: string, message: string) {
  await prisma.notification.create({
    data: { utilisateurId, titre, message, type: "SYSTEME" },
  });
}

/** Résumé KYC + checklist pour le prestataire connecté */
export async function obtenirMonKyc(utilisateurId: string) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) throw new ErreurNonTrouve("Profil prestataire non trouvé");

  const checklist = construireChecklist(prestataire);
  const dossier: Record<string, unknown> = {};
  for (const cle of CHAMPS_KYC) {
    dossier[cle] = (prestataire as Record<string, unknown>)[cle];
  }

  return {
    prestataireId: prestataire.id,
    statut: prestataire.statut,
    ...dossier,
    checklist,
    peutModifier: ["BROUILLON", "INFO_MANQUANTE", "REFUSE"].includes(prestataire.kycStatut),
    peutSoumettre: checklist.complet && ["BROUILLON", "INFO_MANQUANTE", "REFUSE"].includes(prestataire.kycStatut),
  };
}

/** Enregistre un brouillon KYC (champs partiels) */
export async function mettreAJourKyc(utilisateurId: string, input: MettreAJourKycInput) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) throw new ErreurNonTrouve("Profil prestataire non trouvé");

  if (!["BROUILLON", "INFO_MANQUANTE", "REFUSE"].includes(prestataire.kycStatut)) {
    throw new ErreurInterdit("Le dossier KYC ne peut plus être modifié tant qu'il est en revue ou validé");
  }

  const data: Record<string, unknown> = {};
  for (const [cle, valeur] of Object.entries(input)) {
    if (valeur !== undefined) data[cle] = valeur === null ? null : valeur;
  }

  // Repasse en brouillon si on corrige après refus / info manquante
  if (prestataire.kycStatut === "INFO_MANQUANTE" || prestataire.kycStatut === "REFUSE") {
    data.kycStatut = "BROUILLON";
    data.kycMotifRejet = null;
  }

  await prisma.prestataire.update({ where: { id: prestataire.id }, data });
  return obtenirMonKyc(utilisateurId);
}

/** Soumet le dossier pour revue admin */
export async function soumettreKyc(utilisateurId: string) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) throw new ErreurNonTrouve("Profil prestataire non trouvé");

  if (!["BROUILLON", "INFO_MANQUANTE", "REFUSE"].includes(prestataire.kycStatut)) {
    throw new ErreurValidation("Ce dossier KYC a déjà été soumis ou validé");
  }

  const checklist = construireChecklist(prestataire);
  if (!checklist.complet) {
    throw new ErreurValidation(`Dossier incomplet : ${checklist.manquants.join(" ; ")}`);
  }

  await prisma.prestataire.update({
    where: { id: prestataire.id },
    data: {
      kycStatut: "EN_REVUE",
      kycSoumisLe: new Date(),
      kycMotifRejet: null,
      statut: "EN_ATTENTE_VALIDATION",
    },
  });

  await notifierKyc(
    utilisateurId,
    "Dossier KYC soumis",
    "Votre dossier d'identité a été transmis à l'équipe RESERVA. Vous serez notifié après la revue."
  );

  return obtenirMonKyc(utilisateurId);
}

/** [ADMIN] Liste des dossiers KYC à traiter */
export async function listerDossiersKycEnRevue() {
  return prisma.prestataire.findMany({
    where: { kycStatut: { in: ["EN_REVUE", "INFO_MANQUANTE"] } },
    include: { utilisateur: { select: { nom: true, telephone: true, email: true } } },
    orderBy: [{ kycSoumisLe: "asc" }, { creeLe: "asc" }],
  });
}

/** [ADMIN] Détail d'un dossier KYC */
export async function obtenirDossierKycAdmin(prestataireId: string) {
  const prestataire = await prisma.prestataire.findUnique({
    where: { id: prestataireId },
    include: { utilisateur: { select: { nom: true, telephone: true, email: true, creeLe: true } } },
  });
  if (!prestataire) throw new ErreurNonTrouve("Prestataire non trouvé");
  return { ...prestataire, checklist: construireChecklist(prestataire) };
}

/** [ADMIN] Valider / demander infos / refuser le KYC */
export async function reviserKyc(adminId: string, input: ReviserKycInput) {
  const prestataire = await prisma.prestataire.findUnique({ where: { id: input.prestataireId } });
  if (!prestataire) throw new ErreurNonTrouve("Prestataire non trouvé");

  if (prestataire.kycStatut !== "EN_REVUE" && prestataire.kycStatut !== "INFO_MANQUANTE") {
    throw new ErreurValidation("Seuls les dossiers en revue ou en attente d'infos peuvent être révisés");
  }

  if (input.decision === "VALIDER") {
    const checklist = construireChecklist(prestataire);
    if (!checklist.complet) {
      throw new ErreurValidation(`Impossible de valider : ${checklist.manquants.join(" ; ")}`);
    }

    const approuverProfil = input.approuverProfil !== false;
    const misAJour = await prisma.prestataire.update({
      where: { id: prestataire.id },
      data: {
        kycStatut: "VALIDE",
        kycValideLe: new Date(),
        kycMotifRejet: null,
        kycRevuParId: adminId,
        ...(approuverProfil
          ? { statut: "APPROUVE", motifRejet: null }
          : {}),
      },
    });

    if (approuverProfil) {
      await attribuerPlanGratuit(misAJour.id).catch(() => {});
    }

    await notifierKyc(
      prestataire.utilisateurId,
      "KYC validé",
      approuverProfil
        ? "Votre identité a été vérifiée. Votre profil prestataire est maintenant actif sur RESERVA."
        : "Votre dossier KYC est validé. L'activation du profil sera confirmée sous peu."
    );

    return misAJour;
  }

  if (input.decision === "INFO_MANQUANTE") {
    if (!input.motif?.trim()) {
      throw new ErreurValidation("Indiquez les informations manquantes");
    }
    const misAJour = await prisma.prestataire.update({
      where: { id: prestataire.id },
      data: {
        kycStatut: "INFO_MANQUANTE",
        kycMotifRejet: input.motif.trim(),
        kycRevuParId: adminId,
      },
    });
    await notifierKyc(
      prestataire.utilisateurId,
      "KYC — informations manquantes",
      `Complétez votre dossier : ${input.motif.trim()}`
    );
    return misAJour;
  }

  // REFUSER
  if (!input.motif?.trim()) {
    throw new ErreurValidation("Un motif est requis pour refuser le KYC");
  }
  const misAJour = await prisma.prestataire.update({
    where: { id: prestataire.id },
    data: {
      kycStatut: "REFUSE",
      kycMotifRejet: input.motif.trim(),
      kycRevuParId: adminId,
      statut: "REJETE",
      motifRejet: input.motif.trim(),
    },
  });
  await notifierKyc(
    prestataire.utilisateurId,
    "KYC refusé",
    `Votre dossier d'identité a été refusé : ${input.motif.trim()}`
  );
  return misAJour;
}
