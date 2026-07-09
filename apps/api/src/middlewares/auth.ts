import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { ErreurNonAutorise, ErreurInterdit } from "../utils/erreurs";
import { RoleUtilisateur } from "@reserva/shared";

export interface PayloadToken {
  utilisateurId: string;
  role: RoleUtilisateur;
  telephone: string;
}

declare global {
  namespace Express {
    interface Request {
      utilisateur?: PayloadToken;
    }
  }
}

/** Génère un JWT signé pour un utilisateur authentifié */
export function genererToken(payload: PayloadToken): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRATION as jwt.SignOptions["expiresIn"] });
}

/** Middleware : exige un token JWT valide, peuple req.utilisateur */
export function authentifier(req: Request, _res: Response, next: NextFunction): void {
  const enTete = req.headers.authorization;
  if (!enTete || !enTete.startsWith("Bearer ")) {
    throw new ErreurNonAutorise("Token d'authentification manquant");
  }

  const token = enTete.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as PayloadToken;
    req.utilisateur = payload;
    next();
  } catch {
    throw new ErreurNonAutorise("Token d'authentification invalide ou expiré");
  }
}

/** Middleware : authentification optionnelle — peuple req.utilisateur si un token valide est présent, sinon continue */
export function authentifierOptionnel(req: Request, _res: Response, next: NextFunction): void {
  const enTete = req.headers.authorization;
  if (enTete && enTete.startsWith("Bearer ")) {
    const token = enTete.slice("Bearer ".length);
    try {
      req.utilisateur = jwt.verify(token, env.JWT_SECRET) as PayloadToken;
    } catch {
      // Token invalide en mode optionnel : on ignore simplement, pas d'erreur bloquante
    }
  }
  next();
}

/** Middleware factory : exige que l'utilisateur ait un des rôles autorisés */
export function exigerRole(...rolesAutorises: RoleUtilisateur[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.utilisateur) {
      throw new ErreurNonAutorise();
    }
    if (!rolesAutorises.includes(req.utilisateur.role)) {
      throw new ErreurInterdit(`Cette action nécessite l'un des rôles suivants : ${rolesAutorises.join(", ")}`);
    }
    next();
  };
}
