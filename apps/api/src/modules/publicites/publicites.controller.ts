import { Request, Response } from "express";
import * as publicitesService from "./publicites.service";
import { envoyerSucces } from "../../utils/reponse";
import { asyncHandler } from "../../middlewares/erreurs";

export const lister = asyncHandler(async (req: Request, res: Response) => {
  const actif = req.query.actif === "true" ? true : req.query.actif === "false" ? false : undefined;
  const cible = req.query.cible as string | undefined;
  const resultat = await publicitesService.listerPublicites(actif, cible);
  envoyerSucces(res, resultat);
});

export const obtenir = asyncHandler(async (req: Request, res: Response) => {
  const resultat = await publicitesService.obtenirPublicite(req.params.id);
  envoyerSucces(res, resultat);
});

export const creer = asyncHandler(async (req: Request, res: Response) => {
  const resultat = await publicitesService.creerPublicite(req.body);
  envoyerSucces(res, resultat, 201);
});

export const modifier = asyncHandler(async (req: Request, res: Response) => {
  const resultat = await publicitesService.modifierPublicite(req.params.id, req.body);
  envoyerSucces(res, resultat);
});

export const supprimer = asyncHandler(async (req: Request, res: Response) => {
  await publicitesService.supprimerPublicite(req.params.id);
  envoyerSucces(res, { supprime: true });
});

export const compteur = asyncHandler(async (req: Request, res: Response) => {
  const { publiciteId, type } = req.body as { publiciteId: string; type: "IMPRESSION" | "CLIC" };
  const resultat = await publicitesService.incrementerCompteur(publiciteId, type);
  envoyerSucces(res, resultat);
});
