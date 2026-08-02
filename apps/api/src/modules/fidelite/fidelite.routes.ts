import { Router } from "express";
import * as fideliteController from "./fidelite.controller";
import { authentifier, exigerRole } from "../../middlewares/auth";
import { valider } from "../../middlewares/valider";
import { z } from "zod";

export const routesFidelite = Router();

const schemaAppliquerPoints = z.object({
  reservationId: z.string().uuid("Identifiant de réservation invalide"),
  points: z.coerce.number().int().min(1, "Le nombre de points doit être positif"),
});

routesFidelite.get("/solde", authentifier, fideliteController.solde);
routesFidelite.get("/historique", authentifier, fideliteController.historique);
routesFidelite.get("/estimer", authentifier, fideliteController.estimer);
routesFidelite.post(
  "/appliquer",
  authentifier,
  exigerRole("CLIENT", "ADMIN"),
  valider(schemaAppliquerPoints),
  fideliteController.appliquer
);
