import { Request, Response, NextFunction } from "express";
import { envoyerSucces } from "../../utils/reponse";
import { ErreurValidation } from "../../utils/erreurs";
import { assurerPrivacyParDefaut, enregistrerPrivacy, lirePrivacyPubliee } from "./legal.service";

export async function getPrivacyPublique(_req: Request, res: Response, next: NextFunction) {
  try {
    await assurerPrivacyParDefaut();
    envoyerSucces(res, await lirePrivacyPubliee());
  } catch (e) {
    next(e);
  }
}

export async function getPrivacyAdmin(_req: Request, res: Response, next: NextFunction) {
  try {
    await assurerPrivacyParDefaut();
    envoyerSucces(res, await lirePrivacyPubliee());
  } catch (e) {
    next(e);
  }
}

export async function putPrivacyAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const body = typeof req.body?.body === "string" ? req.body.body : "";
    if (!body.trim()) throw new ErreurValidation("Le texte de la politique est obligatoire.");
    const doc = await enregistrerPrivacy({
      title: typeof req.body?.title === "string" ? req.body.title : undefined,
      version: typeof req.body?.version === "string" ? req.body.version : undefined,
      body,
      format: typeof req.body?.format === "string" ? req.body.format : undefined,
    });
    envoyerSucces(res, doc);
  } catch (e) {
    if (e instanceof ErreurValidation) {
      next(e);
      return;
    }
    if (e instanceof Error) {
      next(new ErreurValidation(e.message));
      return;
    }
    next(e);
  }
}
