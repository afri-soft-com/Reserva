import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ErreurNonAutorise, ErreurInterdit } from "./erreurs";

export interface PayloadToken {
  utilisateurId: string;
  role: string;
  telephone: string;
}

declare global {
  namespace Express {
    interface Request {
      utilisateur?: PayloadToken;
    }
  }
}

export function authentifier(req: Request, _res: Response, next: NextFunction): void {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new ErreurNonAutorise("JWT_SECRET manquant");
  const enTete = req.headers.authorization;
  if (!enTete || !enTete.startsWith("Bearer ")) {
    throw new ErreurNonAutorise("Token d'authentification manquant");
  }
  try {
    req.utilisateur = jwt.verify(enTete.slice(7), secret) as PayloadToken;
    next();
  } catch {
    throw new ErreurNonAutorise("Token d'authentification invalide ou expiré");
  }
}

export function authentifierOptionnel(req: Request, _res: Response, next: NextFunction): void {
  const secret = process.env.JWT_SECRET;
  const enTete = req.headers.authorization;
  if (secret && enTete?.startsWith("Bearer ")) {
    try {
      req.utilisateur = jwt.verify(enTete.slice(7), secret) as PayloadToken;
    } catch {
      /* ignore */
    }
  }
  next();
}

export function exigerRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.utilisateur) throw new ErreurNonAutorise();
    if (!roles.includes(req.utilisateur.role)) {
      throw new ErreurInterdit(`Rôle requis : ${roles.join(", ")}`);
    }
    next();
  };
}
