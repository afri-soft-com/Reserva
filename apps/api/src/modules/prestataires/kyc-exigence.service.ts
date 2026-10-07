import { prisma } from "../../config/prisma";
import { ErreurValidation } from "../../utils/erreurs";

export const CLE_KYC_EXIGENCE = "KYC_EXIGENCE_JSON";

/** Documents exigibles (cases à cocher admin, par catégorie) */
export const DOCUMENTS_KYC_DISPO = [
  { id: "piece_identite", libelle: "Carte d'identité / passeport" },
  { id: "selfie", libelle: "Photo récente (selfie)" },
  { id: "permis", libelle: "Permis de conduire" },
  { id: "rccm", libelle: "RCCM" },
  { id: "nif", libelle: "NIF" },
  { id: "attestation", libelle: "Attestation / justificatif" },
  { id: "adresse_legale", libelle: "Adresse légale" },
  { id: "photo_profil", libelle: "Photo de profil" },
] as const;

export type DocKycId = (typeof DOCUMENTS_KYC_DISPO)[number]["id"];

export type ConfigExigenceKyc = {
  actif: boolean;
  /** Délai avant blocage (jours). 0 = immédiat après activation. */
  delaiJours: number;
  /** Horodatage de la dernière sauvegarde avec exigence active (redémarre le compte à rebours) */
  activeLe: string | null;
  /** Documents requis par catégorie prestataire */
  documents: Record<string, DocKycId[]>;
};

const CATEGORIES = [
  "SANTE",
  "TRANSPORT",
  "HOTELLERIE",
  "RESTAURATION",
  "SALLE_REUNION",
  "ADMINISTRATIF",
  "EDUCATION",
] as const;

const DEFAUT_DOCS: DocKycId[] = ["piece_identite", "selfie", "rccm", "nif", "adresse_legale"];

function configVide(): ConfigExigenceKyc {
  const documents: Record<string, DocKycId[]> = {};
  for (const c of CATEGORIES) {
    documents[c] = c === "TRANSPORT" ? [...DEFAUT_DOCS, "permis"] : [...DEFAUT_DOCS];
  }
  return { actif: false, delaiJours: 7, activeLe: null, documents };
}

export async function obtenirConfigExigenceKyc(): Promise<ConfigExigenceKyc> {
  const ligne = await prisma.configurationTarification.findUnique({ where: { cle: CLE_KYC_EXIGENCE } });
  if (!ligne?.valeur) return configVide();
  try {
    const parse = JSON.parse(ligne.valeur) as Partial<ConfigExigenceKyc>;
    const base = configVide();
    return {
      actif: !!parse.actif,
      delaiJours: Math.max(0, Math.min(365, Number(parse.delaiJours ?? 7) || 0)),
      activeLe: parse.activeLe ?? null,
      documents: { ...base.documents, ...(parse.documents || {}) },
    };
  } catch {
    return configVide();
  }
}

export async function enregistrerConfigExigenceKyc(input: {
  actif: boolean;
  delaiJours: number;
  documents: Record<string, string[]>;
}): Promise<ConfigExigenceKyc> {
  const delaiJours = Math.max(0, Math.min(365, Math.round(Number(input.delaiJours) || 0)));
  const idsValides = new Set(DOCUMENTS_KYC_DISPO.map((d) => d.id));
  const documents: Record<string, DocKycId[]> = {};
  for (const c of CATEGORIES) {
    const liste = (input.documents?.[c] || []).filter((id): id is DocKycId => idsValides.has(id as DocKycId));
    documents[c] = liste;
  }

  const precedente = await obtenirConfigExigenceKyc();
  // Redémarre le compte à rebours à chaque sauvegarde quand l'exigence est active
  const activeLe = input.actif ? new Date().toISOString() : precedente.activeLe;

  const config: ConfigExigenceKyc = {
    actif: !!input.actif,
    delaiJours,
    activeLe,
    documents,
  };

  await prisma.configurationTarification.upsert({
    where: { cle: CLE_KYC_EXIGENCE },
    create: {
      cle: CLE_KYC_EXIGENCE,
      valeur: JSON.stringify(config),
      description: "Exigence documentaire prestataires (notifications + blocage après délai)",
      type: "JSON",
      actif: true,
    },
    update: {
      valeur: JSON.stringify(config),
      actif: true,
      description: "Exigence documentaire prestataires (notifications + blocage après délai)",
      type: "JSON",
    },
  });

  return config;
}

type PrestataireDocs = {
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
};

function docPresent(p: PrestataireDocs, docId: DocKycId): boolean {
  switch (docId) {
    case "piece_identite":
      return !!(
        p.pieceIdentiteType &&
        p.pieceIdentiteNumero &&
        p.pieceIdentiteRectoUrl &&
        (p.pieceIdentiteType === "PASSEPORT" || p.pieceIdentiteVersoUrl)
      );
    case "selfie":
      return !!p.selfieUrl;
    case "permis":
      return p.pieceIdentiteType === "PERMIS" && !!p.pieceIdentiteRectoUrl;
    case "rccm":
      return !!(p.rccm && p.documentRccmUrl);
    case "nif":
      return !!(p.nif && p.documentNifUrl);
    case "attestation":
      return !!(p.attestationUrl || p.documentJustificatifUrl);
    case "adresse_legale":
      return !!p.adresseLegale;
    case "photo_profil":
      return !!p.selfieUrl;
    default:
      return false;
  }
}

