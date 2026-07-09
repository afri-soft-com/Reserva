import { Router } from "express";
import * as reservationsController from "./reservations.controller";
import { valider } from "../../middlewares/valider";
import { authentifier, exigerRole } from "../../middlewares/auth";
import { schemaCreerReservation, schemaAnnulerReservation, schemaModifierReservation } from "@reserva/shared";

export const routesReservations = Router();

routesReservations.post("/", authentifier, valider(schemaCreerReservation), reservationsController.creer);
routesReservations.post("/modifier", authentifier, valider(schemaModifierReservation), reservationsController.modifier);
routesReservations.post("/annuler", authentifier, valider(schemaAnnulerReservation), reservationsController.annuler);
routesReservations.get("/moi", authentifier, reservationsController.mesReservations);
routesReservations.get("/:reservationId", authentifier, reservationsController.detail);

// Routes prestataire
routesReservations.get("/recues/liste", authentifier, exigerRole("PRESTATAIRE"), reservationsController.reservationsRecues);
routesReservations.post("/:reservationId/repondre", authentifier, exigerRole("PRESTATAIRE"), reservationsController.repondre);
routesReservations.post("/:reservationId/cloturer", authentifier, exigerRole("PRESTATAIRE"), reservationsController.cloturer);
