import { Request, Response } from "express";
import * as paiementsService from "./paiements.service";
import { envoyerSucces } from "../../utils/reponse";
import { asyncHandler } from "../../middlewares/erreurs";
import { ErreurNonAutorise } from "../../utils/erreurs";

export const initier = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await paiementsService.initierPaiement(req.utilisateur.utilisateurId, req.body);
  envoyerSucces(res, resultat, 201);
});

export const transactions = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await paiementsService.listerTransactionsReservation(req.utilisateur.utilisateurId, req.params.reservationId);
  envoyerSucces(res, resultat);
});

export const recu = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await paiementsService.genererRecu(req.utilisateur.utilisateurId, req.params.reservationId);
  envoyerSucces(res, resultat);
});

export const recuHtml = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const html = await paiementsService.genererRecuHtml(req.utilisateur.utilisateurId, req.params.reservationId);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

export const rapportCsv = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const dateDebut = req.query.dateDebut as string | undefined;
  const dateFin = req.query.dateFin as string | undefined;
  const csv = await paiementsService.genererRapportCsv(req.utilisateur.utilisateurId, dateDebut, dateFin);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="rapport-reservations-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
});

export const rapportPdf = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const periode = req.query.periode as string | undefined;
  const serviceId = req.query.serviceId as string | undefined;
  const pdf = await paiementsService.genererRapportPdf(req.utilisateur.utilisateurId, periode, serviceId);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="rapport-reservations-${new Date().toISOString().slice(0, 10)}.pdf"`);
  res.send(pdf);
});

export const recuPdf = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const pdf = await paiementsService.genererRecuPdf(req.utilisateur.utilisateurId, req.params.reservationId);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="recu-${req.params.reservationId}.pdf"`);
  res.send(pdf);
});
