import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/erreurs";
import * as innovationsService from "./innovations.service";

export const listerBeneficiaires = asyncHandler(async (req: Request, res: Response) => {
  const items = await innovationsService.listerBeneficiaires(req.utilisateur!.utilisateurId);
  res.json({ succes: true, data: items });
});

export const creerBeneficiaire = asyncHandler(async (req: Request, res: Response) => {
  const item = await innovationsService.creerBeneficiaire(req.utilisateur!.utilisateurId, req.body);
  res.status(201).json({ succes: true, data: item });
});

export const supprimerBeneficiaire = asyncHandler(async (req: Request, res: Response) => {
  const data = await innovationsService.supprimerBeneficiaire(req.utilisateur!.utilisateurId, req.params.id);
  res.json({ succes: true, data });
});

export const reclamerGarantie = asyncHandler(async (req: Request, res: Response) => {
  const data = await innovationsService.reclamerGarantie(req.utilisateur!.utilisateurId, req.body);
  res.json({ succes: true, data });
});

export const ouvrirLitige = asyncHandler(async (req: Request, res: Response) => {
  const data = await innovationsService.ouvrirLitige(req.utilisateur!.utilisateurId, req.body);
  res.status(201).json({ succes: true, data });
});

export const listerLitiges = asyncHandler(async (req: Request, res: Response) => {
  const data = await innovationsService.listerMesLitiges(req.utilisateur!.utilisateurId, req.utilisateur!.role);
  res.json({ succes: true, data });
});

export const trancheLitige = asyncHandler(async (req: Request, res: Response) => {
  const data = await innovationsService.trancheLitige(req.utilisateur!.utilisateurId, req.body);
  res.json({ succes: true, data });
});

export const activerAgent = asyncHandler(async (req: Request, res: Response) => {
  const data = await innovationsService.activerAgent(req.utilisateur!.utilisateurId, req.body);
  res.json({ succes: true, data });
});

export const listerAgents = asyncHandler(async (_req: Request, res: Response) => {
  const data = await innovationsService.listerAgents();
  res.json({ succes: true, data });
});

export const modifierCommissionAgent = asyncHandler(async (req: Request, res: Response) => {
  const data = await innovationsService.modifierCommissionAgent(
    req.params.id,
    Number(req.body.commissionPourcent)
  );
  res.json({ succes: true, data });
});

export const desactiverAgent = asyncHandler(async (req: Request, res: Response) => {
  const data = await innovationsService.desactiverAgent(req.params.id);
  res.json({ succes: true, data });
});

export const statsAgent = asyncHandler(async (req: Request, res: Response) => {
  const data = await innovationsService.statsAgent(req.utilisateur!.utilisateurId);
  res.json({ succes: true, data });
});

export const canalSms = asyncHandler(async (req: Request, res: Response) => {
  const data = await innovationsService.traiterCanalSms(req.body);
  res.json({ succes: true, data });
});

export const fileTerrain = asyncHandler(async (req: Request, res: Response) => {
  const data = await innovationsService.fileTerrainAujourdhui(req.utilisateur!.utilisateurId);
  res.json({ succes: true, data });
});

export const appelerProchain = asyncHandler(async (req: Request, res: Response) => {
  const data = await innovationsService.appelerProchain(req.utilisateur!.utilisateurId);
  res.json({ succes: true, data });
});

export const recalculerConfiance = asyncHandler(async (_req: Request, res: Response) => {
  const data = await innovationsService.recalculerTousLesScores();
  res.json({ succes: true, data: { misAJour: data.length } });
});
