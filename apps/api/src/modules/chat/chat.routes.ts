import { Router } from "express";
import { authentifier } from "../../middlewares/auth";
import { valider } from "../../middlewares/valider";
import { schemaCreerConversation, schemaEnvoyerMessage, schemaRechercheConversations, schemaRechercheMessages } from "./chat.schema";
import { listerConversations, creerConversation, contacterAdmin, listerMessages, envoyerMessage, marquerLu } from "./chat.controller";

export const routesChat = Router();

routesChat.use(authentifier);

routesChat.get("/conversations", valider(schemaRechercheConversations, "query"), listerConversations);
routesChat.post("/conversations", valider(schemaCreerConversation), creerConversation);
routesChat.post("/conversations/admin", contacterAdmin);
routesChat.get("/conversations/:id/messages", valider(schemaRechercheMessages, "query"), listerMessages);
routesChat.post("/conversations/:id/messages", valider(schemaEnvoyerMessage), envoyerMessage);
routesChat.patch("/conversations/:id/lire", marquerLu);
