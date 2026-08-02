import { Router } from "express";
import { z } from "zod";
import * as attentesController from "./attentes.controller";
import { valider } from "../../middlewares/valider";
import { authentifier, exigerRole } from "../../middlewares/auth";

export const routesAttentes = Router();

const schemaInscriptionAttente = z.object({
  serviceId: z.string().uuid("Identifiant de service invalide"),
  creneauId: z.string().uuid("Identifiant de créneau invalide"),
});

routesAttentes.post(
  "/inscrire",
  authentifier,
  exigerRole("CLIENT", "ADMIN"),
  valider(schemaInscriptionAttente),
  attentesController.inscrire
);
routesAttentes.get("/moi", authentifier, attentesController.mesAttentes);
routesAttentes.delete("/:entreeId", authentifier, attentesController.quitter);
routesAttentes.get(
  "/creneau/:creneauId",
  authentifier,
  exigerRole("PRESTATAIRE"),
  attentesController.attenteCreneau
);
