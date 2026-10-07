import { Router } from "express";
import { z } from "zod";
import * as reservationsController from "./reservations.controller";
import { valider } from "../../middlewares/valider";
import { authentifier, exigerRole } from "../../middlewares/auth";
import { schemaCreerReservation, schemaAnnulerReservation, schemaModifierReservation } from "@reserva/shared";

export const routesReservations = Router();

// Réservation récurrente (série) — créée en une seule opération
const schemaReservationRecurrente = z.object({
  serviceId: z.string().uuid("Identifiant de service invalide"),
  creneauId: z.string().uuid("Identifiant de créneau invalide"),
  nombreOccurrences: z.coerce.number().int().min(2).max(12).default(4),
  notes: z.string().trim().max(500).optional(),
});

const schemaReproduireReservation = z.object({
  reservationId: z.string().uuid("Identifiant de réservation invalide"),
});

routesReservations.post("/recurrentes", authentifier, exigerRole("CLIENT", "AGENT", "ADMIN"), valider(schemaReservationRecurrente), reservationsController.creerRecurrentes);
routesReservations.post("/", authentifier, exigerRole("CLIENT", "AGENT", "ADMIN"), valider(schemaCreerReservation), reservationsController.creer);
routesReservations.post("/modifier", authentifier, valider(schemaModifierReservation), reservationsController.modifier);
routesReservations.post("/annuler", authentifier, valider(schemaAnnulerReservation), reservationsController.annuler);
routesReservations.post("/reproduire", authentifier, exigerRole("CLIENT", "AGENT", "ADMIN"), valider(schemaReproduireReservation), reservationsController.reproduire);
routesReservations.get("/moi", authentifier, reservationsController.mesReservations);
routesReservations.get("/:reservationId", authentifier, reservationsController.detail);

// Routes prestataire
routesReservations.get("/recues/liste", authentifier, exigerRole("PRESTATAIRE"), reservationsController.reservationsRecues);
routesReservations.post("/:reservationId/repondre", authentifier, exigerRole("PRESTATAIRE"), reservationsController.repondre);
routesReservations.post("/:reservationId/entamer", authentifier, exigerRole("PRESTATAIRE"), reservationsController.entamer);
routesReservations.post("/:reservationId/cloturer", authentifier, exigerRole("PRESTATAIRE"), reservationsController.cloturer);

// Scan QR (prestataire authentifié) — lookup par numéro de réservation
routesReservations.get("/par-numero/:numero", authentifier, exigerRole("PRESTATAIRE"), reservationsController.parNumero);
