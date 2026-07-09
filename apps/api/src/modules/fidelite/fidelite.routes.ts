import { Router } from "express";
import * as fideliteController from "./fidelite.controller";
import { authentifier } from "../../middlewares/auth";

export const routesFidelite = Router();

routesFidelite.get("/solde", authentifier, fideliteController.solde);
routesFidelite.get("/historique", authentifier, fideliteController.historique);
routesFidelite.get("/estimer", authentifier, fideliteController.estimer);
