import { z } from "zod";

export const schemaCreerConversation = z.object({
  participantId: z.string().uuid("ID du participant invalide"),
  sujet: z.string().max(200).optional(),
  reservationId: z.string().uuid().optional(),
});

export const schemaEnvoyerMessage = z
  .object({
    contenu: z.string().max(2000, "Message trop long (2000 caractères max)").optional().default(""),
    imageUrl: z.string().url("URL d'image invalide").optional(),
  })
  .refine((d) => (d.contenu?.trim().length ?? 0) > 0 || !!d.imageUrl, {
    message: "Le message doit contenir du texte ou une image",
  });

export const schemaRechercheConversations = z.object({
  page: z.coerce.number().int().positive().default(1),
  parPage: z.coerce.number().int().positive().max(50).default(20),
});

export const schemaRechercheMessages = z.object({
  page: z.coerce.number().int().positive().default(1),
  parPage: z.coerce.number().int().positive().max(100).default(50),
});
