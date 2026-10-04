import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { asyncHandler, envoyerSucces, authentifier, exigerRole } from "@reserva/service-kit";
import { env } from "../config/env";
import * as hotels from "./hotels.service";

function authentifierServiceOuJwt(req: Request, res: Response, next: NextFunction): void {
  if (req.headers["x-service-secret"] === env.SERVICE_SECRET) {
    next();
    return;
  }
  authentifier(req, res, next);
}

export const routesHotels = Router();

routesHotels.get("/sante", asyncHandler(async (_req, res) => {
  envoyerSucces(res, { service: "hotels", statut: "operationnel" });
}));

routesHotels.get("/villes", asyncHandler(async (_req, res) => {
  envoyerSucces(res, await hotels.listerVilles());
}));

routesHotels.get("/", asyncHandler(async (req, res) => {
  const q = req.query;
  envoyerSucces(res, await hotels.rechercherHotels({
    ville: q.ville as string | undefined,
    arrivee: q.arrivee as string | undefined,
    depart: q.depart as string | undefined,
    adultes: q.adultes ? Number(q.adultes) : undefined,
    enfants: q.enfants ? Number(q.enfants) : undefined,
    etoilesMin: q.etoilesMin ? Number(q.etoilesMin) : undefined,
    prixMax: q.prixMax ? Number(q.prixMax) : undefined,
    noteMin: q.noteMin ? Number(q.noteMin) : undefined,
    commodite: q.commodite as string | undefined,
    annulationGratuite: q.annulationGratuite === "1" || q.annulationGratuite === "true",
    petitDejeuner: q.petitDejeuner === "1" || q.petitDejeuner === "true",
    tri: (q.tri as "prix" | "note" | "etoiles") || "note",
    page: q.page ? Number(q.page) : 1,
    parPage: q.parPage ? Number(q.parPage) : 20,
  }));
}));

routesHotels.get("/:hotelId", asyncHandler(async (req, res) => {
  envoyerSucces(res, await hotels.detailHotel(
    req.params.hotelId,
    req.query.arrivee as string | undefined,
    req.query.depart as string | undefined,
    req.query.adultes ? Number(req.query.adultes) : 2,
    req.query.enfants ? Number(req.query.enfants) : 0
  ));
}));

routesHotels.post("/:hotelId/avis", authentifier, asyncHandler(async (req, res) => {
  envoyerSucces(res, await hotels.creerAvis({
    hotelId: req.params.hotelId,
    auteurNom: req.body.auteurNom || req.utilisateur?.telephone || "Client",
    note: Number(req.body.note),
    noteProprete: req.body.noteProprete != null ? Number(req.body.noteProprete) : undefined,
    noteEmplacement: req.body.noteEmplacement != null ? Number(req.body.noteEmplacement) : undefined,
    commentaire: req.body.commentaire,
    clientId: req.utilisateur?.utilisateurId,
    sejourId: req.body.sejourId,
  }), 201);
}));

const schemaHold = z.object({
  hotelId: z.string().uuid(),
  typeChambreId: z.string().uuid(),
  planTarifId: z.string().uuid(),
  arrivee: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  depart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adultes: z.coerce.number().int().min(1).max(8),
  enfants: z.coerce.number().int().min(0).max(6),
  quantite: z.coerce.number().int().min(1).max(5).optional(),
});

routesHotels.post("/inventaire/reserver", authentifierServiceOuJwt, asyncHandler(async (req, res) => {
  const parsed = schemaHold.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ succes: false, erreur: { code: "VALIDATION_ECHEC", message: parsed.error.issues[0]?.message } });
    return;
  }
  envoyerSucces(res, await hotels.verifierEtReserver(parsed.data), 201);
}));

routesHotels.post("/inventaire/confirmer", authentifierServiceOuJwt, asyncHandler(async (req, res) => {
  envoyerSucces(res, await hotels.confirmerReservationInventaire(req.body));
}));

routesHotels.post("/inventaire/liberer", authentifierServiceOuJwt, asyncHandler(async (req, res) => {
  envoyerSucces(res, await hotels.libererReservationInventaire(req.body));
}));

routesHotels.post("/", authentifier, exigerRole("ADMIN", "PRESTATAIRE"), asyncHandler(async (req, res) => {
  const { prisma } = await import("../config/prisma");
  const hotel = await prisma.hotel.create({
    data: {
      nom: req.body.nom,
      description: req.body.description,
      ville: req.body.ville,
      quartier: req.body.quartier,
      adresse: req.body.adresse,
      etoiles: req.body.etoiles ?? 3,
      commodites: JSON.stringify(req.body.commodites ?? []),
      photos: JSON.stringify(req.body.photos ?? []),
      prestataireId: req.utilisateur?.utilisateurId,
    },
  });
  envoyerSucces(res, hotel, 201);
}));
