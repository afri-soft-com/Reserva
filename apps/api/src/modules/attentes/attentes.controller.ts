import { Request, Response } from "express";
import * as attentesService from "./attentes.service";
import { envoyerSucces } from "../../utils/reponse";
import { asyncHandler } from "../../middlewares/erreurs";
import { ErreurNonAutorise } from "../../utils/erreurs";

export const inscrire = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await attentesService.inscrireEnAttente(
    req.utilisateur.utilisateurId,
    req.body.serviceId,
    req.body.creneauId
  );
  envoyerSucces(res, resultat);
});

export const mesAttentes = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await attentesService.listerMesAttentes(req.utilisateur.utilisateurId);
  envoyerSucces(res, resultat);
});

export const quitter = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await attentesService.quitterAttente(req.utilisateur.utilisateurId, req.params.entreeId);
  envoyerSucces(res, resultat);
});

export const attenteCreneau = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await attentesService.listerAttenteCreneau(req.utilisateur.utilisateurId, req.params.creneauId);
  envoyerSucces(res, resultat);
});
