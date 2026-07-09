import { Request, Response, NextFunction } from "express";
import { ErreurApplication } from "../utils/erreurs";
import { envoyerErreur } from "../utils/reponse";
import { env } from "../config/env";

/** Middleware global de gestion d'erreurs — doit être enregistré en dernier dans la chaîne Express */
export function gestionnaireErreurs(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ErreurApplication) {
    envoyerErreur(res, err.statusCode, err.code, err.message);
    return;
  }

  // Erreur Prisma : violation de contrainte unique (ex: téléphone déjà utilisé)
  if (err.name === "PrismaClientKnownRequestError" && (err as any).code === "P2002") {
    envoyerErreur(res, 409, "CONFLIT", "Cette ressource existe déjà (contrainte d'unicité violée)");
    return;
  }

  // Erreur non prévue : on log côté serveur, on masque les détails en production
  console.error("[ERREUR NON GÉRÉE]", err);
  const message = env.NODE_ENV === "production"
    ? "Une erreur interne est survenue. Veuillez réessayer plus tard."
    : err.message;
  envoyerErreur(res, 500, "ERREUR_INTERNE", message);
}

/** Wrapper pour les handlers async — capture les rejets de promesses et les transmet au gestionnaire d'erreurs */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
