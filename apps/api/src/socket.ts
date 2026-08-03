import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "./config/env";
import { PayloadToken } from "./middlewares/auth";
import { prisma } from "./config/prisma";

let io: Server;

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

    socket.on("rejoindre-conversation", (conversationId: string) => {
      socket.join(`conv:${conversationId}`);
    });

    socket.on("quitter-conversation", (conversationId: string) => {
      socket.leave(`conv:${conversationId}`);
    });

    socket.on("message-ecrit", async (donnees: { conversationId: string; contenu: string; imageUrl?: string }) => {
      try {
        const participant = await prisma.conversationParticipant.findUnique({
          where: {
            conversationId_utilisateurId: {
              conversationId: donnees.conversationId,
              utilisateurId: user.utilisateurId,
            },
          },
        });
        if (!participant) return socket.emit("erreur", "Vous n'êtes pas membre de cette conversation");

        const message = await prisma.message.create({
          data: {
            conversationId: donnees.conversationId,
            envoyeurId: user.utilisateurId,
            contenu: donnees.contenu,
            imageUrl: donnees.imageUrl,
          },
          include: {
            envoyeur: { select: { id: true, nom: true, role: true, photoUrl: true } },
          },
        });

        await prisma.conversation.update({
          where: { id: donnees.conversationId },
          data: { misAJourLe: new Date() },
        });

        io.to(`conv:${donnees.conversationId}`).emit("nouveau-message", message);
      } catch (e) {
        socket.emit("erreur", "Erreur lors de l'envoi du message");
      }
    });

    socket.on("tape", (conversationId: string) => {
      socket.to(`conv:${conversationId}`).emit("tape", { conversationId, utilisateurId: user.utilisateurId });
    });

    socket.on("marquer-lu", async (conversationId: string) => {
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
