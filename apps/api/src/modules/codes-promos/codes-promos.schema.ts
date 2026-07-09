import { z } from "zod";

export const schemaCreerCodePromo = z.object({
  code: z.string().trim().min(2).max(30).toUpperCase(),
  description: z.string().trim().max(500).optional(),
  type: z.enum(["PERCENTAGE", "FIXED"]).default("PERCENTAGE"),
  valeur: z.coerce.number().positive(),
  devise: z.enum(["CDF", "USD"]).default("CDF"),
  montantMin: z.coerce.number().positive().optional(),
  usageMax: z.coerce.number().int().positive().optional(),
  dateDebut: z.string().datetime(),
  dateFin: z.string().datetime(),
});
export type CreerCodePromoInput = z.infer<typeof schemaCreerCodePromo>;

export const schemaModifierCodePromo = z.object({
  description: z.string().trim().max(500).optional(),
  actif: z.boolean().optional(),
  usageMax: z.coerce.number().int().positive().optional(),
  dateDebut: z.string().datetime().optional(),
  dateFin: z.string().datetime().optional(),
});
export type ModifierCodePromoInput = z.infer<typeof schemaModifierCodePromo>;

export const schemaValiderCodePromo = z.object({
  code: z.string().trim().min(1).max(30),
  montant: z.coerce.number().positive(),
});
export type ValiderCodePromoInput = z.infer<typeof schemaValiderCodePromo>;

export const schemaAppliquerCodePromo = z.object({
  code: z.string().trim().min(1).max(30),
  reservationId: z.string().uuid(),
});
export type AppliquerCodePromoInput = z.infer<typeof schemaAppliquerCodePromo>;
