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

export const routesHotels = Router();

const schemaRecherche = z.object({
  ville: z.string().optional(),
  arrivee: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  depart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  adultes: z.coerce.number().int().min(1).max(8).optional(),
  enfants: z.coerce.number().int().min(0).max(6).optional(),
  etoilesMin: z.coerce.number().int().min(1).max(5).optional(),
  prixMax: z.coerce.number().positive().optional(),
  noteMin: z.coerce.number().min(0).max(5).optional(),
  commodite: z.string().optional(),
  annulationGratuite: z.enum(["1", "true", "0", "false"]).optional(),
  petitDejeuner: z.enum(["1", "true", "0", "false"]).optional(),
  tri: z.enum(["prix", "note", "etoiles", "popularite"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  parPage: z.coerce.number().int().min(1).max(50).optional(),
});

routesHotels.get("/sante", asyncHandler(async (_req, res) => {
  envoyerSucces(res, { service: "hotels", statut: "operationnel" });
}));

routesHotels.get("/villes", asyncHandler(async (_req, res) => {
  envoyerSucces(res, await hotels.listerVilles());
}));

routesHotels.get("/", asyncHandler(async (req, res) => {
  const parsed = schemaRecherche.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      succes: false,
      erreur: { code: "VALIDATION_ECHEC", message: parsed.error.issues[0]?.message },
    });
    return;
  }
  const q = parsed.data;
  envoyerSucces(res, await hotels.rechercherHotels({
    ville: q.ville,
    arrivee: q.arrivee,
    depart: q.depart,
    adultes: q.adultes,
    enfants: q.enfants,
    etoilesMin: q.etoilesMin,
    prixMax: q.prixMax,
    noteMin: q.noteMin,
    commodite: q.commodite,
    annulationGratuite: q.annulationGratuite === "1" || q.annulationGratuite === "true",
    petitDejeuner: q.petitDejeuner === "1" || q.petitDejeuner === "true",
    tri: q.tri || "note",
    page: q.page ?? 1,
    parPage: q.parPage ?? 20,
  }));
}));

routesHotels.get("/:hotelId/avis", asyncHandler(async (req, res) => {
  const page = req.query.page ? Number(req.query.page) : 1;
  const parPage = req.query.parPage ? Number(req.query.parPage) : 20;
  envoyerSucces(res, await hotels.listerAvisHotel(req.params.hotelId, page, parPage));
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

const schemaInventaireMutation = z.object({
  typeChambreId: z.string().uuid(),
  arrivee: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  depart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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

routesHotels.post("/inventaire/confirmer", exigerSecretService, asyncHandler(async (req, res) => {
  const parsed = schemaInventaireMutation.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ succes: false, erreur: { code: "VALIDATION_ECHEC", message: parsed.error.issues[0]?.message } });
    return;
  }
  envoyerSucces(res, await hotels.confirmerReservationInventaire(parsed.data));
}));

routesHotels.post("/inventaire/liberer", exigerSecretService, asyncHandler(async (req, res) => {
  const parsed = z.object({
    typeChambreId: z.string().uuid(),
    arrivee: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    depart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    quantite: z.coerce.number().int().min(1).max(5).optional(),
    etaitConfirme: z.boolean().optional(),
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ succes: false, erreur: { code: "VALIDATION_ECHEC", message: parsed.error.issues[0]?.message } });
    return;
  }
  envoyerSucces(res, await hotels.libererReservationInventaire(parsed.data));
}));

routesHotels.post("/", authentifier, exigerRole("ADMIN", "PRESTATAIRE"), asyncHandler(async (req, res) => {
  const { prisma } = await import("../config/prisma");
  let prestataireId = req.body.prestataireId as string | undefined;
  if (req.utilisateur?.role === "PRESTATAIRE") {
    // Le profil prestataire vit dans core ; on stocke l'utilisateurId comme propriétaire marketplace
    // jusqu'à synchro cross-service. Préférer body.prestataireId si fourni par l'admin.
    prestataireId = req.body.prestataireId || req.utilisateur.utilisateurId;
  }
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
      prestataireId,
    },
  });
  envoyerSucces(res, hotel, 201);
}));
