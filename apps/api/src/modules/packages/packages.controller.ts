import { Request, Response } from "express";
import * as packagesService from "./packages.service";
import { envoyerSucces } from "../../utils/reponse";
import { asyncHandler } from "../../middlewares/erreurs";
import { ErreurNonAutorise } from "../../utils/erreurs";

// --- Routes publiques ---
export const listerPublics = asyncHandler(async (req: Request, res: Response) => {
  const resultat = await packagesService.listerPackagesPublics(req.query.prestataireId as string | undefined);
  envoyerSucces(res, resultat);
});

export const detailPublic = asyncHandler(async (req: Request, res: Response) => {
  const resultat = await packagesService.obtenirPackagePublic(req.params.packageId);
  envoyerSucces(res, resultat);
});

// --- Routes prestataire ---
export const creer = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await packagesService.creerPackage(req.utilisateur.utilisateurId, req.body);
  envoyerSucces(res, resultat, 201);
});

export const mesPackages = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await packagesService.listerMesPackages(req.utilisateur.utilisateurId);
  envoyerSucces(res, resultat);
});

export const modifier = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await packagesService.modifierPackage(req.utilisateur.utilisateurId, req.params.packageId, req.body);
  envoyerSucces(res, resultat);
});

export const supprimer = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await packagesService.supprimerPackage(req.utilisateur.utilisateurId, req.params.packageId);
  envoyerSucces(res, resultat);
});
