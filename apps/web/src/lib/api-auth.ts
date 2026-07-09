import { clientApi } from "./api-client";
import {
  InscriptionInput,
  VerifierOtpInput,
  DefinirPinInput,
  ConnexionPinInput,
  Utilisateur,
  Prestataire,
} from "@reserva/shared";

export async function inscrire(input: InscriptionInput) {
  const { data } = await clientApi.post("/auth/inscription", input);
  return data.donnees as { utilisateurId: string; telephone: string };
}

export async function renvoyerOtp(telephone: string) {
  const { data } = await clientApi.post("/auth/otp/renvoyer", { telephone });
  return data.donnees as { telephone: string };
}

export async function verifierOtp(input: VerifierOtpInput) {
  const { data } = await clientApi.post("/auth/otp/verifier", input);
  return data.donnees as { utilisateurId: string; telephone: string; telephoneVerifie: boolean };
}

export async function definirPin(input: DefinirPinInput) {
  const { data } = await clientApi.post("/auth/pin/definir", input);
  return data.donnees as { token: string; utilisateur: Utilisateur };
}

export async function connecter(input: ConnexionPinInput) {
  const { data } = await clientApi.post("/auth/connexion", input);
  return data.donnees as ({ token: string; utilisateur: Utilisateur } | { deuxfaRequis: boolean; telephone: string; message: string });
}

export async function verifier2FA(input: { telephone: string; code: string }) {
  const { data } = await clientApi.post("/auth/2fa/verifier", input);
  return data.donnees as { token: string; utilisateur: Utilisateur };
}

export async function obtenirProfil() {
  const { data } = await clientApi.get("/auth/profil");
  return data.donnees as Utilisateur & { prestataire: Prestataire | null };
}

export async function mettreAJourPhoto(photoUrl: string) {
  const { data } = await clientApi.patch("/auth/photo", { photoUrl });
  return data.donnees as Utilisateur;
}

export async function definir2FA(actif: boolean) {
  const { data } = await clientApi.post("/auth/2fa/definir", { actif });
  return data.donnees as Utilisateur;
}

export async function demanderReinitialisationPin(telephone: string) {
  const { data } = await clientApi.post("/auth/pin/reinitialiser/demander", { telephone });
  return data.donnees as { telephone: string };
}

export async function reinitialiserPin(input: { telephone: string; code: string; nouveauPin: string }) {
  const { data } = await clientApi.post("/auth/pin/reinitialiser/confirmer", input);
  return data.donnees as { token: string; utilisateur: Utilisateur };
}
