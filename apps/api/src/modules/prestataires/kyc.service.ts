import { prisma } from "../../config/prisma";
import { ErreurValidation, ErreurNonTrouve, ErreurInterdit } from "../../utils/erreurs";
import { MettreAJourKycInput, ReviserKycInput } from "./kyc.schema";
import { attribuerPlanGratuit } from "../economie/economie.service";
import {
  DOCUMENTS_KYC_DISPO,
  DocKycId,
  analyseConformite,
  docsRequisPour,
  obtenirConfigExigenceKyc,
} from "./kyc-exigence.service";

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
  /** false = admin a désactivé l'exigence ou aucun doc pour la catégorie */
  exigenceActive: boolean;
  requis: DocKycId[];
};

async function construireChecklist(p: {
  categorie: string;
  kycStatut: string;
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
  documentJustificatifUrl: string | null;
}): Promise<ChecklistKyc> {
  const config = await obtenirConfigExigenceKyc();
  const requis = config.actif ? docsRequisPour(config, p.categorie) : [];

  // Exigence off ou aucun document coché pour la catégorie → rien d'obligatoire
  if (requis.length === 0) {
    return {
      pieceIdentite: true,
      selfie: true,
      entreprise: true,
      documentsEntreprise: true,
      adresseLegale: true,
      complet: true,
      manquants: [],
      exigenceActive: false,
      requis: [],
    };
  }

  const analyse = analyseConformite(p, config);
  const set = new Set(requis);
  const pieceIdentite = !set.has("piece_identite") || !analyse.manquants.includes("piece_identite");
  const selfie =
    (!set.has("selfie") && !set.has("photo_profil")) ||
    (!analyse.manquants.includes("selfie") && !analyse.manquants.includes("photo_profil"));
  const entreprise =
    (!set.has("rccm") && !set.has("nif")) ||
    ((!set.has("rccm") || !analyse.manquants.includes("rccm")) &&
      (!set.has("nif") || !analyse.manquants.includes("nif")));
  const documentsEntreprise =
    (!set.has("attestation") &&
      !set.has("assurance_vehicule") &&
      !set.has("carte_rose") &&
      !set.has("visite_technique")) ||
    (!analyse.manquants.includes("attestation") &&
      !analyse.manquants.includes("assurance_vehicule") &&
      !analyse.manquants.includes("carte_rose") &&
      !analyse.manquants.includes("visite_technique"));
  const adresseLegale = !set.has("adresse_legale") || !analyse.manquants.includes("adresse_legale");

  return {
    pieceIdentite,
    selfie,
    entreprise,
    documentsEntreprise,
    adresseLegale,
    complet: analyse.manquants.length === 0,
    manquants: analyse.manquantsLibelles,
    exigenceActive: true,
    requis,
  };
}

async function notifierKyc(utilisateurId: string, titre: string, message: string) {
  await prisma.notification.create({
    data: { utilisateurId, titre, message, type: "SYSTEME" },
  });
}

/** Résumé KYC + checklist pour le prestataire connecté */
export async function obtenirMonKyc(utilisateurId: string) {
  let prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) throw new ErreurNonTrouve("Profil prestataire non trouvé");

  let checklist = await construireChecklist(prestataire);

  // Config admin sans docs obligatoires → approuver le dossier, activation SMS toujours requise
  if (
    !checklist.exigenceActive &&
    ["BROUILLON", "INFO_MANQUANTE", "EN_REVUE"].includes(prestataire.kycStatut)
  ) {
    const etaitEnAttente = prestataire.statut !== "APPROUVE" && prestataire.statut !== "REJETE";
    prestataire = await prisma.prestataire.update({
      where: { id: prestataire.id },
      data: {
        kycStatut: "VALIDE",
        kycValideLe: new Date(),
        kycMotifRejet: null,
        statut: prestataire.statut === "REJETE" ? prestataire.statut : "APPROUVE",
      },
    });
    if (prestataire.statut === "APPROUVE") {
      await attribuerPlanGratuit(prestataire.id).catch(() => {});
      if (etaitEnAttente && !prestataire.activationConfirmeeLe) {
        const { genererEtEnvoyerCodeActivation } = await import("./activation.service");
        await genererEtEnvoyerCodeActivation(utilisateurId).catch((e) =>
          console.error("[activation]", e)
        );
      }
    }
    checklist = await construireChecklist(prestataire);
  }
  const dossier: Record<string, unknown> = {};
  for (const cle of CHAMPS_KYC) {
    dossier[cle] = (prestataire as Record<string, unknown>)[cle];
  }

  return {
    prestataireId: prestataire.id,
    statut: prestataire.statut,
    categorie: prestataire.categorie,
    ...dossier,
    checklist,
    documentsDisponibles: DOCUMENTS_KYC_DISPO,
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

  const checklist = await construireChecklist(prestataire);
  if (!checklist.complet) {
    throw new ErreurValidation(`Dossier incomplet : ${checklist.manquants.join(" ; ")}`);
  }

  // Aucun document exigé → approbation auto + code d'activation SMS
  if (!checklist.exigenceActive) {
    await prisma.prestataire.update({
      where: { id: prestataire.id },
      data: {
        kycStatut: "VALIDE",
        kycSoumisLe: new Date(),
        kycValideLe: new Date(),
        kycMotifRejet: null,
        statut: "APPROUVE",
        activationConfirmeeLe: null,
      },
    });
    await attribuerPlanGratuit(prestataire.id).catch(() => {});
    const { genererEtEnvoyerCodeActivation } = await import("./activation.service");
    await genererEtEnvoyerCodeActivation(utilisateurId).catch((e) => console.error("[activation]", e));
    await notifierKyc(
      utilisateurId,
      "Profil approuvé — activation requise",
      "Saisissez le code d'activation reçu par SMS pour ouvrir votre espace de travail."
    );
    return obtenirMonKyc(utilisateurId);
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
  return { ...prestataire, checklist: await construireChecklist(prestataire) };
}

/** [ADMIN] Valider / demander infos / refuser le KYC */
export async function reviserKyc(adminId: string, input: ReviserKycInput) {
  const prestataire = await prisma.prestataire.findUnique({ where: { id: input.prestataireId } });
  if (!prestataire) throw new ErreurNonTrouve("Prestataire non trouvé");

  if (prestataire.kycStatut !== "EN_REVUE" && prestataire.kycStatut !== "INFO_MANQUANTE") {
    throw new ErreurValidation("Seuls les dossiers en revue ou en attente d'infos peuvent être révisés");
  }

  if (input.decision === "VALIDER") {
    const checklist = await construireChecklist(prestataire);
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

    let activation = null;
    if (approuverProfil) {
      const { genererEtEnvoyerCodeActivation } = await import("./activation.service");
      activation = await genererEtEnvoyerCodeActivation(prestataire.utilisateurId).catch((e) => {
        console.error("[activation]", e);
        return null;
      });
    }

    await notifierKyc(
      prestataire.utilisateurId,
      "KYC validé",
      approuverProfil
        ? "Votre identité a été vérifiée. Votre profil prestataire est maintenant actif sur RESERVA."
        : "Votre dossier KYC est validé. L'activation du profil sera confirmée sous peu."
    );

    return { prestataire: misAJour, activation };
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
