import { Request, Response } from "express";
import * as fideliteService from "./fidelite.service";
import { envoyerSucces } from "../../utils/reponse";
import { asyncHandler } from "../../middlewares/erreurs";
import { ErreurNonAutorise } from "../../utils/erreurs";

export const solde = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await fideliteService.obtenirSoldePoints(req.utilisateur.utilisateurId);
  envoyerSucces(res, resultat);
});

export const historique = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const page = parseInt(req.query.page as string) || 1;
  const parPage = parseInt(req.query.parPage as string) || 20;
  const resultat = await fideliteService.listerTransactionsPoints(req.utilisateur.utilisateurId, page, parPage);
  envoyerSucces(res, resultat);
});

export const estimer = asyncHandler(async (req: Request, res: Response) => {
  const points = parseInt(req.query.points as string) || 0;
  const resultat = await fideliteService.estimerReduction(points);
  envoyerSucces(res, resultat);
});
