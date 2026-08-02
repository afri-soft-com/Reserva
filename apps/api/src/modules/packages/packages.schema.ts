import { z } from "zod";

export const schemaCreerPackage = z.object({
  nom: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  prix: z.coerce.number().positive("Le prix doit être positif"),
  devise: z.enum(["CDF", "USD"]).default("CDF"),
  serviceIds: z.array(z.string().uuid("Identifiant de service invalide")).min(1, "Un package doit contenir au moins un service"),
});
export type CreerPackageInput = z.infer<typeof schemaCreerPackage>;

export const schemaModifierPackage = z.object({
  nom: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(500).optional(),
  prix: z.coerce.number().positive().optional(),
  devise: z.enum(["CDF", "USD"]).optional(),
  actif: z.boolean().optional(),
  serviceIds: z.array(z.string().uuid("Identifiant de service invalide")).min(1).optional(),
});
export type ModifierPackageInput = z.infer<typeof schemaModifierPackage>;

export const schemaReserverPackage = z.object({
  packageId: z.string().uuid("Identifiant de package invalide"),
  items: z
    .array(
      z.object({
        serviceId: z.string().uuid("Identifiant de service invalide"),
        creneauId: z.string().uuid("Identifiant de créneau invalide"),
        notes: z.string().trim().max(500).optional(),
      })
    )
    .min(1, "Sélectionnez au moins un service avec un créneau"),
});
export type ReserverPackageInput = z.infer<typeof schemaReserverPackage>;
