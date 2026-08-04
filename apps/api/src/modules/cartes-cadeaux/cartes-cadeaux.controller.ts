import { Request, Response } from "express";
import * as cartesCadeauxService from "./cartes-cadeaux.service";
import { envoyerSucces } from "../../utils/reponse";
import { asyncHandler } from "../../middlewares/erreurs";
import { ErreurNonAutorise } from "../../utils/erreurs";

export const acheter = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await cartesCadeauxService.acheterCarteCadeau(req.utilisateur.utilisateurId, req.body);
  envoyerSucces(res, resultat, 201);
});

export const mesCartes = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await cartesCadeauxService.listerMesCartesCadeaux(req.utilisateur.utilisateurId);
  envoyerSucces(res, resultat);
});

export const detailParCode = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await cartesCadeauxService.obtenirCarteParCode(req.params.code, req.utilisateur.utilisateurId);
  envoyerSucces(res, resultat);
});

export const utiliser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await cartesCadeauxService.utiliserCarteCadeau(req.utilisateur.utilisateurId, req.body);
  envoyerSucces(res, resultat);
});

export const transferer = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await cartesCadeauxService.transfererCarteCadeau(req.utilisateur.utilisateurId, req.params.carteId, req.body);
  envoyerSucces(res, resultat);
});
