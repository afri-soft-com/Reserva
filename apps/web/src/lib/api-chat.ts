import { clientApi } from "./api-client";

export interface ConversationItem {
  id: string;
  sujet?: string;
  creeLe: string;
  misAJourLe: string;
  nonLus: number;
  participants: Array<{
    id: string;
    conversationId: string;
    utilisateurId: string;
    utilisateur: { id: string; nom: string; telephone: string; role: string; photoUrl?: string };
    derniereLecture?: string;
  }>;
  messages: Array<{
    id: string;
    contenu: string;
    creeLe: string;
    envoyeur: { id: string; nom: string; role: string };
  }>;
  _count: { messages: number };
}

export interface MessageItem {
  id: string;
  conversationId: string;
  envoyeurId: string;
  contenu: string;
  lu: boolean;
  luLe?: string;
  creeLe: string;
  envoyeur: { id: string; nom: string; role: string; photoUrl?: string };
}

export interface ConversationListResult {
  items: ConversationItem[];
  total: number;
  page: number;
  parPage: number;
  totalPages: number;
}

export interface MessageListResult {
  items: MessageItem[];
  total: number;
  page: number;
  parPage: number;
  totalPages: number;
}

export async function listerConversations(page = 1, parPage = 50): Promise<ConversationListResult> {
  const { data } = await clientApi.get("/chat/conversations", { params: { page, parPage } });
  return data.donnees;
}

export async function creerConversation(participantId: string, sujet?: string): Promise<ConversationItem> {
  const { data } = await clientApi.post("/chat/conversations", { participantId, sujet });
  return data.donnees;
}

export async function contacterAdmin(): Promise<ConversationItem> {
  const { data } = await clientApi.post("/chat/conversations/admin");
  return data.donnees;
}

export async function listerMessages(conversationId: string, page = 1, parPage = 100): Promise<MessageListResult> {
  const { data } = await clientApi.get(`/chat/conversations/${conversationId}/messages`, { params: { page, parPage } });
  return data.donnees;
}

export async function envoyerMessage(conversationId: string, contenu: string): Promise<MessageItem> {
  const { data } = await clientApi.post(`/chat/conversations/${conversationId}/messages`, { contenu });
  return data.donnees;
}

export async function marquerLu(conversationId: string): Promise<void> {
  await clientApi.patch(`/chat/conversations/${conversationId}/lire`);
}
