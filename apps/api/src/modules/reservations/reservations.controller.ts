import { Request, Response } from "express";
import * as reservationsService from "./reservations.service";
import { envoyerSucces } from "../../utils/reponse";
import { asyncHandler } from "../../middlewares/erreurs";
import { ErreurNonAutorise, ErreurValidation } from "../../utils/erreurs";

export const creer = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await reservationsService.creerReservation(req.utilisateur.utilisateurId, req.body);
  envoyerSucces(res, resultat, 201);
});

export const creerRecurrentes = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await reservationsService.creerReservationsRecurrentes(req.utilisateur.utilisateurId, req.body);
  envoyerSucces(res, resultat, 201);
});

export const repondre = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const { accepter } = req.body as { accepter: boolean };
  if (typeof accepter !== "boolean") throw new ErreurValidation("Le champ 'accepter' (booléen) est requis");
  const resultat = await reservationsService.repondreReservation(req.utilisateur.utilisateurId, req.params.reservationId, accepter);
  envoyerSucces(res, resultat);
});

export const annuler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await reservationsService.annulerReservation(req.utilisateur.utilisateurId, req.body);
  envoyerSucces(res, resultat);
});

export const modifier = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await reservationsService.modifierReservation(req.utilisateur.utilisateurId, req.body);
  envoyerSucces(res, resultat);
});

export const mesReservations = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await reservationsService.listerMesReservations(req.utilisateur.utilisateurId, req.query.statut as string | undefined);
  envoyerSucces(res, resultat);
});

export const detail = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await reservationsService.obtenirDetailReservation(req.utilisateur.utilisateurId, req.params.reservationId);
  envoyerSucces(res, resultat);
});

export const reservationsRecues = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await reservationsService.listerReservationsPrestataire(req.utilisateur.utilisateurId, req.query.statut as string | undefined);
  envoyerSucces(res, resultat);
});

export const cloturer = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const { statut } = req.body as { statut: "TERMINEE" | "ABSENCE" };
  if (!["TERMINEE", "ABSENCE"].includes(statut)) {
    throw new ErreurValidation("Le statut doit être TERMINEE ou ABSENCE");
  }
  const resultat = await reservationsService.marquerStatutFinal(req.utilisateur.utilisateurId, req.params.reservationId, statut);
  envoyerSucces(res, resultat);
});

export const entamer = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await reservationsService.entamerReservation(req.utilisateur.utilisateurId, req.params.reservationId);
  envoyerSucces(res, resultat);
});

export const parNumero = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await reservationsService.obtenirReservationParNumero(req.params.numero);
  envoyerSucces(res, resultat);
});
