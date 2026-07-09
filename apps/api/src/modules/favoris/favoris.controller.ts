import { Request, Response } from "express";
import * as favorisService from "./favoris.service";
import { envoyerSucces } from "../../utils/reponse";
import { asyncHandler } from "../../middlewares/erreurs";
import { ErreurNonAutorise } from "../../utils/erreurs";

export const listerFavoris = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await favorisService.listerFavoris(req.utilisateur.utilisateurId);
  envoyerSucces(res, resultat);
});

export const ajouterFavori = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await favorisService.ajouterFavori(req.utilisateur.utilisateurId, req.params.serviceId);
  envoyerSucces(res, resultat, 201);
});

export const supprimerFavori = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await favorisService.supprimerFavori(req.utilisateur.utilisateurId, req.params.serviceId);
  envoyerSucces(res, resultat);
});
