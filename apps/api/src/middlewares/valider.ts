import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { ErreurValidation } from "../utils/erreurs";

type SourceDonnees = "body" | "query" | "params";

/**
 * Middleware factory : valide req[source] selon le schéma Zod fourni.
 * En cas de succès, remplace req[source] par les données parsées (avec coercions/valeurs par défaut appliquées).
 */
export function valider(schema: ZodSchema, source: SourceDonnees = "body") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const resultat = schema.safeParse(req[source]);
    if (!resultat.success) {
      const premiereErreur = resultat.error.errors[0];
      const champ = premiereErreur.path.join(".");
      const message = champ ? `${champ} : ${premiereErreur.message}` : premiereErreur.message;
      throw new ErreurValidation(message);
    }
    req[source] = resultat.data;
    next();
  };
}
