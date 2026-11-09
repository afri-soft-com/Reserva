import { z } from "zod";

export const schemaTokenVoix = z
  .object({
    conversationId: z.string().guid().optional(),
    reservationId: z.string().guid().optional(),
  })
  .refine((d) => !!d.conversationId || !!d.reservationId, {
    message: "Indiquez conversationId ou reservationId",
  });
