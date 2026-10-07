import { Request, Response } from "express";
import * as adminService from "./admin.service";
import { envoyerSucces } from "../../utils/reponse";
import { asyncHandler } from "../../middlewares/erreurs";
import { ErreurNonAutorise } from "../../utils/erreurs";
import { bornerParPage } from "@reserva/shared";

export const statistiques = asyncHandler(async (req: Request, res: Response) => {
  const resultat = await adminService.obtenirStatistiquesPlateforme({
    periode: req.query.periode as string | undefined,
    ville: req.query.ville as string | undefined,
    categorie: req.query.categorie as string | undefined,
  });
  envoyerSucces(res, resultat);
});

export const statistiquesPdf = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const pdf = await adminService.genererStatistiquesPdf({
    periode: req.query.periode as string | undefined,
    ville: req.query.ville as string | undefined,
    categorie: req.query.categorie as string | undefined,
  });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="rapport-statistiques-${new Date().toISOString().slice(0, 10)}.pdf"`);
  res.send(pdf);
});

export const listerPrestataires = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const parPage = bornerParPage(parseInt(req.query.parPage as string) || 20);
  const resultat = await adminService.listerTousPrestataires(page, parPage);
  envoyerSucces(res, resultat);
});

export const listerUtilisateurs = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const parPage = bornerParPage(parseInt(req.query.parPage as string) || 20);
  const resultat = await adminService.listerTousUtilisateurs(page, parPage, {
    recherche: req.query.recherche as string | undefined,
  });
  envoyerSucces(res, resultat);
});

export const suspendre = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await adminService.suspendrePrestataire(req.params.prestataireId);
  const { enregistrerAuditAdmin } = await import("./audit.service");
  await enregistrerAuditAdmin({
    adminId: req.utilisateur.utilisateurId,
    action: "SUSPENDRE_PRESTATAIRE",
    cibleType: "Prestataire",
    cibleId: req.params.prestataireId,
  }).catch(() => undefined);
  envoyerSucces(res, resultat);
});

export const listerAudits = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const { listerAuditsAdmin } = await import("./audit.service");
  const resultat = await listerAuditsAdmin(page);
  envoyerSucces(res, resultat);
});

export const listerReservations = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const parPage = bornerParPage(parseInt(req.query.parPage as string) || 20);
  const resultat = await adminService.listerReservationsAdmin({
    page,
    parPage,
    statut: req.query.statut as string | undefined,
    statutPaiement: req.query.statutPaiement as string | undefined,
    recherche: req.query.recherche as string | undefined,
  });
  envoyerSucces(res, resultat);
});

export const pilotage = asyncHandler(async (_req: Request, res: Response) => {
  const resultat = await adminService.obtenirPilotageAdmin();
  envoyerSucces(res, resultat);
});

// ---- Plans d'abonnement ----

export const listerPlans = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const parPage = bornerParPage(parseInt(req.query.parPage as string) || 50);
  const resultat = await adminService.listerPlans(page, parPage);
  envoyerSucces(res, resultat);
});

export const creerPlan = asyncHandler(async (req: Request, res: Response) => {
  const resultat = await adminService.creerPlan(req.body);
  envoyerSucces(res, resultat, 201);
});

export const modifierPlan = asyncHandler(async (req: Request, res: Response) => {
  const resultat = await adminService.modifierPlan(req.params.id, req.body);
  envoyerSucces(res, resultat);
});

export const supprimerPlan = asyncHandler(async (req: Request, res: Response) => {
  const resultat = await adminService.supprimerPlan(req.params.id);
  envoyerSucces(res, resultat);
});

// ---- Abonnements prestataire ----

export const listerAbonnements = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const parPage = bornerParPage(parseInt(req.query.parPage as string) || 20);
  const resultat = await adminService.listerAbonnements(page, parPage);
  envoyerSucces(res, resultat);
});

export const creerAbonnement = asyncHandler(async (req: Request, res: Response) => {
  const resultat = await adminService.creerAbonnement(req.body);
  envoyerSucces(res, resultat, 201);
});

// ---- Configuration tarification ----

export const listerConfigurations = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const parPage = bornerParPage(parseInt(req.query.parPage as string) || 50);
  const resultat = await adminService.listerConfigurations(page, parPage);
  envoyerSucces(res, resultat);
});

export const creerOuModifierConfig = asyncHandler(async (req: Request, res: Response) => {
  const resultat = await adminService.creerOuModifierConfig(req.body);
  envoyerSucces(res, resultat, 201);
});

export const supprimerConfig = asyncHandler(async (req: Request, res: Response) => {
  const resultat = await adminService.supprimerConfig(req.params.id);
  envoyerSucces(res, resultat);
});

export const exporterCSV = asyncHandler(async (req: Request, res: Response) => {
  const csv = await adminService.genererExportCSV(req.params.type, req.query);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="export-${req.params.type}-${Date.now()}.csv"`);
  res.send("\uFEFF" + csv); // BOM UTF-8 pour Excel
});

/** Endpoint déclenchable par un cron externe : génère et persiste le rapport hebdomadaire PDF */
export const rapportHebdomadaire = asyncHandler(async (_req: Request, res: Response) => {
  const resultat = await adminService.genererRapportHebdomadaire();
  envoyerSucces(res, resultat);
});

/** Endpoint déclenchable par un cron externe : expire les abonnements dont la date de fin est dépassée */
export const expirerAbonnements = asyncHandler(async (_req: Request, res: Response) => {
  const resultat = await adminService.expirerAbonnements();
  envoyerSucces(res, resultat);
});

/** [ADMIN] Broadcast : envoie une notification SYSTEME à tous les utilisateurs (ou un rôle) */
export const envoyerBroadcast = asyncHandler(async (req: Request, res: Response) => {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  const resultat = await adminService.broadcastNotifications(req.body);
  envoyerSucces(res, resultat);
});

export const obtenirExigenceDocuments = asyncHandler(async (_req: Request, res: Response) => {
  const { obtenirConfigExigenceKyc, DOCUMENTS_KYC_DISPO } = await import(
    "../prestataires/kyc-exigence.service"
  );
  const config = await obtenirConfigExigenceKyc();
  envoyerSucces(res, { config, documentsDisponibles: DOCUMENTS_KYC_DISPO });
});

export const enregistrerExigenceDocuments = asyncHandler(async (req: Request, res: Response) => {
  const { enregistrerConfigExigenceKyc, DOCUMENTS_KYC_DISPO, appliquerExigenceDocuments } = await import(
    "../prestataires/kyc-exigence.service"
  );
  const config = await enregistrerConfigExigenceKyc({
    actif: !!req.body.actif,
    delaiJours: Number(req.body.delaiJours ?? 7),
    documents: req.body.documents || {},
  });
  // Envoie immédiatement les rappels si l'exigence vient d'être activée
  const application = config.actif ? await appliquerExigenceDocuments() : { rappels: 0, bloques: 0 };
  envoyerSucces(res, { config, documentsDisponibles: DOCUMENTS_KYC_DISPO, application });
});
