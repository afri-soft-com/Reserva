import "dotenv/config";

function lireVariable(nom: string, valeurParDefaut?: string): string {
  const valeur = process.env[nom] ?? valeurParDefaut;
  if (valeur === undefined) {
    throw new Error(`Variable d'environnement manquante : ${nom}. Vérifiez votre fichier .env (copiez .env.example).`);
  }
  return valeur;
}

export const env = {
  PORT: parseInt(lireVariable("PORT", "4101"), 10),
  NODE_ENV: lireVariable("NODE_ENV", "development"),
  DATABASE_URL: lireVariable("DATABASE_URL"),
  REDIS_URL: lireVariable("REDIS_URL", ""),
  JWT_SECRET: lireVariable("JWT_SECRET"),
  JWT_EXPIRATION: lireVariable("JWT_EXPIRATION", "7d"),
  MODE_PAIEMENT: lireVariable("MODE_PAIEMENT", "simulation") as "simulation" | "production",
  MODE_SMS: lireVariable("MODE_SMS", "simulation") as "simulation" | "production",
  WEB_URL: lireVariable("WEB_URL", "http://localhost:3001"),
  CRON_SECRET: lireVariable("CRON_SECRET"),
  /** Délai anti-litige avant libération du séquestre (heures). Défaut 48. */
  SEQUESTRE_DELAI_HEURES: parseInt(lireVariable("SEQUESTRE_DELAI_HEURES", "48"), 10),
  /** Hub AfriSoft SMS — uniquement serveur (HMAC). Voir docs/otp-afrisoft-sms.md */
  AFRISOFT_SMS_HUB_URL: lireVariable("AFRISOFT_SMS_HUB_URL", "https://sms.afri-soft.com"),
  /** Hub AfriSoft Paiements — HMAC. Voir docs/mobile-money-afrisoft-pay.md */
  AFRISOFT_PAY_HUB_URL: lireVariable("AFRISOFT_PAY_HUB_URL", "https://pay.afri-soft.com"),
  AFRISOFT_HUB_APP_ID: lireVariable("AFRISOFT_HUB_APP_ID", ""),
  AFRISOFT_HUB_API_KEY: lireVariable("AFRISOFT_HUB_API_KEY", ""),
  /** Secret webhooks hub → API (sinon AFRISOFT_HUB_API_KEY) */
  AFRISOFT_HUB_WEBHOOK_SECRET: lireVariable("AFRISOFT_HUB_WEBHOOK_SECRET", ""),
  /** Client IDs OAuth Google (Web + Android + iOS), séparés par des virgules */
  GOOGLE_CLIENT_IDS: lireVariable("GOOGLE_CLIENT_IDS", ""),
  /** simulation = accepte un idToken de démo `SIM-GOOGLE:...` (dev uniquement) */
  MODE_GOOGLE: lireVariable("MODE_GOOGLE", "simulation") as "simulation" | "production",
  /** Bundle IDs Apple (com.reserva.client,com.reserva.pro) — audience identity token */
  APPLE_CLIENT_IDS: lireVariable(
    "APPLE_CLIENT_IDS",
    "com.reserva.client,com.reserva.pro"
  ),
  /** simulation = accepte `SIM-APPLE:email:Nom` (dev uniquement) */
  MODE_APPLE: lireVariable("MODE_APPLE", "simulation") as "simulation" | "production",
  /**
   * E-mail transactionnel (même dispositif que Mova / SENGA, voir email.adapter.ts).
   * Resend prioritaire si RESEND_API_KEY ; sinon SMTP AfriSoft dès que SMTP_PASS est posé.
   * Seuls RESEND_API_KEY ou SMTP_PASS sont à définir sur Render ; le reste a des valeurs AfriSoft.
   */
  RESEND_API_KEY: lireVariable("RESEND_API_KEY", ""),
  RESEND_FROM: lireVariable("RESEND_FROM", ""),
  SMTP_HOST: lireVariable("SMTP_HOST", "mail.afri-soft.com"),
  SMTP_PORT: parseInt(lireVariable("SMTP_PORT", "587"), 10),
  SMTP_USER: lireVariable("SMTP_USER", "noreply@afri-soft.com"),
  SMTP_PASS: lireVariable("SMTP_PASS", ""),
  SMTP_FROM: lireVariable("SMTP_FROM", ""),
  /** Nom TLS du serveur réel : mail.afri-soft.com présente le certificat *.site4now.net */
  SMTP_TLS_SERVERNAME: lireVariable("SMTP_TLS_SERVERNAME", ""),
  /** LiveKit Cloud — appels vocaux (optionnel en local) */
  LIVEKIT_URL: lireVariable("LIVEKIT_URL", ""),
  LIVEKIT_API_KEY: lireVariable("LIVEKIT_API_KEY", ""),
  LIVEKIT_API_SECRET: lireVariable("LIVEKIT_API_SECRET", ""),
};

export const estProduction = env.NODE_ENV === "production";
