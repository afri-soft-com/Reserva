import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "./config/env";
import { PayloadToken } from "./middlewares/auth";
import { prisma } from "./config/prisma";

let io: Server;

/** Accepte string ou { conversationId } depuis Flutter / web. */
function idConversation(payload: unknown): string | null {
  if (typeof payload === "string" && payload.trim()) return payload.trim();
  if (payload && typeof payload === "object" && "conversationId" in payload) {
    const id = (payload as { conversationId?: unknown }).conversationId;
    if (typeof id === "string" && id.trim()) return id.trim();
  }
  return null;
}

export function initialiserSocket(serveur: HttpServer) {
  io = new Server(serveur, {
    cors: {
      origin: [env.WEB_URL, "http://localhost:19006", "http://localhost:3000", "http://localhost:3001"],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) return next(new Error("Token d'authentification manquant"));
    try {
      const payload = jwt.verify(token as string, env.JWT_SECRET) as PayloadToken;
      (socket as any).utilisateur = payload;
      next();
    } catch {
      next(new Error("Token invalide"));
    }
  });

  io.on("connection", (socket) => {
    const user = (socket as any).utilisateur as PayloadToken;
    console.log(`Socket connecté: ${user.telephone} (${user.role})`);
    // Salon perso : alertes réservation / push temps réel
    if (user.utilisateurId) {
      socket.join(`user:${user.utilisateurId}`);
    }

    socket.on("rejoindre-conversation", (payload: unknown) => {
      const conversationId = idConversation(payload);
      if (conversationId) socket.join(`conv:${conversationId}`);
    });

    socket.on("quitter-conversation", (payload: unknown) => {
      const conversationId = idConversation(payload);
      if (conversationId) socket.leave(`conv:${conversationId}`);
    });

    socket.on("message-ecrit", async (donnees: { conversationId: string; contenu: string; imageUrl?: string }) => {
      try {
        const conversationId = idConversation(donnees) || donnees?.conversationId;
        if (!conversationId) return socket.emit("erreur", "conversationId manquant");

        const participant = await prisma.conversationParticipant.findUnique({
          where: {
            conversationId_utilisateurId: {
              conversationId,
              utilisateurId: user.utilisateurId,
            },
          },
        });
        if (!participant) return socket.emit("erreur", "Vous n'êtes pas membre de cette conversation");

        const message = await prisma.message.create({
          data: {
            conversationId,
            envoyeurId: user.utilisateurId,
            contenu: donnees.contenu || (donnees.imageUrl ? "📷" : ""),
            imageUrl: donnees.imageUrl,
          },
          include: {
            envoyeur: { select: { id: true, nom: true, role: true, photoUrl: true } },
          },
        });

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { misAJourLe: new Date() },
        });

        io.to(`conv:${conversationId}`).emit("nouveau-message", message);
      } catch {
        socket.emit("erreur", "Erreur lors de l'envoi du message");
      }
    });

    socket.on("tape", (payload: unknown) => {
      const conversationId = idConversation(payload);
      if (!conversationId) return;
      socket.to(`conv:${conversationId}`).emit("tape", { conversationId, utilisateurId: user.utilisateurId });
    });

    socket.on("marquer-lu", async (payload: unknown) => {
      const conversationId = idConversation(payload);
      if (!conversationId) return;
      await prisma.conversationParticipant.updateMany({
        where: { conversationId, utilisateurId: user.utilisateurId },
        data: { derniereLecture: new Date() },
      });
      await prisma.message.updateMany({
        where: { conversationId, envoyeurId: { not: user.utilisateurId }, lu: false },
        data: { lu: true, luLe: new Date() },
      });
      socket.to(`conv:${conversationId}`).emit("messages-lus", { conversationId, utilisateurId: user.utilisateurId });
    });

    socket.on("disconnect", () => {
      console.log(`Socket déconnecté: ${user.telephone}`);
    });
  });

  return io;
}

export function obtenirIo(): Server {
  if (!io) throw new Error("Socket.IO non initialisé");
  return io;
}
