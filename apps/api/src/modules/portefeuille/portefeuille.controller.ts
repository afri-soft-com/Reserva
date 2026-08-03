import { Request, Response } from "express";
import * as portefeuilleService from "./portefeuille.service";
import { envoyerSucces } from "../../utils/reponse";
import { asyncHandler } from "../../middlewares/erreurs";
import { ErreurNonAutorise } from "../../utils/erreurs";

export const monPortefeuille = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await portefeuilleService.obtenirPortefeuille(req.utilisateur.utilisateurId);
  envoyerSucces(res, resultat);
});
