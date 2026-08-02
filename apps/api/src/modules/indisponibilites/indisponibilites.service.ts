import { prisma } from "../../config/prisma";
import { ErreurNonTrouve, ErreurInterdit, ErreurValidation } from "../../utils/erreurs";

/** Vérifie que le prestataire connecté est bien approuvé puis renvoie son profil */
async function obtenirPrestataire(utilisateurId: string) {
  const prestataire = await prisma.prestataire.findUnique({ where: { utilisateurId } });
  if (!prestataire) {
    throw new ErreurNonTrouve("Profil prestataire non trouvé");
  }
  if (prestataire.statut !== "APPROUVE") {
    throw new ErreurInterdit(
      "Votre profil prestataire doit être approuvé par l'équipe RESERVA avant de pouvoir gérer des indisponibilités"
    );
  }
  return prestataire;
}

export interface CreerPeriodeIndisponibleInput {
  serviceId?: string;
  dateDebut: string;
  dateFin: string;
  motif?: string;
}

/** [PRESTATAIRE] Bloque une période entière (ou pour un service précis) sur le calendrier */
export async function creerPeriodeIndisponible(utilisateurId: string, input: CreerPeriodeIndisponibleInput) {
  const prestataire = await obtenirPrestataire(utilisateurId);

  const dateDebut = new Date(input.dateDebut);
  const dateFin = new Date(input.dateFin);
  if (Number.isNaN(dateDebut.getTime()) || Number.isNaN(dateFin.getTime())) {
    throw new ErreurValidation("Dates invalides");
  }
  if (dateFin <= dateDebut) {
    throw new ErreurValidation("La date de fin doit être postérieure à la date de début");
  }

  if (input.serviceId) {
    const service = await prisma.serviceOffert.findFirst({
      where: { id: input.serviceId, prestataireId: prestataire.id },
    });
    if (!service) {
      throw new ErreurValidation("Ce service ne vous appartient pas");
    }
  }

  return prisma.periodeIndisponible.create({
    data: {
      prestataireId: prestataire.id,
      serviceId: input.serviceId || null,
      dateDebut,
      dateFin,
      motif: input.motif?.trim() || null,
    },
    include: { service: { select: { id: true, nom: true } } },
  });
}

/** [PRESTATAIRE] Liste les périodes bloquées (toutes ou pour un service donné) */
export async function listerMesPeriodesIndisponibles(utilisateurId: string, serviceId?: string) {
  const prestataire = await obtenirPrestataire(utilisateurId);
  return prisma.periodeIndisponible.findMany({
    where: {
      prestataireId: prestataire.id,
      ...(serviceId ? { serviceId } : {}),
    },
    include: { service: { select: { id: true, nom: true } } },
    orderBy: { dateDebut: "desc" },
  });
}

/** [PRESTATAIRE] Supprime une période bloquée — le prestataire redevient réservable sur ce créneau */
export async function supprimerPeriodeIndisponible(utilisateurId: string, periodeId: string) {
  const prestataire = await obtenirPrestataire(utilisateurId);
  const periode = await prisma.periodeIndisponible.findUnique({ where: { id: periodeId } });
  if (!periode) {
    throw new ErreurNonTrouve("Période d'indisponibilité introuvable");
  }
  if (periode.prestataireId !== prestataire.id) {
    throw new ErreurInterdit("Vous ne pouvez pas gérer cette période d'indisponibilité");
  }
  return prisma.periodeIndisponible.delete({ where: { id: periodeId } });
}
