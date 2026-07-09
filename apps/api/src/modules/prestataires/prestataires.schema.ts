import { z } from "zod";

export const schemaCreerPrestataire = z.object({
  nomEntreprise: z.string().trim().min(2).max(150),
  categorie: z.enum([
    "SANTE",
    "TRANSPORT",
    "HOTELLERIE",
    "RESTAURATION",
    "SALLE_REUNION",
    "ADMINISTRATIF",
    "EDUCATION",
  ]),
  ville: z.string().trim().min(2).max(100),
  quartier: z.string().trim().min(2).max(100),
  adresse: z.string().trim().max(300).optional(),
  description: z.string().trim().max(1000).optional(),
  documentJustificatifUrl: z.string().url().optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});
export type CreerPrestataireInput = z.infer<typeof schemaCreerPrestataire>;

export const schemaModifierPrestataire = schemaCreerPrestataire.partial().extend({
  delaiAnnulationGratuiteHeures: z.coerce.number().int().min(0).max(168).optional(),
  fraisAnnulationTardivePourcent: z.coerce.number().int().min(0).max(100).optional(),
});
export type ModifierPrestataireInput = z.infer<typeof schemaModifierPrestataire>;

export const schemaValiderPrestataire = z.object({
  prestataireId: z.string().uuid(),
  approuver: z.boolean(),
  motifRejet: z.string().trim().max(500).optional(),
});
export type ValiderPrestataireInput = z.infer<typeof schemaValiderPrestataire>;

export const schemaCreerServiceOffert = z.object({
  nom: z.string().trim().min(2).max(150),
  description: z.string().trim().max(1000).optional(),
  dureeMinutes: z.coerce.number().int().min(5).max(1440).default(30),
  prix: z.coerce.number().positive(),
  devise: z.enum(["CDF", "USD"]).default("CDF"),
});
export type CreerServiceOffertInput = z.infer<typeof schemaCreerServiceOffert>;

export const schemaModifierServiceOffert = schemaCreerServiceOffert.partial().extend({
  actif: z.boolean().optional(),
});
export type ModifierServiceOffertInput = z.infer<typeof schemaModifierServiceOffert>;
