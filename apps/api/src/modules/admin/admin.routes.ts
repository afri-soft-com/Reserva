import { Router } from "express";
import * as adminController from "./admin.controller";
import { authentifier, exigerRole } from "../../middlewares/auth";
import { verifierSecretCron } from "../../middlewares/cron";
import { valider } from "../../middlewares/valider";
import { z } from "zod";

const schemaBroadcast = z.object({
  titre: z.string().trim().min(1, "Le titre est requis").max(100),
  message: z.string().trim().min(1, "Le message est requis").max(1000),
  role: z.enum(["CLIENT", "PRESTATAIRE", "ADMIN"]).optional(),
});

export const routesAdmin = Router();

// Endpoint pour scheduler externe — protégé par secret partagé (voir docs/cron.md)
routesAdmin.post("/cron/rapport-hebdo", verifierSecretCron, adminController.rapportHebdomadaire);
routesAdmin.post("/cron/expirer-abonnements", verifierSecretCron, adminController.expirerAbonnements);
routesAdmin.post("/cron/liberer-sequestres", verifierSecretCron, adminController.libererSequestres);

// Toutes les routes admin sont protégées par le rôle ADMIN
routesAdmin.get("/statistiques", authentifier, exigerRole("ADMIN"), adminController.statistiques);
routesAdmin.get("/statistiques/pdf", authentifier, exigerRole("ADMIN"), adminController.statistiquesPdf);
routesAdmin.get("/pilotage", authentifier, exigerRole("ADMIN"), adminController.pilotage);
routesAdmin.get("/reservations", authentifier, exigerRole("ADMIN"), adminController.listerReservations);
routesAdmin.get("/audits", authentifier, exigerRole("ADMIN"), adminController.listerAudits);
routesAdmin.get("/prestataires", authentifier, exigerRole("ADMIN"), adminController.listerPrestataires);
routesAdmin.get("/utilisateurs", authentifier, exigerRole("ADMIN"), adminController.listerUtilisateurs);
const schemaCreerUtilisateur = z.object({
  telephone: z.string().trim().min(9),
  nom: z.string().trim().min(2).max(100),
  email: z.string().email().optional().or(z.literal("")),
  role: z.enum(["CLIENT", "ADMIN", "AGENT"]),
  pin: z.string().regex(/^\d{4}$/),
  langue: z.enum(["fr", "ln", "sw"]).optional(),
});
const schemaModifierUtilisateur = z.object({
  nom: z.string().trim().min(2).max(100).optional(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  role: z.enum(["CLIENT", "ADMIN", "AGENT", "PRESTATAIRE"]).optional(),
  langue: z.enum(["fr", "ln", "sw"]).optional(),
  pin: z.string().regex(/^\d{4}$/).optional(),
  deuxFAActif: z.boolean().optional(),
});
routesAdmin.post(
  "/utilisateurs",
  authentifier,
  exigerRole("ADMIN"),
  valider(schemaCreerUtilisateur),
  adminController.creerUtilisateur
);
routesAdmin.patch(
  "/utilisateurs/:utilisateurId",
  authentifier,
  exigerRole("ADMIN"),
  valider(schemaModifierUtilisateur),
  adminController.modifierUtilisateur
);
routesAdmin.delete(
  "/utilisateurs/:utilisateurId",
  authentifier,
  exigerRole("ADMIN"),
  adminController.supprimerUtilisateur
);
routesAdmin.post(
  "/utilisateurs/:utilisateurId/bloquer",
  authentifier,
  exigerRole("ADMIN"),
  adminController.bloquerUtilisateur
);
routesAdmin.post(
  "/utilisateurs/:utilisateurId/debloquer",
  authentifier,
  exigerRole("ADMIN"),
  adminController.debloquerUtilisateur
);
routesAdmin.get("/villes", authentifier, exigerRole("ADMIN"), adminController.listerVilles);
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

// Broadcast notifications SYSTEME
routesAdmin.post("/notifications/broadcast", authentifier, exigerRole("ADMIN"), valider(schemaBroadcast), adminController.envoyerBroadcast);

// Exigence documentaire (KYC différé + délai de blocage)
routesAdmin.get("/exigence-documents", authentifier, exigerRole("ADMIN"), adminController.obtenirExigenceDocuments);
routesAdmin.put("/exigence-documents", authentifier, exigerRole("ADMIN"), adminController.enregistrerExigenceDocuments);
