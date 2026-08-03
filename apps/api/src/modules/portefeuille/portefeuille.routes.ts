import { Router } from "express";
import * as portefeuilleController from "./portefeuille.controller";
import { authentifier } from "../../middlewares/auth";

export const routesPortefeuille = Router();

routesPortefeuille.get("/moi", authentifier, portefeuilleController.monPortefeuille);
