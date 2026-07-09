import { z } from "zod";

export const schemaCreerPublicite = z.object({
  titre: z.string().trim().min(2).max(200),
  imageUrl: z.string().url().optional(),
  lienUrl: z.string().url().optional(),
  description: z.string().trim().max(500).optional(),
  actif: z.boolean().default(true),
  dateDebut: z.string().optional(),
  dateFin: z.string().optional(),
  cible: z.enum(["TOUS", "CLIENT", "PRESTATAIRE", "ADMIN"]).default("TOUS"),
});

export const schemaModifierPublicite = schemaCreerPublicite.partial();

export const schemaCompteurPublicite = z.object({
  publiciteId: z.string().uuid(),
  type: z.enum(["IMPRESSION", "CLIC"]),
});
