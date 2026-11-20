import { z } from "zod";

export const schemaCreerPrestataire = z.object({
  nomEntreprise: z.string().trim().min(2).max(150),
  /** Code catalogue (admin CRUD) — ex. SANTE, TRANSPORT, … */
  categorie: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9_]{1,39}$/, "Code catégorie invalide"),
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
  prestataireId: z.string().guid(),
  approuver: z.boolean(),
  motifRejet: z.string().trim().max(500).optional(),
});
export type ValiderPrestataireInput = z.infer<typeof schemaValiderPrestataire>;

const champsServiceOffert = {
  nom: z.string().trim().min(2).max(150),
  description: z.string().trim().max(1000).optional(),
  dureeMinutes: z.coerce.number().int().min(5).max(1440),
  prix: z.coerce.number().positive(),
  devise: z.enum(["CDF", "USD"]),
  /** CRENEAU : une place par réservation · TABLE : restaurant, table attribuée selon les couverts */
  modeReservation: z.enum(["CRENEAU", "TABLE"]),
  /** Prix multiplié par le nombre de personnes (menu, buffet) */
  prixParPersonne: z.boolean(),
};

export const schemaCreerServiceOffert = z.object({
  ...champsServiceOffert,
  dureeMinutes: champsServiceOffert.dureeMinutes.default(30),
  devise: champsServiceOffert.devise.default("CDF"),
  modeReservation: champsServiceOffert.modeReservation.default("CRENEAU"),
  prixParPersonne: champsServiceOffert.prixParPersonne.default(false),
});
export type CreerServiceOffertInput = z.infer<typeof schemaCreerServiceOffert>;

/** Sans valeurs par défaut : zod 4 les appliquerait aux champs absents et écraserait l'existant */
export const schemaModifierServiceOffert = z.object(champsServiceOffert).partial().extend({
  actif: z.boolean().optional(),
});
export type ModifierServiceOffertInput = z.infer<typeof schemaModifierServiceOffert>;
