import { Request, Response } from "express";
import * as alertesService from "./alertes.service";
import { envoyerSucces } from "../../utils/reponse";
import { asyncHandler } from "../../middlewares/erreurs";
import { ErreurNonAutorise } from "../../utils/erreurs";

export const creer = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await alertesService.creerAlerte(req.utilisateur.utilisateurId, req.body.serviceId);
  envoyerSucces(res, resultat);
});

export const mesAlertes = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await alertesService.listerMesAlertes(req.utilisateur.utilisateurId);
  envoyerSucces(res, resultat);
});

export const desactiver = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await alertesService.desactiverAlerte(req.utilisateur.utilisateurId, req.params.alerteId);
  envoyerSucces(res, resultat);
});
