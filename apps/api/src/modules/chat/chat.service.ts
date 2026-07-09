import { prisma } from "../../config/prisma";

export class ServiceChat {
  async listerConversations(utilisateurId: string, page: number, parPage: number) {
    const skip = (page - 1) * parPage;
    const where = { participants: { some: { utilisateurId } } };
    const [items, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        skip,
        take: parPage,
        orderBy: { misAJourLe: "desc" },
        include: {
          participants: {
            include: {
              utilisateur: { select: { id: true, nom: true, telephone: true, role: true, photoUrl: true } },
            },
          },
          messages: {
            orderBy: { creeLe: "desc" },
            take: 1,
            include: {
              envoyeur: { select: { id: true, nom: true, role: true } },
            },
          },
          _count: { select: { messages: true } },
        },
      }),
      prisma.conversation.count({ where }),
    ]);
    const conversations = await Promise.all(items.map(async (c) => {
      const nonLus = await prisma.message.count({
        where: { conversationId: c.id, lu: false, envoyeurId: { not: utilisateurId } },
      });
      return { ...c, nonLus };
    }));
    return { items: conversations, total, page, parPage, totalPages: Math.ceil(total / parPage) };
  }

  async creerConversation(initiateurId: string, participantId: string, sujet?: string) {
    const existante = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { utilisateurId: initiateurId } } },
          { participants: { some: { utilisateurId: participantId } } },
        ],
      },
      include: {
        participants: {
          include: {
            utilisateur: { select: { id: true, nom: true, telephone: true, role: true, photoUrl: true } },
          },
        },
        messages: {
          orderBy: { creeLe: "desc" },
          take: 1,
          include: { envoyeur: { select: { id: true, nom: true, role: true } } },
        },
        _count: { select: { messages: true } },
      },
    });
    if (existante) {
      const nonLus = await prisma.message.count({
        where: { conversationId: existante.id, lu: false, envoyeurId: { not: initiateurId } },
      });
      return { ...existante, nonLus };
    }
    const conversation = await prisma.conversation.create({
      data: {
        sujet,
        participants: {
          createMany: {
            data: [
              { utilisateurId: initiateurId },
              { utilisateurId: participantId },
            ],
          },
        },
      },
      include: {
        participants: {
          include: {
            utilisateur: { select: { id: true, nom: true, telephone: true, role: true, photoUrl: true } },
          },
        },
        _count: { select: { messages: true } },
      },
    });
    return { ...conversation, nonLus: 0 };
  }

  async listerMessages(conversationId: string, utilisateurId: string, page: number, parPage: number) {
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_utilisateurId: { conversationId, utilisateurId } },
    });
    if (!participant) throw new Error("Vous n'êtes pas membre de cette conversation");
    const skip = (page - 1) * parPage;
    const [items, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId },
        skip,
        take: parPage,
        orderBy: { creeLe: "desc" },
        include: {
          envoyeur: { select: { id: true, nom: true, role: true, photoUrl: true } },
        },
      }),
      prisma.message.count({ where: { conversationId } }),
    ]);
    return { items: items.reverse(), total, page, parPage, totalPages: Math.ceil(total / parPage) };
  }

  async envoyerMessage(conversationId: string, envoyeurId: string, contenu: string, imageUrl?: string) {
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_utilisateurId: { conversationId, utilisateurId: envoyeurId } },
    });
    if (!participant) throw new Error("Vous n'êtes pas membre de cette conversation");
    const message = await prisma.message.create({
      data: { conversationId, envoyeurId, contenu, imageUrl },
      include: {
        envoyeur: { select: { id: true, nom: true, role: true, photoUrl: true } },
      },
    });
    await prisma.conversation.update({ where: { id: conversationId }, data: { misAJourLe: new Date() } });
    return message;
  }

  async marquerLu(conversationId: string, utilisateurId: string) {
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_utilisateurId: { conversationId, utilisateurId } },
    });
    if (!participant) throw new Error("Vous n'êtes pas membre de cette conversation");
    await prisma.conversationParticipant.update({
      where: { conversationId_utilisateurId: { conversationId, utilisateurId } },
      data: { derniereLecture: new Date() },
    });
    await prisma.message.updateMany({
      where: { conversationId, envoyeurId: { not: utilisateurId }, lu: false },
      data: { lu: true, luLe: new Date() },
    });
  }

  async obtenirOuCreerConversationAvecAdmin(utilisateurId: string) {
    const admin = await prisma.utilisateur.findFirst({
      where: { role: "ADMIN" },
      orderBy: { creeLe: "asc" },
    });
    if (!admin) throw new Error("Aucun administrateur trouvé");
    return this.creerConversation(utilisateurId, admin.id, "Contact support");
  }
}
