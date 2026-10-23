import { Request, Response, NextFunction } from "express";
import { prisma } from "../../config/prisma";
import { ErreurInterdit, ErreurNonAutorise } from "../../utils/erreurs";

const PHONES = (process.env.SUPERADMIN_PHONES || "+243900000001")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const EMAILS = (process.env.SUPERADMIN_EMAILS || "celestinkas@gmail.com")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

/** CRUD confidentialité — SuperAdmin uniquement (téléphone et/ou e-mail). */
export async function exigerSuperAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.utilisateur) throw new ErreurNonAutorise();
  if (req.utilisateur.role !== "ADMIN") {
    throw new ErreurInterdit("Réservé au SuperAdmin.");
  }
  if (PHONES.includes(req.utilisateur.telephone)) {
    next();
    return;
  }
  const u = await prisma.utilisateur.findUnique({
    where: { id: req.utilisateur.utilisateurId },
    select: { email: true },
  });
  const email = (u?.email || "").trim().toLowerCase();
  if (email && EMAILS.includes(email)) {
    next();
    return;
  }
  throw new ErreurInterdit("Réservé au SuperAdmin.");
}

export function estSuperAdminProfil(opts: { telephone?: string | null; email?: string | null }) {
  if (opts.telephone && PHONES.includes(opts.telephone)) return true;
  const email = (opts.email || "").trim().toLowerCase();
  return Boolean(email && EMAILS.includes(email));
}
