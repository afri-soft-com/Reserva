import crypto from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { env } from "../../config/env";
import { ErreurValidation } from "../../utils/erreurs";

export type ProfilGoogle = {
  googleId: string;
  email: string;
  nom: string;
  photoUrl?: string;
};

function audiencesAutorisees(): string[] {
  return env.GOOGLE_CLIENT_IDS.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Téléphone synthétique unique (format RDC valide) pour comptes Google sans numéro encore lié. */
export function telephoneSynthetiqueGoogle(googleId: string): string {
  const hex = crypto.createHash("sha256").update(`reserva-google:${googleId}`).digest("hex");
  const digits = hex.replace(/\D/g, "0").padEnd(8, "0").slice(0, 8);
  return `+2439${digits}`;
}

export async function verifierIdTokenGoogle(idToken: string): Promise<ProfilGoogle> {
  // Mode démo local : SIM-GOOGLE:email:Nom Complet
  if (env.MODE_GOOGLE === "simulation" && idToken.startsWith("SIM-GOOGLE:")) {
    const parts = idToken.split(":");
    const email = parts[1] || "demo.google@reserva.cd";
    const nom = parts.slice(2).join(":") || "Utilisateur Google";
    return {
      googleId: `sim-${crypto.createHash("sha256").update(email).digest("hex").slice(0, 16)}`,
      email,
      nom,
    };
  }

  const audiences = audiencesAutorisees();
  if (audiences.length === 0) {
    throw new ErreurValidation(
      "GOOGLE_CLIENT_IDS non configuré. Ajoutez vos Client IDs OAuth Google dans apps/api/.env"
    );
  }

  const client = new OAuth2Client();
  let ticket;
  try {
    ticket = await client.verifyIdToken({ idToken, audience: audiences });
  } catch {
    throw new ErreurValidation("Token Google invalide ou expiré");
  }

  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new ErreurValidation("Profil Google incomplet (email requis)");
  }
  if (payload.email_verified === false) {
    throw new ErreurValidation("Email Google non vérifié");
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    nom: payload.name || payload.email.split("@")[0],
    photoUrl: payload.picture,
  };
}
