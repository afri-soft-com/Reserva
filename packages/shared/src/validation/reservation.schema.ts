import { z } from "zod";

export const schemaRechercheServices = z.object({
  categorie: z
    .enum([
      "SANTE",
      "TRANSPORT",
      "HOTELLERIE",
      "RESTAURATION",
      "SALLE_REUNION",
      "ADMINISTRATIF",
      "EDUCATION",
    ])
    .optional(),
  ville: z.string().trim().optional(),
  quartier: z.string().trim().optional(),
  texte: z.string().trim().optional(),
  prixMin: z.coerce.number().positive().optional(),
  prixMax: z.coerce.number().positive().optional(),
  noteMin: z.coerce.number().min(1).max(5).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  rayonKm: z.coerce.number().positive().max(100).optional(),
  tri: z.enum(["prix_asc", "prix_desc", "note_desc", "nom_asc", "distance_asc"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  parPage: z.coerce.number().int().min(1).max(50).default(20),
});
export type RechercheServicesInput = z.infer<typeof schemaRechercheServices>;

export const schemaCreerReservation = z
  .object({
    serviceId: z.string().uuid("Identifiant de service invalide"),
    creneauId: z.string().uuid("Identifiant de créneau invalide"),
    notes: z.string().trim().max(500).optional(),
    reservePourTiers: z.boolean().default(false),
    nomTiers: z.string().trim().min(2).max(100).optional(),
    telephoneTiers: z.string().trim().optional(),
  })
  .refine(
    (data) => !data.reservePourTiers || (!!data.nomTiers && !!data.telephoneTiers),
    {
      message: "Le nom et le téléphone du bénéficiaire sont requis pour une réservation pour un tiers",
      path: ["nomTiers"],
    }
  );
export type CreerReservationInput = z.infer<typeof schemaCreerReservation>;

export const schemaAnnulerReservation = z.object({
  reservationId: z.string().uuid(),
  motif: z.string().trim().max(300).optional(),
});
export type AnnulerReservationInput = z.infer<typeof schemaAnnulerReservation>;

export const schemaModifierReservation = z.object({
  reservationId: z.string().uuid(),
  nouveauCreneauId: z.string().uuid("Identifiant de créneau invalide"),
}).refine(
  (data) => data.reservationId !== data.nouveauCreneauId,
  { message: "Le nouveau créneau doit être différent de l'ancien", path: ["nouveauCreneauId"] }
);
export type ModifierReservationInput = z.infer<typeof schemaModifierReservation>;

export const schemaCreerCreneau = z.object({
  serviceId: z.string().uuid(),
  debut: z.string().datetime({ message: "Date de début invalide (format ISO requis)" }),
  fin: z.string().datetime({ message: "Date de fin invalide (format ISO requis)" }),
  capaciteTotale: z.coerce.number().int().min(1).default(1),
});
export type CreerCreneauInput = z.infer<typeof schemaCreerCreneau>;

export const schemaInitierPaiement = z.object({
  reservationId: z.string().uuid(),
  operateur: z.enum(["MPESA", "AIRTEL_MONEY", "ORANGE_MONEY", "ESPECES"]),
  telephonePaiement: z.string().trim().optional(),
  montant: z.coerce.number().positive(),
  acompteUniquement: z.boolean().default(false),
});
export type InitierPaiementInput = z.infer<typeof schemaInitierPaiement>;

export const schemaCreerAvis = z.object({
  reservationId: z.string().uuid(),
  note: z.coerce.number().int().min(1, "La note minimale est 1").max(5, "La note maximale est 5"),
  commentaire: z.string().trim().max(1000).optional(),
  photosUrl: z.array(z.string().url("URL de photo invalide").or(z.string().startsWith("data:image"))).max(5).optional(),
});
export type CreerAvisInput = z.infer<typeof schemaCreerAvis>;

export const schemaReponseAvis = z.object({
  avisId: z.string().uuid(),
  reponse: z.string().trim().min(1).max(500),
});
export type ReponseAvisInput = z.infer<typeof schemaReponseAvis>;
