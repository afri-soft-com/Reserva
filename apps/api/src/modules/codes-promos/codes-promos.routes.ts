import { Router } from "express";
import * as codesPromosController from "./codes-promos.controller";
import { valider } from "../../middlewares/valider";
import { authentifier, exigerRole } from "../../middlewares/auth";
import {
  schemaCreerCodePromo,
  schemaModifierCodePromo,
  schemaValiderCodePromo,
  schemaAppliquerCodePromo,
} from "./codes-promos.schema";

export const routesCodesPromos = Router();

// Admin : CRUD complet
routesCodesPromos.get("/", authentifier, exigerRole("ADMIN"), codesPromosController.lister);
routesCodesPromos.get("/:id", authentifier, exigerRole("ADMIN"), codesPromosController.obtenir);
routesCodesPromos.post(
  "/",
  authentifier,
  exigerRole("ADMIN"),
  valider(schemaCreerCodePromo),
  codesPromosController.creer
);
routesCodesPromos.patch(
  "/:id",
  authentifier,
  exigerRole("ADMIN"),
  valider(schemaModifierCodePromo),
  codesPromosController.modifier
);
routesCodesPromos.delete(
  "/:id",
  authentifier,
  exigerRole("ADMIN"),
  codesPromosController.supprimer
);

// Client : validation et application
routesCodesPromos.post(
  "/valider",
  authentifier,
  valider(schemaValiderCodePromo),
  codesPromosController.valider
);
routesCodesPromos.post(
  "/appliquer",
  authentifier,
  valider(schemaAppliquerCodePromo),
  codesPromosController.appliquer
);

// Codes disponibles
routesCodesPromos.get("/disponibles/publics", authentifier, codesPromosController.utilisables);
