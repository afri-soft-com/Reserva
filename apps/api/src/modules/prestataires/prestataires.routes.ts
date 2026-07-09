import { Router } from "express";
import * as prestatairesController from "./prestataires.controller";
import { valider } from "../../middlewares/valider";
import { authentifier, exigerRole } from "../../middlewares/auth";
import {
  schemaCreerPrestataire,
  schemaModifierPrestataire,
  schemaValiderPrestataire,
  schemaCreerServiceOffert,
  schemaModifierServiceOffert,
} from "./prestataires.schema";

export const routesPrestataires = Router();

// Route publique — recherche de prestataires à proximité
routesPrestataires.get("/proches", prestatairesController.listerProches);

// Routes prestataire (utilisateur authentifié devient prestataire)
routesPrestataires.post("/", authentifier, valider(schemaCreerPrestataire), prestatairesController.creerProfil);
routesPrestataires.get("/moi", authentifier, prestatairesController.monProfil);
routesPrestataires.patch("/moi", authentifier, valider(schemaModifierPrestataire), prestatairesController.modifierProfil);
routesPrestataires.get("/moi/tableau-de-bord", authentifier, exigerRole("PRESTATAIRE"), prestatairesController.tableauDeBord);
routesPrestataires.get("/moi/abonnement", authentifier, exigerRole("PRESTATAIRE"), prestatairesController.monAbonnement);

// Gestion des services proposés
routesPrestataires.post(
  "/moi/services",
  authentifier,
  exigerRole("PRESTATAIRE"),
  valider(schemaCreerServiceOffert),
  prestatairesController.creerService
);
routesPrestataires.get("/moi/services", authentifier, exigerRole("PRESTATAIRE"), prestatairesController.mesServices);
routesPrestataires.patch(
  "/moi/services/:serviceId",
  authentifier,
  exigerRole("PRESTATAIRE"),
  valider(schemaModifierServiceOffert),
  prestatairesController.modifierService
);

// Routes admin — validation des prestataires (US-011 du cahier des charges)
routesPrestataires.get("/admin/en-attente", authentifier, exigerRole("ADMIN"), prestatairesController.listerEnAttente);
routesPrestataires.post(
  "/admin/valider",
  authentifier,
  exigerRole("ADMIN"),
  valider(schemaValiderPrestataire),
  prestatairesController.valider
);
