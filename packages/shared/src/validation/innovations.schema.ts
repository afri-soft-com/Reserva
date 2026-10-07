import { z } from "zod";

export const schemaCreerBeneficiaire = z.object({
  nom: z.string().trim().min(2).max(100),
  telephone: z.string().trim().min(8).max(20).optional(),
  lienParente: z.enum(["ENFANT", "EPOUX", "PARENT", "AMI", "AUTRE"]).default("AUTRE"),
});
export type CreerBeneficiaireInput = z.infer<typeof schemaCreerBeneficiaire>;

export const schemaOuvrirLitige = z.object({
  reservationId: z.string().uuid(),
  motif: z.enum([
    "NON_DELIVRE",
    "QUALITE",
    "RETARD",
    "PAIEMENT",
    "AUTRE",
  ]),
  description: z.string().trim().min(5).max(1000),
  preuvesUrl: z.array(z.string().min(1)).max(5).optional(),
});
export type OuvrirLitigeInput = z.infer<typeof schemaOuvrirLitige>;

export const schemaTrancheLitige = z.object({
  litigeId: z.string().uuid(),
  decision: z.enum(["AVOIR_TOTAL", "AVOIR_PARTIEL", "REJET", "REBOOK"]),
  montantAvoir: z.coerce.number().positive().optional(),
  commentaire: z.string().trim().max(500).optional(),
});
export type TrancheLitigeInput = z.infer<typeof schemaTrancheLitige>;

export const schemaReclamerGarantie = z.object({
  reservationId: z.string().uuid(),
  motif: z.string().trim().min(5).max(500),
});
export type ReclamerGarantieInput = z.infer<typeof schemaReclamerGarantie>;

export const schemaCanalSmsInbound = z.object({
  telephone: z.string().trim().min(8).max(20),
  texte: z.string().trim().min(1).max(480),
});
export type CanalSmsInboundInput = z.infer<typeof schemaCanalSmsInbound>;

export const schemaActiverAgent = z.object({
  utilisateurId: z.string().uuid(),
  /** Si omis, utilise COMMISSION_AGENT (tarification admin) */
  commissionPourcent: z.coerce.number().min(0.5).max(10).optional(),
});
export type ActiverAgentInput = z.infer<typeof schemaActiverAgent>;

export const schemaModifierCommissionAgent = z.object({
  commissionPourcent: z.coerce.number().min(0.5).max(10),
});
