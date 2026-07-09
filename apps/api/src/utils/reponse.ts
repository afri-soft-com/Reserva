import { Response } from "express";

/** Envoie une réponse de succès au format standard ReponseApi */
export function envoyerSucces<T>(res: Response, donnees: T, statusCode = 200): void {
  res.status(statusCode).json({ succes: true, donnees });
}

/** Envoie une réponse d'erreur au format standard ReponseApi */
export function envoyerErreur(res: Response, statusCode: number, code: string, message: string): void {
  res.status(statusCode).json({ succes: false, erreur: { code, message } });
}
