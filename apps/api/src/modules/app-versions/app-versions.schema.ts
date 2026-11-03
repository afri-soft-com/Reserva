import { z } from "zod";

const urlOuVide = z.union([z.string().url(), z.literal("")]).optional();
/** Numéro de build store (entier) ; "" ou "0" = pas de seuil de build. */
const buildOuVide = z.union([z.string().regex(/^\d{0,9}$/, "Build entière requise"), z.number().int().min(0)]).optional();

const schemaCanal = z.object({
  minSoft: z.string().min(1),
  minForce: z.string().min(1),
  storeUrlAndroid: urlOuVide,
  storeUrlIos: urlOuVide,
  minSoftBuildAndroid: buildOuVide,
  minSoftBuildIos: buildOuVide,
});

export const schemaMettreAJourVersions = z.object({
  client: schemaCanal.optional(),
  pro: schemaCanal.optional(),
  web: z
    .object({
      minSoft: z.string().min(1),
      minForce: z.string().min(1),
    })
    .optional(),
});

const schemaSeuilPublie = z.object({
  minSoft: z.string().regex(/^\d+\.\d+\.\d+/, "Version a.b.c requise"),
  minForce: z
    .string()
    .regex(/^\d+\.\d+\.\d+/, "Version a.b.c requise")
    .optional(),
});

export const schemaPublierSeuils = z.object({
  client: schemaSeuilPublie.optional(),
  pro: schemaSeuilPublie.optional(),
  web: schemaSeuilPublie.optional(),
});
