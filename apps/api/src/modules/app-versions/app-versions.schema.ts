import { z } from "zod";

const urlOuVide = z.union([z.string().url(), z.literal("")]).optional();

const schemaCanal = z.object({
  minSoft: z.string().min(1),
  minForce: z.string().min(1),
  storeUrlAndroid: urlOuVide,
  storeUrlIos: urlOuVide,
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
