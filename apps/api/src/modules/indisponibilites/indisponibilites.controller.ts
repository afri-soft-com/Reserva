import { Request, Response } from "express";
import * as indisponibilitesService from "./indisponibilites.service";
import { envoyerSucces } from "../../utils/reponse";
import { asyncHandler } from "../../middlewares/erreurs";
import { ErreurNonAutorise } from "../../utils/erreurs";

export const creer = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await indisponibilitesService.creerPeriodeIndisponible(req.utilisateur.utilisateurId, req.body);
  envoyerSucces(res, resultat, 201);
});

export const lister = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await indisponibilitesService.listerMesPeriodesIndisponibles(
    req.utilisateur.utilisateurId,
    req.query.serviceId as string | undefined
  );
  envoyerSucces(res, resultat);
});

export const supprimer = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await indisponibilitesService.supprimerPeriodeIndisponible(
    req.utilisateur.utilisateurId,
    req.params.periodeId
  );
  envoyerSucces(res, resultat);
});
