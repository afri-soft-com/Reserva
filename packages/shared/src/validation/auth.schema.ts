import { z } from "zod";

/**
 * Numéro de téléphone congolais : accepte les formats locaux et internationaux.
 * Ex: 0991234567, 991234567, +243991234567, 243991234567
 * Préfixes opérateurs courants en RDC : 080-089 (Vodacom/Airtel/Orange...), 09x
 */
const REGEX_TELEPHONE_RDC = /^(\+?243|0)?[89]\d{8}$/;

export const schemaTelephone = z
  .string()
  .trim()
  .regex(REGEX_TELEPHONE_RDC, "Numéro de téléphone congolais invalide (ex: 0991234567)");

export const schemaInscription = z.object({
  telephone: schemaTelephone,
  nom: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères").max(100),
  email: z.string().email("Adresse email invalide").optional().or(z.literal("")),
  langue: z.enum(["fr", "ln", "sw"]).default("fr"),
  codeParrainage: z.string().trim().min(3).max(20).optional(),
});
export type InscriptionInput = z.infer<typeof schemaInscription>;

export const schemaVerifierOtp = z.object({
  telephone: schemaTelephone,
  code: z
    .string()
    .length(6, "Le code OTP doit contenir 6 chiffres")
    .regex(/^\d{6}$/, "Le code OTP ne doit contenir que des chiffres"),
});
export type VerifierOtpInput = z.infer<typeof schemaVerifierOtp>;

export const schemaDefinirPin = z.object({
  telephone: schemaTelephone,
  pin: z
    .string()
    .length(4, "Le code PIN doit contenir 4 chiffres")
    .regex(/^\d{4}$/, "Le code PIN ne doit contenir que des chiffres"),
});
export type DefinirPinInput = z.infer<typeof schemaDefinirPin>;

export const schemaConnexionPin = z.object({
  telephone: schemaTelephone,
  pin: z.string().length(4).regex(/^\d{4}$/),
});
export type ConnexionPinInput = z.infer<typeof schemaConnexionPin>;

export const schemaPhotoProfil = z.object({
  photoUrl: z.string().url("URL de photo invalide").or(z.string().startsWith("data:image")),
});
export type PhotoProfilInput = z.infer<typeof schemaPhotoProfil>;

export const schemaDefinir2FA = z.object({
  actif: z.boolean(),
});
export type Definir2FAInput = z.infer<typeof schemaDefinir2FA>;

export const schemaVerifier2FA = z.object({
  telephone: z.string(),
  code: z.string().length(6),
});
export type Verifier2FAInput = z.infer<typeof schemaVerifier2FA>;

export const schemaDemandeRenvoiOtp = z.object({
  telephone: schemaTelephone,
});
export type DemandeRenvoiOtpInput = z.infer<typeof schemaDemandeRenvoiOtp>;

export const schemaDemandeReinitialisationPin = z.object({
  telephone: schemaTelephone,
});
export type DemandeReinitialisationPinInput = z.infer<typeof schemaDemandeReinitialisationPin>;

export const schemaReinitialiserPin = z.object({
  telephone: schemaTelephone,
  code: z
    .string()
    .length(6, "Le code OTP doit contenir 6 chiffres")
    .regex(/^\d{6}$/, "Le code OTP ne doit contenir que des chiffres"),
  nouveauPin: z
    .string()
    .length(4, "Le code PIN doit contenir 4 chiffres")
    .regex(/^\d{4}$/, "Le code PIN ne doit contenir que des chiffres"),
});
export type ReinitialiserPinInput = z.infer<typeof schemaReinitialiserPin>;
