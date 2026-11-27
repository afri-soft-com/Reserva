import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../../config/env";

/**
 * E-mails transactionnels — même dispositif que Mova / SENGA (services/auth-service,
 * email-otp.mailer.ts) :
 *
 * 1. Resend (API HTTP) si RESEND_API_KEY est posé : seul chemin qui arrive de façon fiable
 *    dans Gmail tant que DKIM n'est pas publié pour afri-soft.com.
 * 2. Sinon SMTP AfriSoft (noreply@afri-soft.com via mail.afri-soft.com:587 STARTTLS)
 *    dès que SMTP_PASS est posé. mail.afri-soft.com est un CNAME vers mail5013.site4now.net,
 *    dont le certificat ne couvre que *.site4now.net : on se connecte donc au serveur réel.
 *
 * Sans aucun des deux : simulation (log) hors production, échec explicite en production.
 * Le SMTP qui accepte (250) ne prouve pas l'arrivée en boîte de réception (filtres anti-spam).
 */

export type ResultatEnvoiEmail = {
  succes: boolean;
  mode: "resend" | "smtp" | "simulation" | "non-configure" | "invalide" | "erreur";
};

const FORMAT_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOM_EXPEDITEUR = "RESERVA AfriSoft";

/** CNAME client → serveur mutualisé dont le certificat TLS est valide (cf. Mova). */
const SERVEURS_SMTP_MUTUALISES: Record<string, string> = {
  "mail.afri-soft.com": "mail5013.site4now.net",
};

export function emailValide(email: string | null | undefined): boolean {
  return !!email && email.length <= 254 && FORMAT_EMAIL.test(email.trim());
}

/** Hôte réellement contacté et nom TLS vérifié pour un SMTP_HOST donné. */
export function cibleSmtp(hote: string, servernameExplicite = ""): { host: string; servername: string } {
  const h = hote.trim().toLowerCase().replace(/\.$/, "");
  const servername = servernameExplicite.trim() || SERVEURS_SMTP_MUTUALISES[h] || h;
  return { host: servername.endsWith(".site4now.net") ? servername : h, servername };
}

export function adresseExpediteur(): string {
  return (env.RESEND_API_KEY ? env.RESEND_FROM : "") || env.SMTP_FROM || env.SMTP_USER;
}

/** Nom EHLO pleinement qualifié (un nom court passe pour un robot auprès des filtres). */
function nomEhlo(expediteur: string): string {
  const domaine = (expediteur.split("@")[1] ?? "").trim().toLowerCase();
  return domaine.includes(".") ? `reserva.${domaine}` : "reserva.afri-soft.com";
}

export function modeEnvoiEmail(): "resend" | "smtp" | null {
  if (env.RESEND_API_KEY) return "resend";
  if (env.SMTP_PASS && env.SMTP_HOST && env.SMTP_USER) return "smtp";
  return null;
}

let transporteur: Transporter | null = null;

function obtenirTransporteur(): Transporter {
  if (!transporteur) {
    const { host, servername } = cibleSmtp(env.SMTP_HOST, env.SMTP_TLS_SERVERNAME);
    transporteur = nodemailer.createTransport({
      host,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      requireTLS: env.SMTP_PORT !== 465,
      name: nomEhlo(adresseExpediteur()),
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      tls: { servername },
      connectionTimeout: 45_000,
      greetingTimeout: 45_000,
      socketTimeout: 45_000,
    });
  }
  return transporteur;
}

async function envoyerViaResend(to: string, sujet: string, texte: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `${NOM_EXPEDITEUR} <${adresseExpediteur()}>`,
      to: [to],
      subject: sujet,
      text: texte,
      html,
    }),
  });
  if (!res.ok) {
    const corps = await res.text().catch(() => "");
    throw new Error(`Resend HTTP ${res.status}: ${corps.slice(0, 200)}`);
  }
}

