import { Request, Response } from "express";
import * as codesPromosService from "./codes-promos.service";
import { envoyerSucces } from "../../utils/reponse";
import { asyncHandler } from "../../middlewares/erreurs";
import { ErreurNonAutorise } from "../../utils/erreurs";

export const lister = asyncHandler(async (_req: Request, res: Response) => {
  const resultat = await codesPromosService.listerCodesPromos();
  envoyerSucces(res, resultat);
});

export const obtenir = asyncHandler(async (req: Request, res: Response) => {
  const resultat = await codesPromosService.obtenirCodePromo(req.params.id);
  envoyerSucces(res, resultat);
});

export const creer = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await codesPromosService.creerCodePromo({
    ...req.body,
    creeParId: req.utilisateur.utilisateurId,
  });
  envoyerSucces(res, resultat, 201);
});

export const modifier = asyncHandler(async (req: Request, res: Response) => {
  const resultat = await codesPromosService.modifierCodePromo(req.params.id, req.body);
  envoyerSucces(res, resultat);
});

export const supprimer = asyncHandler(async (req: Request, res: Response) => {
  const resultat = await codesPromosService.supprimerCodePromo(req.params.id);
  envoyerSucces(res, resultat);
});

export const valider = asyncHandler(async (req: Request, res: Response) => {
  const { code, montant } = req.body;
  const resultat = await codesPromosService.validerCodePromo(code, montant);
  envoyerSucces(res, resultat);
});

export const appliquer = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const { code, reservationId } = req.body;
  const resultat = await codesPromosService.appliquerCodePromo(reservationId, code, req.utilisateur.utilisateurId);
  envoyerSucces(res, resultat);
});

export const utilisables = asyncHandler(async (_req: Request, res: Response) => {
  const resultat = await codesPromosService.listerCodesUtilisables();
  envoyerSucces(res, resultat);
});
