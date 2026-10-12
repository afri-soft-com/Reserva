import { env } from "../../config/env";

/**
 * Envoi email léger — simulation en local / prod sans SMTP.
 * Branchez un provider (Resend, SES…) plus tard via EMAIL_SMTP_*.
 */
export async function envoyerEmail(params: {
  to: string;
  sujet: string;
  texte: string;
}): Promise<{ succes: boolean; mode: string }> {
  const to = params.to.trim();
  if (!to || !to.includes("@")) {
    return { succes: false, mode: "invalide" };
  }

  if (env.NODE_ENV !== "production" || !process.env.EMAIL_SMTP_HOST) {
    console.log(`[EMAIL simulation] → ${to} | ${params.sujet}\n${params.texte}`);
    return { succes: true, mode: "simulation" };
  }

  // Stub extensible : sans dépendance nodemailer pour l'instant, log + succès
  console.log(`[EMAIL] → ${to} | ${params.sujet}`);
  return { succes: true, mode: "log" };
}
