import { prisma } from "../../config/prisma";
import {
  DEFAULT_PRIVACY_BODY,
  DEFAULT_PRIVACY_TITLE,
  DEFAULT_PRIVACY_VERSION,
} from "./legal.defaults";

const CLE_TITLE = "LEGAL_PRIVACY_TITLE";
const CLE_VERSION = "LEGAL_PRIVACY_VERSION";
const CLE_BODY = "LEGAL_PRIVACY_BODY";
const CLE_FORMAT = "LEGAL_PRIVACY_FORMAT";

export type DocumentPrivacy = {
  slug: "privacy";
  title: string;
  version: string;
  body: string;
  format: string;
  source: "database" | "fallback";
};

async function upsertCle(cle: string, valeur: string, description: string) {
  const exist = await prisma.configurationTarification.findUnique({ where: { cle } });
  if (exist) {
    return prisma.configurationTarification.update({
      where: { cle },
      data: { valeur, actif: true, description },
    });
  }
  return prisma.configurationTarification.create({
    data: { cle, valeur, description, type: "TEXTE", actif: true },
  });
}

/** Idempotent — insère le texte par défaut si les clés absentes. */
export async function assurerPrivacyParDefaut() {
  const exist = await prisma.configurationTarification.findUnique({ where: { cle: CLE_BODY } });
  if (exist) return;
  await upsertCle(CLE_TITLE, DEFAULT_PRIVACY_TITLE, "Titre politique de confidentialité");
  await upsertCle(CLE_VERSION, DEFAULT_PRIVACY_VERSION, "Version politique de confidentialité");
  await upsertCle(CLE_BODY, DEFAULT_PRIVACY_BODY, "Corps politique de confidentialité");
  await upsertCle(CLE_FORMAT, "markdown", "Format politique de confidentialité");
}

export async function lirePrivacyPubliee(): Promise<DocumentPrivacy> {
  const cles = [CLE_TITLE, CLE_VERSION, CLE_BODY, CLE_FORMAT];
  const lignes = await prisma.configurationTarification.findMany({
    where: { cle: { in: cles }, actif: true },
  });
  const map = Object.fromEntries(lignes.map((l) => [l.cle, l.valeur]));
  const body = (map[CLE_BODY] ?? "").trim();
  if (!body) {
    return {
      slug: "privacy",
      title: DEFAULT_PRIVACY_TITLE,
      version: DEFAULT_PRIVACY_VERSION,
      body: DEFAULT_PRIVACY_BODY,
      format: "markdown",
      source: "fallback",
    };
  }
  return {
    slug: "privacy",
    title: map[CLE_TITLE] || DEFAULT_PRIVACY_TITLE,
    version: map[CLE_VERSION] || DEFAULT_PRIVACY_VERSION,
    body,
    format: map[CLE_FORMAT] || "markdown",
    source: "database",
  };
}

export async function enregistrerPrivacy(input: {
  title?: string;
  version?: string;
  body: string;
  format?: string;
}): Promise<DocumentPrivacy> {
  const title = (input.title ?? DEFAULT_PRIVACY_TITLE).trim() || DEFAULT_PRIVACY_TITLE;
  const version = (input.version ?? DEFAULT_PRIVACY_VERSION).trim() || DEFAULT_PRIVACY_VERSION;
  const body = input.body.trim();
  if (!body) throw new Error("Le texte de la politique est obligatoire.");
  const format = (input.format ?? "markdown").trim().toLowerCase() || "markdown";
  if (!["markdown", "html", "plain"].includes(format)) {
    throw new Error("Format invalide (markdown, html ou plain).");
  }
  if (body.length > 200_000) throw new Error("Texte trop long.");

  await upsertCle(CLE_TITLE, title, "Titre politique de confidentialité");
  await upsertCle(CLE_VERSION, version, "Version politique de confidentialité");
  await upsertCle(CLE_BODY, body, "Corps politique de confidentialité");
  await upsertCle(CLE_FORMAT, format, "Format politique de confidentialité");

  return {
    slug: "privacy",
    title,
    version,
    body,
    format,
    source: "database",
  };
}
