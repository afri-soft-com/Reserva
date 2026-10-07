import { Router } from "express";
import { authentifier, exigerRole } from "../../middlewares/auth";
import * as ctrl from "./innovations.controller";

export const routesInnovations = Router();

// Kit famille
routesInnovations.get("/beneficiaires", authentifier, exigerRole("CLIENT", "AGENT", "ADMIN"), ctrl.listerBeneficiaires);
routesInnovations.post("/beneficiaires", authentifier, exigerRole("CLIENT", "AGENT", "ADMIN"), ctrl.creerBeneficiaire);
routesInnovations.delete("/beneficiaires/:id", authentifier, exigerRole("CLIENT", "AGENT", "ADMIN"), ctrl.supprimerBeneficiaire);

// Garantie arrivée
routesInnovations.post("/garantie/reclamer", authentifier, exigerRole("CLIENT", "AGENT", "ADMIN"), ctrl.reclamerGarantie);

// Médiation
routesInnovations.post("/litiges", authentifier, ctrl.ouvrirLitige);
routesInnovations.get("/litiges", authentifier, ctrl.listerLitiges);
routesInnovations.post("/litiges/trancher", authentifier, exigerRole("ADMIN"), ctrl.trancheLitige);

// Agents
routesInnovations.get("/agents", authentifier, exigerRole("ADMIN"), ctrl.listerAgents);
routesInnovations.post("/agents/activer", authentifier, exigerRole("ADMIN"), ctrl.activerAgent);
routesInnovations.patch("/agents/:id/commission", authentifier, exigerRole("ADMIN"), ctrl.modifierCommissionAgent);
routesInnovations.post("/agents/:id/desactiver", authentifier, exigerRole("ADMIN"), ctrl.desactiverAgent);
routesInnovations.get("/agents/moi", authentifier, exigerRole("AGENT", "ADMIN"), ctrl.statsAgent);

// Canal SMS/USSD (simulation — webhook public)
routesInnovations.post("/canal-sms", ctrl.canalSms);

// Mode Pro terrain
routesInnovations.get("/terrain/file", authentifier, exigerRole("PRESTATAIRE"), ctrl.fileTerrain);
routesInnovations.post("/terrain/appeler-prochain", authentifier, exigerRole("PRESTATAIRE"), ctrl.appelerProchain);

// Admin : recalcul scores confiance
routesInnovations.post("/confiance/recalculer", authentifier, exigerRole("ADMIN"), ctrl.recalculerConfiance);
