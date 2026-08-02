import { Router } from "express";
import { z } from "zod";
import * as avoirsController from "./avoirs.controller";
import { valider } from "../../middlewares/valider";
import { authentifier, exigerRole } from "../../middlewares/auth";

export const routesAvoirs = Router();

const schemaAppliquerAvoir = z.object({
  reservationId: z.string().uuid("Identifiant de réservation invalide"),
  montant: z.coerce.number().positive().optional(),
});

routesAvoirs.get("/moi", authentifier, avoirsController.mesAvoirs);
routesAvoirs.post(
  "/appliquer",
  authentifier,
  exigerRole("CLIENT", "ADMIN"),
  valider(schemaAppliquerAvoir),
  avoirsController.appliquer
);
