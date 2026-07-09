import { Router } from "express";
import { z } from "zod";
import * as servicesController from "./services.controller";
import { valider } from "../../middlewares/valider";
import { authentifier, exigerRole } from "../../middlewares/auth";
import { schemaRechercheServices, schemaCreerCreneau } from "@reserva/shared";

export const routesServices = Router();

// Recherche publique (US-003, US-004, US-005 du cahier des charges)
routesServices.get("/", valider(schemaRechercheServices, "query"), servicesController.rechercher);
routesServices.get("/:serviceId", servicesController.detail);
routesServices.get("/prestataires/:prestataireId/avis", servicesController.avisPrestataire);

// Recommandations personnalisées (authentifié requis)
routesServices.get("/recommander/recommandations", authentifier, servicesController.recommandations);

// Gestion des créneaux par le prestataire (US-008 du cahier des charges)
routesServices.post(
  "/creneaux",
  authentifier,
  exigerRole("PRESTATAIRE"),
  valider(schemaCreerCreneau),
  servicesController.creerCreneau
);

const schemaCreneauxRecurrents = z.object({
  serviceId: z.string().uuid(),
  dateDebut: z.string(),
  dateFin: z.string(),
  heuresCreneaux: z.array(z.string().regex(/^\d{2}:\d{2}$/)).min(1),
  dureeMinutes: z.coerce.number().int().min(5).max(1440),
  capaciteParCreneau: z.coerce.number().int().min(1),
  joursExclus: z.array(z.number().int().min(0).max(6)).optional(),
});

routesServices.post(
  "/creneaux/recurrents",
  authentifier,
  exigerRole("PRESTATAIRE"),
  valider(schemaCreneauxRecurrents),
  servicesController.creerCreneauxRecurrents
);

routesServices.delete(
  "/creneaux/:creneauId",
  authentifier,
  exigerRole("PRESTATAIRE"),
  servicesController.supprimerCreneau
);

routesServices.get(
  "/:serviceId/creneaux/gestion",
  authentifier,
  exigerRole("PRESTATAIRE"),
  servicesController.creneauxService
);
