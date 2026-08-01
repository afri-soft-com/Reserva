import { Request, Response } from "express";
import * as authService from "./auth.service";
import { envoyerSucces } from "../../utils/reponse";
import { asyncHandler } from "../../middlewares/erreurs";
import { ErreurNonAutorise } from "../../utils/erreurs";

export const inscrire = asyncHandler(async (req: Request, res: Response) => {
  const resultat = await authService.demarrerInscription(req.body);
  envoyerSucces(res, resultat, 201);
});

export const renvoyerCode = asyncHandler(async (req: Request, res: Response) => {
  const resultat = await authService.renvoyerOtp(req.body.telephone);
  envoyerSucces(res, resultat);
});

export const verifierCodeOtp = asyncHandler(async (req: Request, res: Response) => {
  const resultat = await authService.verifierOtp(req.body);
  envoyerSucces(res, resultat);
});

export const definirCodePin = asyncHandler(async (req: Request, res: Response) => {
  const resultat = await authService.definirPin(req.body);
  envoyerSucces(res, resultat, 201);
});

export const connexion = asyncHandler(async (req: Request, res: Response) => {
  const resultat = await authService.connecterParPin(req.body);
  envoyerSucces(res, resultat);
});

export const profil = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await authService.obtenirProfil(req.utilisateur.utilisateurId);
  envoyerSucces(res, resultat);
});

export const mettreAJourPhoto = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await authService.mettreAJourPhoto(req.utilisateur.utilisateurId, req.body.photoUrl);
  envoyerSucces(res, resultat);
});

export const mettreAJourProfil = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await authService.mettreAJourProfil(req.utilisateur.utilisateurId, req.body);
  envoyerSucces(res, resultat);
});

export const definir2FA = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await authService.definir2FA(req.utilisateur.utilisateurId, req.body.actif);
  envoyerSucces(res, resultat);
});

export const verifier2FA = asyncHandler(async (req: Request, res: Response) => {
  const resultat = await authService.verifier2FA(req.body);
  envoyerSucces(res, resultat);
});

export const demanderReinitialisation = asyncHandler(async (req: Request, res: Response) => {
  const resultat = await authService.demanderReinitialisationPin(req.body.telephone);
  envoyerSucces(res, resultat);
});

export const reinitialiserPin = asyncHandler(async (req: Request, res: Response) => {
  const resultat = await authService.reinitialiserPin(req.body);
  envoyerSucces(res, resultat);
});

export const codeParrainage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await authService.monCodeParrainage(req.utilisateur.utilisateurId);
  envoyerSucces(res, resultat);
});

export const parrainages = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await authService.mesParrainages(req.utilisateur.utilisateurId);
  envoyerSucces(res, resultat);
});
