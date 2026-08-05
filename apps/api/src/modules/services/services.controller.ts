import { Request, Response } from "express";
import * as servicesService from "./services.service";
import { envoyerSucces } from "../../utils/reponse";
import { asyncHandler } from "../../middlewares/erreurs";
import { ErreurNonAutorise } from "../../utils/erreurs";

export const rechercher = asyncHandler(async (req: Request, res: Response) => {
  const resultat = await servicesService.rechercherServices(req.query as any);
  envoyerSucces(res, resultat);
});

export const detail = asyncHandler(async (req: Request, res: Response) => {
  const resultat = await servicesService.obtenirDetailService(req.params.serviceId);
  envoyerSucces(res, resultat);
});

export const avisPrestataire = asyncHandler(async (req: Request, res: Response) => {
  const resultat = await servicesService.listerAvisPrestataire(req.params.prestataireId);
  envoyerSucces(res, resultat);
});

export const creerCreneau = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await servicesService.creerCreneau(req.utilisateur.utilisateurId, req.body);
  envoyerSucces(res, resultat, 201);
});

export const creerCreneauxRecurrents = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await servicesService.creerCreneauxRecurrents(req.utilisateur.utilisateurId, req.body);
  envoyerSucces(res, resultat, 201);
});

export const supprimerCreneau = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await servicesService.supprimerCreneau(req.utilisateur.utilisateurId, req.params.creneauId);
  envoyerSucces(res, resultat);
});

export const recommandations = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const limite = Math.min(parseInt(req.query.limite as string) || 10, 20);
  const resultat = await servicesService.recommanderServices(req.utilisateur.utilisateurId, limite);
  envoyerSucces(res, resultat);
});

export const creneauxService = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await servicesService.listerCreneauxService(req.utilisateur.utilisateurId, req.params.serviceId);
  envoyerSucces(res, resultat);
});
