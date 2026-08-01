import { Router } from "express";
import * as cartesCadeauxController from "./cartes-cadeaux.controller";
import { valider } from "../../middlewares/valider";
import { authentifier } from "../../middlewares/auth";
import { schemaAcheterCarteCadeau, schemaUtiliserCarteCadeau } from "./cartes-cadeaux.schema";

export const routesCartesCadeaux = Router();

// Toutes les routes exigent un utilisateur authentifié
routesCartesCadeaux.post("/", authentifier, valider(schemaAcheterCarteCadeau), cartesCadeauxController.acheter);
routesCartesCadeaux.get("/moi", authentifier, cartesCadeauxController.mesCartes);
routesCartesCadeaux.get("/par-code/:code", authentifier, cartesCadeauxController.detailParCode);
routesCartesCadeaux.post("/utiliser", authentifier, valider(schemaUtiliserCarteCadeau), cartesCadeauxController.utiliser);
