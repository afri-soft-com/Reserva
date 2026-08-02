import { Request, Response } from "express";
import * as avoirsService from "./avoirs.service";
import { envoyerSucces } from "../../utils/reponse";
import { asyncHandler } from "../../middlewares/erreurs";
import { ErreurNonAutorise } from "../../utils/erreurs";

export const mesAvoirs = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await avoirsService.listerMesAvoirs(req.utilisateur.utilisateurId);
  envoyerSucces(res, resultat);
});

export const appliquer = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await avoirsService.appliquerAvoir(
    req.utilisateur.utilisateurId,
    req.body.reservationId,
    req.body.montant
  );
  envoyerSucces(res, resultat);
});
