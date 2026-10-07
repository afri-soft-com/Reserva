import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { asyncHandler, envoyerSucces, authentifier, exigerRole } from "@reserva/service-kit";
import { env } from "../config/env";
import * as transport from "./transport.service";

function authentifierServiceOuJwt(req: Request, res: Response, next: NextFunction): void {
  if (req.headers["x-service-secret"] === env.SERVICE_SECRET) {
    next();
    return;
  }
  authentifier(req, res, next);
}

function exigerSecretService(req: Request, res: Response, next: NextFunction): void {
  if (req.headers["x-service-secret"] !== env.SERVICE_SECRET) {
    res.status(401).json({
      succes: false,
      erreur: { code: "NON_AUTORISE", message: "Secret service requis" },
    });
    return;
  }
  next();
}

export const routesTransport = Router();

routesTransport.get("/sante", asyncHandler(async (_req, res) => {
  envoyerSucces(res, { service: "transport", statut: "operationnel" });
}));

routesTransport.get("/villes", asyncHandler(async (_req, res) => {
  envoyerSucces(res, await transport.listerVilles());
}));

routesTransport.get("/rechercher", asyncHandler(async (req, res) => {
  const q = req.query;
  await transport.validerRecherche(q.origine as string, q.destination as string, q.date as string);
  envoyerSucces(res, await transport.rechercherTrajets({
    origine: String(q.origine),
    destination: String(q.destination),
    date: String(q.date),
    places: q.places ? Number(q.places) : 1,
    tri: (q.tri as "prix" | "duree" | "depart") || "depart",
  }));
}));

routesTransport.get("/trajets", authentifier, exigerRole("ADMIN"), asyncHandler(async (req, res) => {
  envoyerSucces(res, await transport.listerTrajetsAdmin(req.query.date as string | undefined));
}));

routesTransport.get("/trajets/:id", asyncHandler(async (req, res) => {
  envoyerSucces(res, await transport.detailTrajet(req.params.id, req.query.places ? Number(req.query.places) : 1));
}));

const schemaPlaces = z.object({
  trajetId: z.string().uuid(),
  places: z.coerce.number().int().min(1).max(8),
});

routesTransport.post("/inventaire/reserver", authentifierServiceOuJwt, asyncHandler(async (req, res) => {
  const parsed = schemaPlaces.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ succes: false, erreur: { code: "VALIDATION_ECHEC", message: parsed.error.issues[0]?.message } });
    return;
  }
  envoyerSucces(res, await transport.reserverPlaces(parsed.data), 201);
}));

routesTransport.post("/inventaire/confirmer", exigerSecretService, asyncHandler(async (req, res) => {
  const parsed = schemaPlaces.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ succes: false, erreur: { code: "VALIDATION_ECHEC", message: parsed.error.issues[0]?.message } });
    return;
  }
  envoyerSucces(res, await transport.confirmerPlaces(parsed.data));
}));

routesTransport.post("/inventaire/liberer", exigerSecretService, asyncHandler(async (req, res) => {
  const parsed = z.object({
    trajetId: z.string().uuid(),
    places: z.coerce.number().int().min(1).max(8),
    etaitConfirme: z.boolean().optional(),
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ succes: false, erreur: { code: "VALIDATION_ECHEC", message: parsed.error.issues[0]?.message } });
    return;
  }
  envoyerSucces(res, await transport.libererPlaces(parsed.data));
}));
