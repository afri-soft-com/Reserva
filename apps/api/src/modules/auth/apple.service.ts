import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { ErreurValidation } from "../../utils/erreurs";

export type ProfilApple = {
  appleId: string;
  email: string | null;
  nom: string;
};

type AppleJwk = {
  kty: string;
  kid: string;
  use?: string;
  alg?: string;
  n: string;
  e: string;
};

let cacheJwks: { fetchedAt: number; keys: AppleJwk[] } | null = null;

function audiencesAutorisees(): string[] {
  return env.APPLE_CLIENT_IDS.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Téléphone synthétique unique pour comptes Apple sans numéro encore lié. */
export function telephoneSynthetiqueApple(appleId: string): string {
  const hex = crypto.createHash("sha256").update(`reserva-apple:${appleId}`).digest("hex");
  const digits = hex.replace(/\D/g, "0").padEnd(8, "0").slice(0, 8);
  return `+2438${digits}`;
}

async function jwksApple(): Promise<AppleJwk[]> {
  const maintenant = Date.now();
  if (cacheJwks && maintenant - cacheJwks.fetchedAt < 60 * 60 * 1000) {
    return cacheJwks.keys;
  }
  const res = await fetch("https://appleid.apple.com/auth/keys", {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new ErreurValidation("Impossible de joindre les clés Apple (JWKS)");
  const json = (await res.json()) as { keys?: AppleJwk[] };
  const keys = json.keys || [];
  if (!keys.length) throw new ErreurValidation("JWKS Apple vide");
  cacheJwks = { fetchedAt: maintenant, keys };
  return keys;
}

function jwkVersPem(jwk: AppleJwk): string {
  const keyObject = crypto.createPublicKey({
    key: { kty: jwk.kty, n: jwk.n, e: jwk.e },
    format: "jwk",
  });
  return keyObject.export({ type: "spki", format: "pem" }).toString();
}

export async function verifierIdentityTokenApple(
  identityToken: string,
  nomFourni?: string | null
): Promise<ProfilApple> {
  if (env.MODE_APPLE === "simulation" && identityToken.startsWith("SIM-APPLE:")) {
    const parts = identityToken.split(":");
    const email = parts[1] || "demo.apple@reserva.cd";
    const nom = parts.slice(2).join(":") || nomFourni || "Utilisateur Apple";
    return {
      appleId: `sim-${crypto.createHash("sha256").update(email).digest("hex").slice(0, 16)}`,
      email,
      nom,
    };
  }

  const audiences = audiencesAutorisees();
  if (audiences.length === 0) {
    throw new ErreurValidation(
      "APPLE_CLIENT_IDS non configuré (bundle IDs com.reserva.client, com.reserva.pro)"
    );
  }

  const decoded = jwt.decode(identityToken, { complete: true });
  if (!decoded || typeof decoded === "string" || !decoded.header?.kid) {
    throw new ErreurValidation("Token Apple invalide");
  }

  const keys = await jwksApple();
  const jwk = keys.find((k) => k.kid === decoded.header.kid);
  if (!jwk) throw new ErreurValidation("Clé Apple inconnue (kid)");

  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(identityToken, jwkVersPem(jwk), {
      algorithms: ["RS256"],
      issuer: "https://appleid.apple.com",
    }) as jwt.JwtPayload;
  } catch {
    throw new ErreurValidation("Token Apple invalide ou expiré");
  }

  const aud = payload.aud;
  const audOk = Array.isArray(aud)
    ? aud.some((a) => audiences.includes(String(a)))
    : audiences.includes(String(aud || ""));
  if (!audOk) throw new ErreurValidation("Token Apple : audience (bundle ID) non autorisée");

  const appleId = typeof payload.sub === "string" ? payload.sub : "";
  if (!appleId) throw new ErreurValidation("Profil Apple incomplet (sub requis)");

  const email =
    typeof payload.email === "string" && payload.email.trim()
      ? payload.email.trim()
      : null;

  const nom =
    (nomFourni && nomFourni.trim()) ||
    (email ? email.split("@")[0] : null) ||
    "Utilisateur Apple";

  return { appleId, email, nom };
}
