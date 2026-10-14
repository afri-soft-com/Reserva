import { Request, Response } from "express";
import * as categoriesService from "./categories.service";
import { envoyerSucces } from "../../utils/reponse";
import { asyncHandler } from "../../middlewares/erreurs";

export const lister = asyncHandler(async (req: Request, res: Response) => {
  const activesSeulement = req.query.actives === "1" || req.query.actives === "true";
  const resultat = await categoriesService.listerCategories({ activesSeulement });
  envoyerSucces(res, resultat);
});

export const listerPubliques = asyncHandler(async (_req: Request, res: Response) => {
  const resultat = await categoriesService.listerCategories({ activesSeulement: true });
  envoyerSucces(res, resultat);
});

export const obtenir = asyncHandler(async (req: Request, res: Response) => {
  const resultat = await categoriesService.obtenirCategorie(req.params.id);
  envoyerSucces(res, resultat);
});

export const creer = asyncHandler(async (req: Request, res: Response) => {
  const resultat = await categoriesService.creerCategorie(req.body);
  envoyerSucces(res, resultat, 201);
});

export const modifier = asyncHandler(async (req: Request, res: Response) => {
  const resultat = await categoriesService.modifierCategorie(req.params.id, req.body);
  envoyerSucces(res, resultat);
});

export const supprimer = asyncHandler(async (req: Request, res: Response) => {
  const resultat = await categoriesService.supprimerCategorie(req.params.id);
  envoyerSucces(res, resultat);
});
