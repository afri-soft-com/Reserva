import { Router } from "express";
import { z } from "zod";
import * as alertesController from "./alertes.controller";
import { valider } from "../../middlewares/valider";
import { authentifier, exigerRole } from "../../middlewares/auth";

export const routesAlertes = Router();

const schemaCreerAlerte = z.object({
  serviceId: z.string().uuid("Identifiant de service invalide"),
});

routesAlertes.get("/moi", authentifier, alertesController.mesAlertes);
routesAlertes.post(
  "/",
  authentifier,
  exigerRole("CLIENT", "ADMIN"),
  valider(schemaCreerAlerte),
  alertesController.creer
);
routesAlertes.delete("/:alerteId", authentifier, alertesController.desactiver);
