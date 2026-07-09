import { Request, Response } from "express";
import * as notificationsService from "./notifications.service";
import { envoyerSucces } from "../../utils/reponse";
import { asyncHandler } from "../../middlewares/erreurs";
import { ErreurNonAutorise } from "../../utils/erreurs";

export const lister = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const nonLuesUniquement = req.query.nonLues === "true";
  const resultat = await notificationsService.listerNotifications(req.utilisateur.utilisateurId, nonLuesUniquement);
  envoyerSucces(res, resultat);
});

export const compteur = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await notificationsService.compterNonLues(req.utilisateur.utilisateurId);
  envoyerSucces(res, resultat);
});

export const marquerLue = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await notificationsService.marquerLue(req.utilisateur.utilisateurId, req.params.notificationId);
  envoyerSucces(res, resultat);
});

export const marquerToutesLues = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await notificationsService.marquerToutesLues(req.utilisateur.utilisateurId);
  envoyerSucces(res, resultat);
});

/** Endpoint déclenchable par un cron externe (ex: cron-job.org, ou un scheduler interne) */
export const declencherRappels = asyncHandler(async (_req: Request, res: Response) => {
  const resultat = await notificationsService.envoyerRappelsAutomatiques();
  envoyerSucces(res, resultat);
});
