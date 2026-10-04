import { Router } from "express";
import { z } from "zod";
import { asyncHandler, authentifier, envoyerSucces } from "@reserva/service-kit";
import { env } from "../config/env";
import * as booking from "./booking.service";

export const routesBooking = Router();

const schemaHold = z.object({
  hotelId: z.string().uuid(),
  typeChambreId: z.string().uuid(),
  planTarifId: z.string().uuid(),
  arrivee: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  depart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adultes: z.coerce.number().int().min(1).max(8),
  enfants: z.coerce.number().int().min(0).max(6),
  quantite: z.coerce.number().int().min(1).max(5).optional(),
  notes: z.string().max(500).optional(),
});

const schemaHoldBillet = z.object({
  trajetId: z.string().uuid(),
  places: z.coerce.number().int().min(1).max(8),
  notes: z.string().max(500).optional(),
});

const schemaPaiement = z.object({
  operateur: z.enum(["MPESA", "AIRTEL_MONEY", "ORANGE_MONEY", "ESPECES"]),
  telephonePaiement: z.string().optional(),
  montant: z.coerce.number().positive(),
});

routesBooking.get("/sante", asyncHandler(async (_req, res) => {
  envoyerSucces(res, { service: "booking", statut: "operationnel" });
}));

routesBooking.post("/hold", authentifier, asyncHandler(async (req, res) => {
  const parsed = schemaHold.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ succes: false, erreur: { code: "VALIDATION_ECHEC", message: parsed.error.issues[0]?.message } });
    return;
  }
  const token = req.headers.authorization?.slice(7) || "";
  envoyerSucces(res, await booking.creerHold(req.utilisateur!.utilisateurId, token, parsed.data), 201);
}));

routesBooking.get("/sejours", authentifier, asyncHandler(async (req, res) => {
  envoyerSucces(res, await booking.listerMesSejours(req.utilisateur!.utilisateurId));
}));

routesBooking.get("/sejours/:id", authentifier, asyncHandler(async (req, res) => {
  envoyerSucces(res, await booking.obtenirSejour(req.utilisateur!.utilisateurId, req.params.id));
}));

routesBooking.post("/sejours/:id/payer", authentifier, asyncHandler(async (req, res) => {
  const parsed = schemaPaiement.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ succes: false, erreur: { code: "VALIDATION_ECHEC", message: parsed.error.issues[0]?.message } });
    return;
  }
  const token = req.headers.authorization?.slice(7) || "";
  envoyerSucces(res, await booking.payerSejour(req.utilisateur!.utilisateurId, token, req.params.id, parsed.data));
}));

routesBooking.post("/sejours/:id/annuler", authentifier, asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.slice(7) || "";
  envoyerSucces(res, await booking.annulerSejour(req.utilisateur!.utilisateurId, token, req.params.id));
}));

routesBooking.post("/billets/hold", authentifier, asyncHandler(async (req, res) => {
  const parsed = schemaHoldBillet.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ succes: false, erreur: { code: "VALIDATION_ECHEC", message: parsed.error.issues[0]?.message } });
    return;
  }
  const token = req.headers.authorization?.slice(7) || "";
  envoyerSucces(res, await booking.creerHoldBillet(req.utilisateur!.utilisateurId, token, parsed.data), 201);
}));

routesBooking.get("/billets", authentifier, asyncHandler(async (req, res) => {
  envoyerSucces(res, await booking.listerMesBillets(req.utilisateur!.utilisateurId));
}));

routesBooking.get("/billets/:id", authentifier, asyncHandler(async (req, res) => {
  envoyerSucces(res, await booking.obtenirBillet(req.utilisateur!.utilisateurId, req.params.id));
}));

routesBooking.post("/billets/:id/payer", authentifier, asyncHandler(async (req, res) => {
  const parsed = schemaPaiement.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ succes: false, erreur: { code: "VALIDATION_ECHEC", message: parsed.error.issues[0]?.message } });
    return;
  }
  const token = req.headers.authorization?.slice(7) || "";
  envoyerSucces(res, await booking.payerBillet(req.utilisateur!.utilisateurId, token, req.params.id, parsed.data));
}));

routesBooking.post("/billets/:id/annuler", authentifier, asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.slice(7) || "";
  envoyerSucces(res, await booking.annulerBillet(req.utilisateur!.utilisateurId, token, req.params.id));
}));

routesBooking.post("/expire-holds", asyncHandler(async (req, res) => {
  const secret = req.headers["x-service-secret"] || req.headers["x-cron-secret"];
  if (secret !== env.SERVICE_SECRET) {
    res.status(401).json({ succes: false, erreur: { code: "NON_AUTORISE", message: "Secret service requis" } });
    return;
  }
  envoyerSucces(res, await booking.expirerHoldsExpires());
}));
