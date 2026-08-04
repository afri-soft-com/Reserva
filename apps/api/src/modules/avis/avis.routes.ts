import { Router } from "express";
import * as avisController from "./avis.controller";
import { valider } from "../../middlewares/valider";
import { authentifier, exigerRole } from "../../middlewares/auth";
import { schemaCreerAvis, schemaReponseAvis, schemaModifierReponseAvis } from "@reserva/shared";

export const routesAvis = Router();

routesAvis.post("/", authentifier, valider(schemaCreerAvis), avisController.creer);
routesAvis.post("/repondre", authentifier, exigerRole("PRESTATAIRE"), valider(schemaReponseAvis), avisController.repondre);
routesAvis.patch("/:avisId/reponse", authentifier, exigerRole("PRESTATAIRE"), valider(schemaModifierReponseAvis), avisController.modifierReponse);
routesAvis.delete("/:avisId/reponse", authentifier, exigerRole("PRESTATAIRE"), avisController.supprimerReponse);
routesAvis.get("/moi", authentifier, avisController.mesAvis);
routesAvis.get("/recus", authentifier, exigerRole("PRESTATAIRE"), avisController.avisRecus);
