import { Router } from "express";
import * as favorisController from "./favoris.controller";
import { authentifier } from "../../middlewares/auth";

export const routesFavoris = Router();

routesFavoris.use(authentifier);

routesFavoris.get("/", favorisController.listerFavoris);
routesFavoris.post("/:serviceId", favorisController.ajouterFavori);
routesFavoris.delete("/:serviceId", favorisController.supprimerFavori);