export async function envoyerEmail(params: {
  to: string;
  sujet: string;
  texte: string;
  html?: string;
}): Promise<ResultatEnvoiEmail> {
  const to = params.to.trim().toLowerCase();
  if (!emailValide(to)) {
    return { succes: false, mode: "invalide" };
  }
  const html = params.html ?? `<p>${echapperHtml(params.texte).replace(/\n/g, "<br/>")}</p>`;
  const mode = modeEnvoiEmail();

  if (!mode) {
    if (env.NODE_ENV === "production") {
      console.error(`[EMAIL] RESEND_API_KEY ou SMTP_PASS manquant : « ${params.sujet} » non envoyé`);
      return { succes: false, mode: "non-configure" };
    }
    console.log(`[EMAIL simulation] → ${to} | ${params.sujet}\n${params.texte}`);
    return { succes: true, mode: "simulation" };
  }

  try {
    if (mode === "resend") {
      await envoyerViaResend(to, params.sujet, params.texte, html);
    } else {
      const expediteur = adresseExpediteur();
      await obtenirTransporteur().sendMail({
        from: { name: NOM_EXPEDITEUR, address: expediteur },
        // Enveloppe = compte authentifié (le relais refuse un autre MAIL FROM)
        envelope: { from: env.SMTP_USER, to },
        replyTo: expediteur,
        to,
        subject: params.sujet,
        text: params.texte,
        html,
        headers: { "Auto-Submitted": "auto-generated" },
      });
    }
    console.log(`[EMAIL] accepté (${mode}) → ${masquerEmail(to)} | ${params.sujet}`);
    return { succes: true, mode };
  } catch (e) {
    // Jamais le corps du message dans les logs (il contient le code)
    console.error(`[EMAIL] échec (${mode}) → ${masquerEmail(to)}: ${(e as Error).message}`);
    return { succes: false, mode: "erreur" };
  }
}

/**
 * Objet et texte sans « OTP » ni « code PIN » : le filtre anti-spam du relais AfriSoft
 * (MessageAI, 550) rejette ces mots dans l'objet (constat Mova, septembre 2026).
 */
export const OBJET_ACTIVATION_PRO = "Votre accès RESERVA Pro — AfriSoft";

export function contenuActivationEmail(code: string, minutes: number) {
  const texte = [
    "Bonjour,",
    "",
    "Votre dossier RESERVA Pro est approuvé. Voici votre code d'accès (6 chiffres) :",
    "",
    code,
    "",
    `Saisissez-le dans l'application RESERVA Pro pour ouvrir votre espace. Il reste valable ${minutes} minutes.`,
    "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.",
    "",
    "L'équipe RESERVA / AfriSoft",
    "https://reserva-web-b9au.onrender.com/support",
  ].join("\n");
  const html =
    "<p>Bonjour,</p>" +
    "<p>Votre dossier RESERVA Pro est approuvé. Voici votre code d'accès (6 chiffres) :</p>" +
    `<p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p>` +
    `<p>Saisissez-le dans l'application RESERVA Pro pour ouvrir votre espace. Il reste valable ${minutes} minutes.</p>` +
    '<p style="color:#666">Si vous n\'êtes pas à l\'origine de cette demande, ignorez ce message.</p>' +
    '<p>L\'équipe RESERVA / AfriSoft<br/><a href="https://reserva-web-b9au.onrender.com/support">Aide et support</a></p>';
  return { sujet: OBJET_ACTIVATION_PRO, texte, html };
}

export async function envoyerCodeActivationEmail(email: string, code: string, minutes: number) {
  const { sujet, texte, html } = contenuActivationEmail(code, minutes);
  return envoyerEmail({ to: email, sujet, texte, html });
}

export function masquerEmail(email: string): string {
  const [local, domaine] = email.split("@");
  if (!domaine) return "***";
  return `${local.slice(0, 2)}***@${domaine}`;
}

function echapperHtml(valeur: string) {
  return valeur
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
