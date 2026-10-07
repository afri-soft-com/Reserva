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
import { schemaMettreAJourKyc, schemaReviserKyc } from "./kyc.schema";

export const routesPrestataires = Router();

// Route publique — recherche de prestataires à proximité
routesPrestataires.get("/proches", prestatairesController.listerProches);

// Routes prestataire (utilisateur authentifié devient prestataire)
routesPrestataires.post("/", authentifier, valider(schemaCreerPrestataire), prestatairesController.creerProfil);
routesPrestataires.get("/moi", authentifier, prestatairesController.monProfil);
routesPrestataires.patch("/moi", authentifier, valider(schemaModifierPrestataire), prestatairesController.modifierProfil);
routesPrestataires.get("/moi/tableau-de-bord", authentifier, exigerRole("PRESTATAIRE"), prestatairesController.tableauDeBord);
routesPrestataires.get("/moi/calendrier", authentifier, exigerRole("PRESTATAIRE"), prestatairesController.calendrier);
routesPrestataires.get("/moi/statistiques", authentifier, exigerRole("PRESTATAIRE"), prestatairesController.statistiques);
routesPrestataires.get("/moi/abonnement", authentifier, exigerRole("PRESTATAIRE"), prestatairesController.monAbonnement);

// KYC complet (identité + entreprise)
routesPrestataires.get("/moi/kyc", authentifier, exigerRole("PRESTATAIRE"), prestatairesController.monKyc);
routesPrestataires.patch(
  "/moi/kyc",
  authentifier,
  exigerRole("PRESTATAIRE"),
  valider(schemaMettreAJourKyc),
  prestatairesController.mettreAJourKyc
);
routesPrestataires.post("/moi/kyc/soumettre", authentifier, exigerRole("PRESTATAIRE"), prestatairesController.soumettreKyc);

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
routesPrestataires.get("/admin/kyc", authentifier, exigerRole("ADMIN"), prestatairesController.listerKycEnRevue);
routesPrestataires.get(
  "/admin/:prestataireId/kyc",
  authentifier,
  exigerRole("ADMIN"),
  prestatairesController.detailKycAdmin
);
routesPrestataires.post(
  "/admin/kyc/reviser",
  authentifier,
  exigerRole("ADMIN"),
  valider(schemaReviserKyc),
  prestatairesController.reviserKyc
);
