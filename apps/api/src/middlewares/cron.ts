import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { ErreurNonAutorise } from "../utils/erreurs";

function secretCorrespond(recu: unknown, attendu: string): boolean {
  if (typeof recu !== "string" || !recu) return false;
  const a = Buffer.from(recu);
  const b = Buffer.from(attendu);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

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
  if (!secretCorrespond(secretRecu, secretAttendu)) {
    throw new ErreurNonAutorise("Secret de tâche planifiée invalide");
  }
  next();
}
