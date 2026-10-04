import { Request, Response, NextFunction } from "express";
import { ErreurApplication } from "./erreurs";

export function envoyerSucces<T>(res: Response, donnees: T, statusCode = 200): void {
  res.status(statusCode).json({ succes: true, donnees });
}

export function envoyerErreur(res: Response, statusCode: number, code: string, message: string): void {
  res.status(statusCode).json({ succes: false, erreur: { code, message } });
}

export function gestionnaireErreurs(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ErreurApplication) {
    envoyerErreur(res, err.statusCode, err.code, err.message);
    return;
  }
  console.error("[ERREUR NON GÉRÉE]", err);
  const message = process.env.NODE_ENV === "production"
    ? "Une erreur interne est survenue."
    : err.message;
  envoyerErreur(res, 500, "ERREUR_INTERNE", message);
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
