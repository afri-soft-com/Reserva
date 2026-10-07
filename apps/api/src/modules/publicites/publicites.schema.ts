import { z } from "zod";

export const schemaCreerPublicite = z.object({
  titre: z.string().trim().min(2).max(200),
  imageUrl: z.string().url().optional().or(z.string().startsWith("/")),
  lienUrl: z.string().url().optional().or(z.literal("")),
  description: z.string().trim().max(500).optional(),
  actif: z.boolean().default(true),
  dateDebut: z.string().optional(),
  dateFin: z.string().optional(),
  cible: z.enum(["TOUS", "CLIENT", "PRESTATAIRE", "ADMIN"]).default("TOUS"),
  modeleFacturation: z.enum(["GRATUIT", "FORFAIT", "CPM", "CPC"]).default("GRATUIT"),
  prixCampagne: z.coerce.number().nonnegative().optional(),
  devise: z.enum(["CDF", "USD"]).default("CDF"),
  annonceurNom: z.string().trim().max(120).optional(),
});

export const schemaModifierPublicite = schemaCreerPublicite.partial();

export const schemaCompteurPublicite = z.object({
  publiciteId: z.string().uuid(),
  type: z.enum(["IMPRESSION", "CLIC"]),
});
