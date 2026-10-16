import { Request, Response, NextFunction } from "express";
import { envoyerSucces } from "../../utils/reponse";
import { ecrireVersions, lireVersions, publierSeuilsMonotones } from "./app-versions.service";

export async function getVersions(_req: Request, res: Response, next: NextFunction) {
  try {
    envoyerSucces(res, await lireVersions());
  } catch (e) {
    next(e);
  }
}

export async function putVersions(req: Request, res: Response, next: NextFunction) {
  try {
    const resultat = await ecrireVersions(req.utilisateur!.utilisateurId, req.body);
    envoyerSucces(res, resultat);
  } catch (e) {
    next(e);
  }
}

/** Cron / CI : monte minSoft après publication store ou deploy web. */
export async function publierSeuils(req: Request, res: Response, next: NextFunction) {
  try {
    const resultat = await publierSeuilsMonotones(req.body ?? {});
    envoyerSucces(res, resultat);
  } catch (e) {
    next(e);
  }
}
