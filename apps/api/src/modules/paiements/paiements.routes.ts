import { Router } from "express";
import * as paiementsController from "./paiements.controller";
import { valider } from "../../middlewares/valider";
import { authentifier, exigerRole } from "../../middlewares/auth";
import { schemaInitierPaiement } from "@reserva/shared";

export const routesPaiements = Router();

routesPaiements.post("/", authentifier, valider(schemaInitierPaiement), paiementsController.initier);
routesPaiements.get("/reservations/:reservationId/transactions", authentifier, paiementsController.transactions);
routesPaiements.get("/reservations/:reservationId/recu", authentifier, paiementsController.recu);
routesPaiements.get("/reservations/:reservationId/recu/html", authentifier, paiementsController.recuHtml);
routesPaiements.get("/rapport/csv", authentifier, exigerRole("PRESTATAIRE"), paiementsController.rapportCsv);
routesPaiements.get("/reservations/:reservationId/recu/pdf", authentifier, paiementsController.recuPdf);
