import { Request, Response } from "express";
import * as favorisService from "./favoris.service";
import { envoyerSucces } from "../../utils/reponse";
import { asyncHandler } from "../../middlewares/erreurs";
import { ErreurNonAutorise } from "../../utils/erreurs";

export const listerFavoris = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const page = parseInt(req.query.page as string) || 1;
  const parPage = parseInt(req.query.parPage as string) || 20;
  const resultat = await favorisService.listerFavoris(req.utilisateur.utilisateurId, page, parPage);
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
