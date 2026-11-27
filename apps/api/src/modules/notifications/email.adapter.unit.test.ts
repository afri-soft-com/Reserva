import { describe, expect, it } from "vitest";
import {
  cibleSmtp,
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
