import { z } from "zod";

export const schemaTokenVoix = z
  .object({
    conversationId: z.string().uuid().optional(),
    reservationId: z.string().uuid().optional(),
  })
  .refine((d) => !!d.conversationId || !!d.reservationId, {
    message: "Indiquez conversationId ou reservationId",
  });
