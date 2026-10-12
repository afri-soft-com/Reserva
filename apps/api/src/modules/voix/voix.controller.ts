import { Request, Response, NextFunction } from "express";
import { envoyerSucces } from "../../utils/reponse";
import { ServiceVoix } from "./voix.service";

const service = new ServiceVoix();

export async function tokenVoix(req: Request, res: Response, next: NextFunction) {
  try {
    const { conversationId, reservationId } = req.body as {
      conversationId?: string;
      reservationId?: string;
    };
    const resultat = await service.creerToken(req.utilisateur!.utilisateurId, {
      conversationId,
      reservationId,
    });
    envoyerSucces(res, resultat);
  } catch (e) {
    next(e);
  }
}
