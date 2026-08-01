import { Router } from "express";
import * as packagesController from "./packages.controller";
import { valider } from "../../middlewares/valider";
import { authentifier, exigerRole } from "../../middlewares/auth";
import { schemaCreerPackage, schemaModifierPackage } from "./packages.schema";

export const routesPackages = Router();

// Public
routesPackages.get("/", packagesController.listerPublics);

// Prestataire (declare avant les routes paramétriques /:packageId)
routesPackages.get("/moi/packages", authentifier, exigerRole("PRESTATAIRE"), packagesController.mesPackages);
routesPackages.post("/", authentifier, exigerRole("PRESTATAIRE"), valider(schemaCreerPackage), packagesController.creer);
routesPackages.patch(
  "/:packageId",
  authentifier,
  exigerRole("PRESTATAIRE"),
  valider(schemaModifierPackage),
  packagesController.modifier
);
routesPackages.delete("/:packageId", authentifier, exigerRole("PRESTATAIRE"), packagesController.supprimer);

// Public (apres les routes statiques pour eviter l'interception de /moi/packages)
routesPackages.get("/:packageId", packagesController.detailPublic);
