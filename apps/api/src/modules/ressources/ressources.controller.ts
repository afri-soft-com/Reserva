import { Request, Response } from "express";
import * as ressourcesService from "./ressources.service";
import { envoyerSucces } from "../../utils/reponse";
import { asyncHandler } from "../../middlewares/erreurs";
import { ErreurNonAutorise } from "../../utils/erreurs";

function utilisateurId(req: Request): string {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  return req.utilisateur.utilisateurId;
}

export const lister = asyncHandler(async (req: Request, res: Response) => {
  envoyerSucces(res, await ressourcesService.listerRessources(utilisateurId(req), req.params.serviceId));
});

export const creer = asyncHandler(async (req: Request, res: Response) => {
  envoyerSucces(res, await ressourcesService.creerRessource(utilisateurId(req), req.body), 201);
});

export const creerEnLot = asyncHandler(async (req: Request, res: Response) => {
  envoyerSucces(res, await ressourcesService.creerRessourcesEnLot(utilisateurId(req), req.body), 201);
});

export const modifier = asyncHandler(async (req: Request, res: Response) => {
  envoyerSucces(res, await ressourcesService.modifierRessource(utilisateurId(req), req.params.ressourceId, req.body));
});

export const retirer = asyncHandler(async (req: Request, res: Response) => {
  envoyerSucces(res, await ressourcesService.retirerRessource(utilisateurId(req), req.params.ressourceId));
});

export const reattribuer = asyncHandler(async (req: Request, res: Response) => {
  envoyerSucces(
    res,
    await ressourcesService.reattribuerTable(utilisateurId(req), req.params.reservationId, req.body.ressourceId)
  );
});
