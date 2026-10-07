import { z } from "zod";

const urlOptionnelle = z.string().url().optional().nullable();

export const schemaMettreAJourKyc = z.object({
  pieceIdentiteType: z.enum(["CNI", "PASSEPORT", "PERMIS"]).optional().nullable(),
  pieceIdentiteNumero: z.string().trim().min(3).max(80).optional().nullable(),
  pieceIdentiteRectoUrl: urlOptionnelle,
  pieceIdentiteVersoUrl: urlOptionnelle,
  selfieUrl: urlOptionnelle,
  rccm: z.string().trim().max(80).optional().nullable(),
  nif: z.string().trim().max(80).optional().nullable(),
  adresseLegale: z.string().trim().max(300).optional().nullable(),
  documentRccmUrl: urlOptionnelle,
  documentNifUrl: urlOptionnelle,
  attestationUrl: urlOptionnelle,
  documentJustificatifUrl: urlOptionnelle,
});
export type MettreAJourKycInput = z.infer<typeof schemaMettreAJourKyc>;

export const schemaReviserKyc = z.object({
  prestataireId: z.string().uuid(),
  decision: z.enum(["VALIDER", "INFO_MANQUANTE", "REFUSER"]),
  motif: z.string().trim().max(500).optional(),
  /** Si true (défaut), VALIDER approuve aussi le profil prestataire */
  approuverProfil: z.boolean().optional().default(true),
});
export type ReviserKycInput = z.infer<typeof schemaReviserKyc>;
