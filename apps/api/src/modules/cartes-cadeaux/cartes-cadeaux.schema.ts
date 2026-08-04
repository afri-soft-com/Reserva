import { z } from "zod";

export const schemaAcheterCarteCadeau = z.object({
  montant: z.coerce.number().positive("Le montant doit être positif"),
  devise: z.enum(["CDF", "USD"]).default("CDF"),
  beneficiaireTelephone: z
    .string()
    .trim()
    .regex(/^(\+?243|0)?[89]\d{8}$/, "Numéro de téléphone congolais invalide")
    .optional(),
});
export type AcheterCarteCadeauInput = z.infer<typeof schemaAcheterCarteCadeau>;

export const schemaUtiliserCarteCadeau = z.object({
  code: z.string().trim().min(1).max(30),
  reservationId: z.string().uuid(),
});
export type UtiliserCarteCadeauInput = z.infer<typeof schemaUtiliserCarteCadeau>;

export const schemaTransfererCarteCadeau = z.object({
  beneficiaireTelephone: z.string().trim().regex(/^(\+?243|0)?[89]\d{8}$/, "Numéro de téléphone congolais invalide"),
});
export type TransfererCarteCadeauInput = z.infer<typeof schemaTransfererCarteCadeau>;
