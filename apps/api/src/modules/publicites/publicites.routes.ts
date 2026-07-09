import { Router } from "express";
import * as publicitesController from "./publicites.controller";
import { valider } from "../../middlewares/valider";
import { authentifier, exigerRole } from "../../middlewares/auth";
import { schemaCreerPublicite, schemaModifierPublicite, schemaCompteurPublicite } from "./publicites.schema";

export const routesPublicites = Router();

routesPublicites.get("/actives", publicitesController.lister);
routesPublicites.post("/compteur", valider(schemaCompteurPublicite), publicitesController.compteur);

routesPublicites.use(authentifier);

routesPublicites.get("/", exigerRole("ADMIN"), publicitesController.lister);
routesPublicites.get("/:id", publicitesController.obtenir);
routesPublicites.post("/", exigerRole("ADMIN"), valider(schemaCreerPublicite), publicitesController.creer);
routesPublicites.patch("/:id", exigerRole("ADMIN"), valider(schemaModifierPublicite), publicitesController.modifier);
routesPublicites.delete("/:id", exigerRole("ADMIN"), publicitesController.supprimer);
