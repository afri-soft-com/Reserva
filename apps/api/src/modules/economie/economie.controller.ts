import { Request, Response } from "express";
import * as economieService from "./economie.service";
import { envoyerSucces } from "../../utils/reponse";
import { asyncHandler } from "../../middlewares/erreurs";
import { ErreurNonAutorise, ErreurValidation } from "../../utils/erreurs";
import { bornerParPage } from "@reserva/shared";

export const plansPublics = asyncHandler(async (_req: Request, res: Response) => {
  const resultat = await economieService.listerPlansPublics();
  envoyerSucces(res, resultat);
});

export const simulation = asyncHandler(async (req: Request, res: Response) => {
  const prix = parseFloat(req.query.prix as string);
  const devise = (req.query.devise as string) || "CDF";
  const prestataireId = req.query.prestataireId as string | undefined;
  if (!Number.isFinite(prix) || prix <= 0) {
    throw new ErreurValidation("Indiquez un prix valide pour simuler la tarification");
  }
  const resultat = await economieService.simulerTarification({ prix, devise, prestataireId });
  envoyerSucces(res, resultat);
});

export const souscrire = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await economieService.souscrireAbonnement(req.utilisateur.utilisateurId, req.body);
  envoyerSucces(res, resultat, 201);
});

export const mesFinances = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await economieService.obtenirFinancesPrestataire(req.utilisateur.utilisateurId);
  envoyerSucces(res, resultat);
});

export const demanderVersement = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await economieService.demanderVersement(req.utilisateur.utilisateurId, req.body);
  envoyerSucces(res, resultat, 201);
});

export const mesVersements = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await economieService.listerVersementsPrestataire(req.utilisateur.utilisateurId);
  envoyerSucces(res, resultat);
});

export const financesAdmin = asyncHandler(async (req: Request, res: Response) => {
  const periode = (req.query.periode as string) || "mois";
  const resultat = await economieService.obtenirFinancesPlateforme(periode);
  envoyerSucces(res, resultat);
});

export const listerVersementsAdmin = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const parPage = bornerParPage(parseInt(req.query.parPage as string) || 20);
  const statut = req.query.statut as string | undefined;
  const resultat = await economieService.listerVersementsAdmin(page, parPage, statut);
  envoyerSucces(res, resultat);
});

export const traiterVersement = asyncHandler(async (req: Request, res: Response) => {
  const resultat = await economieService.traiterVersementAdmin(req.params.id, req.body);
  if (req.utilisateur) {
    const { enregistrerAuditAdmin } = await import("../admin/audit.service");
    await enregistrerAuditAdmin({
      adminId: req.utilisateur.utilisateurId,
      action: req.body.payer ? "VERSEMENT_PAYE" : "VERSEMENT_REFUSE",
      cibleType: "VersementPrestataire",
      cibleId: req.params.id,
      details: { noteAdmin: req.body.noteAdmin },
    }).catch(() => undefined);
  }
  envoyerSucces(res, resultat);
});

export const listerEcrituresAdmin = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const parPage = bornerParPage(parseInt(req.query.parPage as string) || 30);
  const resultat = await economieService.listerEcrituresAdmin({
    page,
    parPage,
    type: req.query.type as string | undefined,
    compte: req.query.compte as string | undefined,
    devise: req.query.devise as string | undefined,
    prestataireId: req.query.prestataireId as string | undefined,
  });
  envoyerSucces(res, resultat);
});

export const soldesPrestatairesAdmin = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const parPage = bornerParPage(parseInt(req.query.parPage as string) || 20);
  const resultat = await economieService.obtenirSoldesPrestatairesAdmin(page, parPage);
  envoyerSucces(res, resultat);
});

export const configTarifAdmin = asyncHandler(async (_req: Request, res: Response) => {
  const resultat = await economieService.obtenirConfigTarif();
  envoyerSucces(res, resultat);
});
