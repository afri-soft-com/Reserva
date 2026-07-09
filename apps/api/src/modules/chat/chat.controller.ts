import { Request, Response, NextFunction } from "express";
import { envoyerSucces } from "../../utils/reponse";
import { ServiceChat } from "./chat.service";

const serviceChat = new ServiceChat();

export async function listerConversations(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, parPage } = req.query as unknown as { page: number; parPage: number };
    const resultat = await serviceChat.listerConversations(req.utilisateur!.utilisateurId, page, parPage);
    envoyerSucces(res, resultat);
  } catch (e) { next(e); }
}

export async function creerConversation(req: Request, res: Response, next: NextFunction) {
  try {
    const { participantId, sujet } = req.body as { participantId: string; sujet?: string };
    const conversation = await serviceChat.creerConversation(req.utilisateur!.utilisateurId, participantId, sujet);
    envoyerSucces(res, conversation, 201);
  } catch (e) { next(e); }
}

export async function contacterAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const conversation = await serviceChat.obtenirOuCreerConversationAvecAdmin(req.utilisateur!.utilisateurId);
    envoyerSucces(res, conversation, 201);
  } catch (e) { next(e); }
}

export async function listerMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { page, parPage } = req.query as unknown as { page: number; parPage: number };
    const resultat = await serviceChat.listerMessages(id, req.utilisateur!.utilisateurId, page, parPage);
    envoyerSucces(res, resultat);
  } catch (e) { next(e); }
}

export async function envoyerMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { contenu, imageUrl } = req.body as { contenu: string; imageUrl?: string };
    const message = await serviceChat.envoyerMessage(id, req.utilisateur!.utilisateurId, contenu, imageUrl);
    envoyerSucces(res, message, 201);
  } catch (e) { next(e); }
}

export async function marquerLu(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await serviceChat.marquerLu(id, req.utilisateur!.utilisateurId);
    envoyerSucces(res, { lu: true });
  } catch (e) { next(e); }
}
