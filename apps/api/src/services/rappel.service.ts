import { prisma } from "../config/prisma";

const SEUILS_RAPPEL = [
  { label: "24h", heures: 24 },
  { label: "2h", heures: 2 },
];

export async function genererRappels() {
  const maintenant = new Date();
  const rappelsCrees = { sms: 0, whatsapp: 0, email: 0 };

  for (const seuil of SEUILS_RAPPEL) {
    const debut = new Date(maintenant.getTime() + seuil.heures * 60 * 60 * 1000);
    const fin = new Date(debut.getTime() + 60 * 60 * 1000); // fenêtre de 1h

    const reservations = await prisma.reservation.findMany({
      where: {
        statut: { in: ["CONFIRMEE", "EN_ATTENTE"] },
        creneau: { debut: { gte: debut, lte: fin } },
      },
      include: {
        client: { select: { id: true, nom: true, telephone: true } },
        prestataire: { select: { nomEntreprise: true } },
        service: { select: { nom: true } },
        creneau: { select: { debut: true } },
      },
    });

    for (const r of reservations) {
      const message = `RESERVA — Rappel: Votre réservation ${r.service.nom} chez ${r.prestataire.nomEntreprise} est prévue dans ${seuil.label} (${r.creneau.debut.toLocaleDateString("fr-FR")} à ${r.creneau.debut.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}).`;

      // Notification in-app
      const existeNotif = await prisma.notification.findFirst({
        where: { utilisateurId: r.client.id, titre: { contains: `Rappel ${seuil.label}` }, reservationId: r.id },
      });
      if (!existeNotif) {
        await prisma.notification.create({
          data: {
            utilisateurId: r.client.id,
            reservationId: r.id,
            titre: `Rappel ${seuil.label} — ${r.service.nom}`,
            message,
            type: "RAPPEL",
          },
        });
      }

      // Simuler envoi SMS
      console.log(`[RAPPEL SMS → ${r.client.telephone}] ${message}`);
      rappelsCrees.sms++;
    }
  }

  // Nettoyer notifications obsolètes (réservations passées)
  await prisma.notification.deleteMany({
    where: {
      type: "RAPPEL",
      reservation: { creneau: { debut: { lt: new Date(Date.now() - 86400000) } } },
    },
  });

  return rappelsCrees;
}
