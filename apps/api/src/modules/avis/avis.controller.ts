import { Request, Response } from "express";
import * as avisService from "./avis.service";
import { envoyerSucces } from "../../utils/reponse";
import { asyncHandler } from "../../middlewares/erreurs";
import { ErreurNonAutorise } from "../../utils/erreurs";

export const creer = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await avisService.creerAvis(req.utilisateur.utilisateurId, req.body);
  envoyerSucces(res, resultat, 201);
});

export const repondre = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await avisService.repondreAvis(req.utilisateur.utilisateurId, req.body);
  envoyerSucces(res, resultat);
});

export const mesAvis = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await avisService.listerMesAvis(req.utilisateur.utilisateurId);
  envoyerSucces(res, resultat);
});

export const avisRecus = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await avisService.listerAvisRecus(req.utilisateur.utilisateurId);
  envoyerSucces(res, resultat);
});
