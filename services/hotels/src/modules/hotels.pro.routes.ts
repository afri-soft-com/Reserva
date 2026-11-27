import { Router, Request, Response, NextFunction } from "express";
import { z, ZodType } from "zod";
import { asyncHandler, envoyerSucces, authentifier, exigerRole, ErreurValidation } from "@reserva/service-kit";
import * as pro from "./hotels.pro.service";

/** Espace prestataire hôtelier — monté sur /api/hotels/pro */
export const routesHotelsPro = Router();

routesHotelsPro.use(authentifier, exigerRole("PRESTATAIRE", "ADMIN"));

function valider(schema: ZodType, source: "body" | "query" = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const r = schema.safeParse(req[source]);
    if (!r.success) {
      const issue = r.error.issues[0];
      const champ = issue.path.join(".");
      throw new ErreurValidation(champ ? `${champ} : ${issue.message}` : issue.message);
    }
    if (source === "body") req.body = r.data;
    else (req as Request & { donnees?: unknown }).donnees = r.data;
    next();
  };
}

function proprietaire(req: Request): pro.Proprietaire {
  return { utilisateurId: req.utilisateur!.utilisateurId, role: req.utilisateur!.role };
}

const jour = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format AAAA-MM-JJ attendu");
const heure = z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM attendu");

const schemaHotel = z.object({
  nom: z.string().trim().min(2).max(120).optional(),
  ville: z.string().trim().min(2).max(80).optional(),
  quartier: z.string().trim().min(2).max(80).optional(),
  adresse: z.string().trim().max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  telephone: z.string().trim().max(30).optional(),
  etoiles: z.coerce.number().int().min(1).max(5).optional(),
  actif: z.boolean().optional(),
  politiqueAnnul: z.string().trim().max(500).optional(),
  checkInHeure: heure.optional(),
  checkOutHeure: heure.optional(),
  commodites: z.array(z.string()).max(30).optional(),
  photos: z.array(z.string()).max(30).optional(),
});

const champsChambre = {
  nom: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  capaciteAdultes: z.coerce.number().int().min(1).max(10),
  capaciteEnfants: z.coerce.number().int().min(0).max(10),
  superficieM2: z.coerce.number().int().min(1).max(2000).nullable().optional(),
  lits: z.string().trim().max(120),
  commodites: z.array(z.string()).max(30),
  photos: z.array(z.string()).max(30),
  actif: z.boolean(),
};
const schemaCreerChambre = z.object(champsChambre).partial().required({ nom: true });
const schemaModifierChambre = z.object(champsChambre).partial();

const champsTarif = {
  nom: z.string().trim().min(2).max(80),
  prixParNuit: z.coerce.number().positive(),
  devise: z.enum(["USD", "CDF"]),
  petitDejeuner: z.boolean(),
  remboursable: z.boolean(),
  delaiAnnulHeures: z.coerce.number().int().min(0).max(720),
  actif: z.boolean(),
};
const schemaCreerTarif = z.object(champsTarif).partial().required({ nom: true, prixParNuit: true });
const schemaModifierTarif = z.object(champsTarif).partial();

const schemaLireInventaire = z.object({ du: jour, au: jour });
const schemaInventaire = z
  .object({
    du: jour,
    au: jour,
    total: z.coerce.number().int().min(0).max(1000).optional(),
    prix: z.coerce.number().min(0).optional(),
    joursSemaine: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  })
  .refine((d) => d.total != null || d.prix != null, { message: "Indiquez total et/ou prix" });

routesHotelsPro.get("/hotels", asyncHandler(async (req, res) => {
  envoyerSucces(res, await pro.listerMesHotels(proprietaire(req)));
}));

routesHotelsPro.patch("/hotels/:hotelId", valider(schemaHotel), asyncHandler(async (req, res) => {
  envoyerSucces(res, await pro.modifierMonHotel(proprietaire(req), req.params.hotelId, req.body));
}));

routesHotelsPro.post("/hotels/:hotelId/chambres", valider(schemaCreerChambre), asyncHandler(async (req, res) => {
  envoyerSucces(res, await pro.creerChambre(proprietaire(req), req.params.hotelId, req.body), 201);
}));

routesHotelsPro.patch("/chambres/:chambreId", valider(schemaModifierChambre), asyncHandler(async (req, res) => {
  envoyerSucces(res, await pro.modifierChambre(proprietaire(req), req.params.chambreId, req.body));
}));

routesHotelsPro.post("/chambres/:chambreId/tarifs", valider(schemaCreerTarif), asyncHandler(async (req, res) => {
  envoyerSucces(res, await pro.creerTarif(proprietaire(req), req.params.chambreId, req.body), 201);
}));

routesHotelsPro.patch("/tarifs/:tarifId", valider(schemaModifierTarif), asyncHandler(async (req, res) => {
  envoyerSucces(res, await pro.modifierTarif(proprietaire(req), req.params.tarifId, req.body));
}));

routesHotelsPro.get(
  "/chambres/:chambreId/inventaire",
  valider(schemaLireInventaire, "query"),
  asyncHandler(async (req, res) => {
    const { du, au } = (req as Request & { donnees: { du: string; au: string } }).donnees;
    envoyerSucces(res, await pro.lireInventaire(proprietaire(req), req.params.chambreId, du, au));
  })
);

routesHotelsPro.put("/chambres/:chambreId/inventaire", valider(schemaInventaire), asyncHandler(async (req, res) => {
  envoyerSucces(res, await pro.definirInventaire(proprietaire(req), req.params.chambreId, req.body));
}));
