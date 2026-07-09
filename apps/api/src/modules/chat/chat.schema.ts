import { z } from "zod";

export const schemaCreerConversation = z.object({
  participantId: z.string().uuid("ID du participant invalide"),
  sujet: z.string().max(200).optional(),
  reservationId: z.string().uuid().optional(),
});

export const schemaEnvoyerMessage = z.object({
  contenu: z.string().min(1, "Le message ne peut pas être vide").max(2000, "Message trop long (2000 caractères max)"),
});

export const schemaRechercheConversations = z.object({
  page: z.coerce.number().int().positive().default(1),
  parPage: z.coerce.number().int().positive().max(50).default(20),
});

export const schemaRechercheMessages = z.object({
  page: z.coerce.number().int().positive().default(1),
  parPage: z.coerce.number().int().positive().max(100).default(50),
});
