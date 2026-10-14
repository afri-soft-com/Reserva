import { Router } from "express";
import * as categoriesController from "./categories.controller";
import { valider } from "../../middlewares/valider";
import { authentifier, exigerRole } from "../../middlewares/auth";
import { schemaCreerCategorie, schemaModifierCategorie } from "./categories.schema";

export const routesCategories = Router();

/** Public — catalogue actif (apps mobile / web) */
routesCategories.get("/publiques", categoriesController.listerPubliques);

/** Admin — CRUD */
routesCategories.get("/", authentifier, exigerRole("ADMIN"), categoriesController.lister);
routesCategories.get("/:id", authentifier, exigerRole("ADMIN"), categoriesController.obtenir);
routesCategories.post(
  "/",
  authentifier,
  exigerRole("ADMIN"),
  valider(schemaCreerCategorie),
  categoriesController.creer
);
routesCategories.patch(
  "/:id",
  authentifier,
  exigerRole("ADMIN"),
  valider(schemaModifierCategorie),
  categoriesController.modifier
);
routesCategories.delete(
  "/:id",
  authentifier,
  exigerRole("ADMIN"),
  categoriesController.supprimer
);
