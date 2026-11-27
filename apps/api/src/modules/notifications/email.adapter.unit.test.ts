import { describe, expect, it } from "vitest";
import {
  canauxEmail,
  cibleSmtp,
  envoyerAvecSecours,
  contenuActivationEmail,
  masquerEmail,
  OBJET_ACTIVATION_PRO,
} from "./email.adapter";

describe("cibleSmtp", () => {
  it("mail.afri-soft.com → serveur mutualisé site4now (certificat TLS valide)", () => {
    expect(cibleSmtp("mail.afri-soft.com")).toEqual({
      host: "mail5013.site4now.net",
      servername: "mail5013.site4now.net",
    });
  });

  it("respecte SMTP_TLS_SERVERNAME explicite", () => {
    expect(cibleSmtp("mail.afri-soft.com", "mail9999.site4now.net")).toEqual({
      host: "mail9999.site4now.net",
      servername: "mail9999.site4now.net",
    });
  });

  it("laisse un fournisseur classique inchangé", () => {
    expect(cibleSmtp("smtp-relay.brevo.com")).toEqual({
      host: "smtp-relay.brevo.com",
      servername: "smtp-relay.brevo.com",
    });
  });
});

describe("contenuActivationEmail", () => {
  it("contient le code et la durée, sans mots bloqués par l'anti-spam dans l'objet", () => {
    const { sujet, texte, html } = contenuActivationEmail("482913", 5);
    expect(sujet).toBe(OBJET_ACTIVATION_PRO);
    expect(sujet).not.toMatch(/otp|code|pin/i);
    expect(texte).toContain("482913");
    expect(texte).toContain("5 minutes");
    expect(html).toContain("482913");
  });
});

describe("masquerEmail", () => {
  it("masque la partie locale", () => {
    expect(masquerEmail("celestin@example.com")).toBe("ce***@example.com");
    expect(masquerEmail("invalide")).toBe("***");
  });
});

describe("canauxEmail", () => {
  it("SMTP d'abord, Resend en secours", () => {
    expect(canauxEmail({ smtpPret: true, resendPret: true })).toEqual(["smtp", "resend"]);
    expect(canauxEmail({ smtpPret: false, resendPret: true })).toEqual(["resend"]);
    expect(canauxEmail({ smtpPret: true, resendPret: false })).toEqual(["smtp"]);
    expect(canauxEmail({ smtpPret: false, resendPret: false })).toEqual([]);
  });
});

describe("envoyerAvecSecours", () => {
  it("SMTP qui marche : Resend n'est pas appelé", async () => {
    const appels: string[] = [];
    const r = await envoyerAvecSecours(["smtp", "resend"], async (c) => {
      appels.push(c);
    });
    expect(r).toEqual({ canal: "smtp", echecs: [] });
    expect(appels).toEqual(["smtp"]);
  });

  it("SMTP en échec (ex. 550 anti-spam) : bascule automatique sur Resend", async () => {
    const journal: string[] = [];
    const r = await envoyerAvecSecours(
      ["smtp", "resend"],
      async (c) => {
        if (c === "smtp") throw new Error("550 This message was marked as spam");
      },
      (c, e) => journal.push(`${c}: ${e.message}`),
    );
    expect(r).toEqual({ canal: "resend", echecs: ["smtp"] });
    expect(journal).toEqual(["smtp: 550 This message was marked as spam"]);
  });

  it("les deux en échec : aucun canal, échecs listés", async () => {
    const r = await envoyerAvecSecours(["smtp", "resend"], async () => {
      throw new Error("indisponible");
    });
    expect(r).toEqual({ canal: null, echecs: ["smtp", "resend"] });
  });
});
