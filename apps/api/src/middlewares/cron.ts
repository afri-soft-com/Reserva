import { Request, Response, NextFunction } from "express";
import { ErreurNonAutorise } from "../utils/erreurs";

/**
 * Protège les endpoints destinés à être déclenchés par un scheduler externe (cron job)
 * plutôt que par un utilisateur. Le scheduler doit envoyer l'en-tête X-Cron-Secret.
 */
export function verifierSecretCron(req: Request, _res: Response, next: NextFunction): void {
  const secretAttendu = process.env.CRON_SECRET;
  if (!secretAttendu) {
    throw new Error("CRON_SECRET n'est pas configuré côté serveur. Définissez-le dans .env avant d'exposer cet endpoint.");
  }

  const secretRecu = req.headers["x-cron-secret"];
  if (secretRecu !== secretAttendu) {
    throw new ErreurNonAutorise("Secret de tâche planifiée invalide");
  }
  next();
}
