import { Request, Response } from "express";
import * as prestatairesService from "./prestataires.service";
import { envoyerSucces } from "../../utils/reponse";
import { asyncHandler } from "../../middlewares/erreurs";
import { ErreurNonAutorise } from "../../utils/erreurs";

export const creerProfil = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await prestatairesService.creerProfilPrestataire(req.utilisateur.utilisateurId, req.body);
  envoyerSucces(res, resultat, 201);
});

export const monProfil = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await prestatairesService.obtenirMonProfilPrestataire(req.utilisateur.utilisateurId);
  envoyerSucces(res, resultat);
});

export const modifierProfil = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await prestatairesService.modifierProfilPrestataire(req.utilisateur.utilisateurId, req.body);
  envoyerSucces(res, resultat);
});

export const listerEnAttente = asyncHandler(async (_req: Request, res: Response) => {
  const resultat = await prestatairesService.listerPrestatairesEnAttente();
  envoyerSucces(res, resultat);
});

export const valider = asyncHandler(async (req: Request, res: Response) => {
  const resultat = await prestatairesService.validerPrestataire(req.body);
  envoyerSucces(res, resultat);
});

export const creerService = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await prestatairesService.creerServiceOffert(req.utilisateur.utilisateurId, req.body);
  envoyerSucces(res, resultat, 201);
});

export const modifierService = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await prestatairesService.modifierServiceOffert(req.utilisateur.utilisateurId, req.params.serviceId, req.body);
  envoyerSucces(res, resultat);
});

export const mesServices = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await prestatairesService.listerMesServices(req.utilisateur.utilisateurId);
  envoyerSucces(res, resultat);
});

export const tableauDeBord = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await prestatairesService.obtenirTableauDeBord(req.utilisateur.utilisateurId);
  envoyerSucces(res, resultat);
});

export const calendrier = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await prestatairesService.obtenirCalendrier(
    req.utilisateur.utilisateurId,
    req.query.mois as string | undefined
  );
  envoyerSucces(res, resultat);
});

export const listerProches = asyncHandler(async (req: Request, res: Response) => {
  const { latitude, longitude, rayonKm, categorie, ville } = req.query;
  if (!latitude || !longitude) {
    res.status(400).json({ succes: false, erreur: { message: "Paramètres latitude et longitude requis" } });
    return;
  }
  const resultat = await prestatairesService.listerPrestatairesProches({
    latitude: Number(latitude),
    longitude: Number(longitude),
    rayonKm: rayonKm ? Number(rayonKm) : undefined,
    categorie: categorie as string | undefined,
    ville: ville as string | undefined,
  });
  envoyerSucces(res, resultat);
});

export const monAbonnement = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await prestatairesService.obtenirMonAbonnement(req.utilisateur.utilisateurId);
  envoyerSucces(res, resultat);
});

export const statistiques = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await prestatairesService.obtenirStatistiquesDetaillees(req.utilisateur.utilisateurId);
  envoyerSucces(res, resultat);
});
