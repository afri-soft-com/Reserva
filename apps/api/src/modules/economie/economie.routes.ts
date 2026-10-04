import { Router } from "express";
import { z } from "zod";
import * as economieController from "./economie.controller";
import { authentifier, exigerRole } from "../../middlewares/auth";
import { valider } from "../../middlewares/valider";

const schemaSouscrire = z.object({
  planId: z.string().uuid(),
  operateur: z.enum(["MPESA", "AIRTEL_MONEY", "ORANGE_MONEY", "ESPECES"]).optional(),
  telephonePaiement: z.string().trim().optional(),
});

const schemaVersement = z.object({
  montant: z.coerce.number().positive(),
  devise: z.enum(["CDF", "USD"]).default("CDF"),
  operateur: z.enum(["MPESA", "AIRTEL_MONEY", "ORANGE_MONEY"]),
  telephonePaiement: z.string().trim().min(9),
});

const schemaTraiterVersement = z.object({
  payer: z.boolean(),
  noteAdmin: z.string().trim().max(400).optional(),
});

export const routesEconomie = Router();

routesEconomie.get("/plans", economieController.plansPublics);
routesEconomie.get("/simulation", economieController.simulation);

routesEconomie.post(
  "/abonnement/souscrire",
  authentifier,
  exigerRole("PRESTATAIRE"),
  valider(schemaSouscrire),
  economieController.souscrire
);
routesEconomie.get("/moi/finances", authentifier, exigerRole("PRESTATAIRE"), economieController.mesFinances);
routesEconomie.get("/moi/versements", authentifier, exigerRole("PRESTATAIRE"), economieController.mesVersements);
routesEconomie.post(
  "/moi/versements",
  authentifier,
  exigerRole("PRESTATAIRE"),
  valider(schemaVersement),
  economieController.demanderVersement
);

routesEconomie.get("/admin/finances", authentifier, exigerRole("ADMIN"), economieController.financesAdmin);
routesEconomie.get("/admin/versements", authentifier, exigerRole("ADMIN"), economieController.listerVersementsAdmin);
routesEconomie.post(
  "/admin/versements/:id",
  authentifier,
  exigerRole("ADMIN"),
  valider(schemaTraiterVersement),
  economieController.traiterVersement
);
routesEconomie.get("/admin/ecritures", authentifier, exigerRole("ADMIN"), economieController.listerEcrituresAdmin);
routesEconomie.get("/admin/soldes", authentifier, exigerRole("ADMIN"), economieController.soldesPrestatairesAdmin);
routesEconomie.get("/admin/config", authentifier, exigerRole("ADMIN"), economieController.configTarifAdmin);