export function docsRequisPour(config: ConfigExigenceKyc, categorie: string): DocKycId[] {
  return config.documents[categorie] || [];
}

/** Conforme = KYC validé par l'admin OU tous les docs requis présents et dossier au moins en revue/validé */
export function estConformeExigence(p: PrestataireDocs, config: ConfigExigenceKyc): boolean {
  if (p.kycStatut === "VALIDE") return true;
  const requis = docsRequisPour(config, p.categorie);
  if (requis.length === 0) return true;
  return requis.every((id) => docPresent(p, id)) && ["EN_REVUE", "VALIDE"].includes(p.kycStatut);
}

export function analyseConformite(p: PrestataireDocs, config: ConfigExigenceKyc) {
  const requis = docsRequisPour(config, p.categorie);
  const manquants = requis.filter((id) => !docPresent(p, id));
  const libelles = Object.fromEntries(DOCUMENTS_KYC_DISPO.map((d) => [d.id, d.libelle]));
  return {
    requis,
    manquants,
    manquantsLibelles: manquants.map((id) => libelles[id] || id),
    conforme: estConformeExigence(p, config),
    kycValide: p.kycStatut === "VALIDE",
  };
}

export function joursDepuisActivation(config: ConfigExigenceKyc, maintenant = new Date()): number | null {
  if (!config.actif || !config.activeLe) return null;
  const debut = new Date(config.activeLe).getTime();
  if (!Number.isFinite(debut)) return null;
  return Math.floor((maintenant.getTime() - debut) / (24 * 60 * 60 * 1000));
}

export function estBloqueDocuments(p: PrestataireDocs, config: ConfigExigenceKyc, maintenant = new Date()): boolean {
  if (!config.actif) return false;
  const requis = docsRequisPour(config, p.categorie);
  if (requis.length === 0) return false;
  if (estConformeExigence(p, config)) return false;
  const jours = joursDepuisActivation(config, maintenant);
  if (jours === null) return false;
  return jours >= config.delaiJours;
}

export function joursRestantsAvantBlocage(config: ConfigExigenceKyc, maintenant = new Date()): number | null {
  if (!config.actif || !config.activeLe) return null;
  const jours = joursDepuisActivation(config, maintenant);
  if (jours === null) return null;
  return Math.max(0, config.delaiJours - jours);
}

/** Statut d'exigence pour l'UI prestataire */
export async function statutExigencePourPrestataire(prestataireId: string) {
  const config = await obtenirConfigExigenceKyc();
  const p = await prisma.prestataire.findUnique({ where: { id: prestataireId } });
  if (!p) throw new ErreurValidation("Prestataire introuvable");

  const analyse = analyseConformite(p, config);
  const bloque = estBloqueDocuments(p, config);
  const joursRestants = analyse.conforme ? null : joursRestantsAvantBlocage(config);

  return {
    exigenceActive: config.actif && analyse.requis.length > 0,
    delaiJours: config.delaiJours,
    activeLe: config.activeLe,
    joursRestants,
    bloque,
    ...analyse,
    documentsDisponibles: DOCUMENTS_KYC_DISPO,
  };
}

/** Rappels + application du blocage (appelé par le scheduler) */
export async function appliquerExigenceDocuments() {
  const config = await obtenirConfigExigenceKyc();
  if (!config.actif || !config.activeLe) {
    return { rappels: 0, bloques: 0 };
  }

  const prestataires = await prisma.prestataire.findMany({
    where: { statut: "APPROUVE" },
  });

  let rappels = 0;
  let bloques = 0;
  const maintenant = new Date();
  const hier = new Date(maintenant.getTime() - 20 * 60 * 60 * 1000);

  for (const p of prestataires) {
    const analyse = analyseConformite(p, config);
    if (analyse.requis.length === 0 || analyse.conforme) continue;

    const bloque = estBloqueDocuments(p, config, maintenant);
    if (bloque) bloques++;

    const dejaNotifie = await prisma.notification.findFirst({
      where: {
        utilisateurId: p.utilisateurId,
        type: "SYSTEME",
        titre: { contains: "documents" },
        creeLe: { gte: hier },
      },
    });
    if (dejaNotifie) continue;

    const joursRestants = joursRestantsAvantBlocage(config, maintenant);
    const message = bloque
      ? `Vos documents obligatoires ne sont pas à jour (${analyse.manquantsLibelles.join(", ") || "dossier incomplet"}). Vous n'êtes plus visible ni réservable jusqu'à validation.`
      : `Complétez vos documents (${analyse.manquantsLibelles.join(", ") || "dossier KYC"}). Il vous reste ${joursRestants ?? config.delaiJours} jour(s) avant suspension de la visibilité.`;

    await prisma.notification.create({
      data: {
        utilisateurId: p.utilisateurId,
        titre: bloque ? "Documents — activité suspendue" : "Rappel — documents requis",
        message,
        type: "SYSTEME",
      },
    });
    rappels++;
  }

  return { rappels, bloques };
}

export async function filtrerIdsPrestatairesNonBloques(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const config = await obtenirConfigExigenceKyc();
  if (!config.actif) return new Set(ids);
  const liste = await prisma.prestataire.findMany({ where: { id: { in: ids } } });
  const ok = new Set<string>();
  for (const p of liste) {
    if (!estBloqueDocuments(p, config)) ok.add(p.id);
  }
  return ok;
}
