import { AccessToken } from "livekit-server-sdk";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { ErreurInterdit, ErreurNonTrouve, ErreurValidation } from "../../utils/erreurs";

function livekitConfigure(): void {
  if (!env.LIVEKIT_URL || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) {
    throw new ErreurValidation(
      "Appels vocaux non configurés (LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET).",
    );
  }
}

export class ServiceVoix {
  async creerToken(utilisateurId: string, input: { conversationId?: string; reservationId?: string }) {
    livekitConfigure();

    let roomName: string;
    let autreNom: string | undefined;

    if (input.conversationId) {
      const participant = await prisma.conversationParticipant.findUnique({
        where: {
          conversationId_utilisateurId: {
            conversationId: input.conversationId,
            utilisateurId,
          },
        },
      });
      if (!participant) throw new ErreurInterdit("Vous n'êtes pas membre de cette conversation");
      roomName = `conv:${input.conversationId}`;
      const autre = await prisma.conversationParticipant.findFirst({
        where: { conversationId: input.conversationId, utilisateurId: { not: utilisateurId } },
        include: { utilisateur: { select: { nom: true } } },
      });
      autreNom = autre?.utilisateur.nom;
    } else if (input.reservationId) {
      const resa = await prisma.reservation.findUnique({
        where: { id: input.reservationId },
        include: {
          client: { select: { id: true, nom: true } },
          prestataire: { select: { id: true, utilisateurId: true, utilisateur: { select: { nom: true } } } },
        },
      });
      if (!resa) throw new ErreurNonTrouve("Réservation introuvable");
      const estClient = resa.clientId === utilisateurId;
      const estPro = resa.prestataire.utilisateurId === utilisateurId;
      if (!estClient && !estPro) throw new ErreurInterdit("Accès refusé à cette réservation");
      roomName = `resa:${input.reservationId}`;
      autreNom = estClient ? resa.prestataire.utilisateur.nom : resa.client.nom;
    } else {
      throw new ErreurValidation("Indiquez conversationId ou reservationId");
    }

    const user = await prisma.utilisateur.findUnique({
      where: { id: utilisateurId },
      select: { nom: true, telephone: true },
    });

    const at = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
      identity: utilisateurId,
      name: user?.nom || user?.telephone || utilisateurId,
      ttl: "1h",
    });
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    // Notifie l'interlocuteur pour qu'il rejoigne l'appel (pas de push FCM encore)
    try {
      let destinataireId: string | null = null;
      if (input.conversationId) {
        const autre = await prisma.conversationParticipant.findFirst({
          where: { conversationId: input.conversationId, utilisateurId: { not: utilisateurId } },
        });
        destinataireId = autre?.utilisateurId ?? null;
      } else if (input.reservationId) {
        const resa = await prisma.reservation.findUnique({
          where: { id: input.reservationId },
          include: { prestataire: { select: { utilisateurId: true } } },
        });
        if (resa) {
          destinataireId =
            resa.clientId === utilisateurId ? resa.prestataire.utilisateurId : resa.clientId;
        }
      }
      if (destinataireId) {
        await prisma.notification.create({
          data: {
            utilisateurId: destinataireId,
            titre: "Appel vocal entrant",
            message: `${user?.nom || "Un utilisateur"} vous appelle sur RESERVA. Ouvrez la conversation ou la réservation pour répondre.`,
            type: "SYSTEME",
          },
        });
      }
    } catch (e) {
      console.error("[voix] notification appel", e);
    }

    return {
      token,
      url: env.LIVEKIT_URL,
      roomName,
      interlocuteur: autreNom ?? null,
    };
  }
}
