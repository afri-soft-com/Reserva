import { z } from "zod";

const codeCategorie = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z][A-Z0-9_]{1,39}$/, "Code: majuscules, chiffres et _ (2–40 car.)");

export const schemaCreerCategorie = z.object({
  code: codeCategorie,
  libelle: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  icone: z.string().trim().max(80).optional().nullable(),
  couleur: z
    .string()
    .trim()
    .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Couleur hex (#RGB ou #RRGGBB)")
    .optional()
    .nullable(),
  ordre: z.coerce.number().int().min(0).max(9999).optional(),
  actif: z.boolean().optional(),
});
export type CreerCategorieInput = z.infer<typeof schemaCreerCategorie>;

export const schemaModifierCategorie = z.object({
  libelle: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  icone: z.string().trim().max(80).optional().nullable(),
  couleur: z
    .string()
    .trim()
    .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Couleur hex (#RGB ou #RRGGBB)")
    .optional()
    .nullable(),
  ordre: z.coerce.number().int().min(0).max(9999).optional(),
  actif: z.boolean().optional(),
});
export type ModifierCategorieInput = z.infer<typeof schemaModifierCategorie>;
