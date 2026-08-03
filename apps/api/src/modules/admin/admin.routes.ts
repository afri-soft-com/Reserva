import { Router } from "express";
import * as adminController from "./admin.controller";
import { authentifier, exigerRole } from "../../middlewares/auth";

export const routesAdmin = Router();

// Toutes les routes admin sont protégées par le rôle ADMIN
routesAdmin.get("/statistiques", authentifier, exigerRole("ADMIN"), adminController.statistiques);
routesAdmin.get("/statistiques/pdf", authentifier, exigerRole("ADMIN"), adminController.statistiquesPdf);
routesAdmin.get("/prestataires", authentifier, exigerRole("ADMIN"), adminController.listerPrestataires);
routesAdmin.get("/utilisateurs", authentifier, exigerRole("ADMIN"), adminController.listerUtilisateurs);
routesAdmin.post("/prestataires/:prestataireId/suspendre", authentifier, exigerRole("ADMIN"), adminController.suspendre);

// Plans d'abonnement
routesAdmin.get("/plans", authentifier, exigerRole("ADMIN"), adminController.listerPlans);
routesAdmin.post("/plans", authentifier, exigerRole("ADMIN"), adminController.creerPlan);
routesAdmin.put("/plans/:id", authentifier, exigerRole("ADMIN"), adminController.modifierPlan);
routesAdmin.delete("/plans/:id", authentifier, exigerRole("ADMIN"), adminController.supprimerPlan);

// Abonnements prestataire
routesAdmin.get("/abonnements", authentifier, exigerRole("ADMIN"), adminController.listerAbonnements);
routesAdmin.post("/abonnements", authentifier, exigerRole("ADMIN"), adminController.creerAbonnement);

// Configuration tarification
routesAdmin.get("/tarifications", authentifier, exigerRole("ADMIN"), adminController.listerConfigurations);
routesAdmin.post("/tarifications", authentifier, exigerRole("ADMIN"), adminController.creerOuModifierConfig);
routesAdmin.delete("/tarifications/:id", authentifier, exigerRole("ADMIN"), adminController.supprimerConfig);

// Export CSV
routesAdmin.get("/export/:type", authentifier, exigerRole("ADMIN"), adminController.exporterCSV);
