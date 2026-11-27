import { describe, expect, it } from "vitest";
import { destinationsActivation, telephoneActivationReel } from "./activation.service";
import { emailValide } from "../notifications/email.adapter";
import { telephoneSynthetiqueGoogle } from "../auth/google.service";

describe("telephoneActivationReel", () => {
  it("accepte un numéro mobile réel", () => {
    expect(telephoneActivationReel({ telephone: "+243810000111", googleId: null })).toBe(true);
  });

  it("refuse le numéro fictif d'un compte Google", () => {
    const googleId = "google-sub-123";
    expect(
      telephoneActivationReel({
        telephone: telephoneSynthetiqueGoogle(googleId),
        googleId,
      }),
    ).toBe(false);
  });

  it("accepte le vrai numéro d'un compte Google déjà lié", () => {
    expect(
      telephoneActivationReel({
        telephone: "+243812345678",
        googleId: "google-sub-123",
      }),
    ).toBe(true);
  });

  it("refuse un compte sans numéro", () => {
    expect(telephoneActivationReel({ telephone: "  ", googleId: null })).toBe(false);
  });
});

describe("destinationsActivation", () => {
  const telReel = { telephone: "+243810000111", googleId: null, email: null };
  const googleSansTel = {
    telephone: telephoneSynthetiqueGoogle("g-1"),
    googleId: "g-1",
    email: "pro@example.com",
  };

  it("envoie par SMS et e-mail du compte par défaut", () => {
    expect(destinationsActivation({ ...telReel, email: "a@b.cd" })).toEqual({
      telephone: "+243810000111",
      email: "a@b.cd",
    });
  });

  it("compte Google sans numéro réel : e-mail seulement", () => {
    expect(destinationsActivation(googleSansTel)).toEqual({ telephone: null, email: "pro@example.com" });
  });

  it("canal e-mail avec adresse saisie, même sans e-mail sur le compte", () => {
    expect(destinationsActivation(telReel, { canal: "email", email: " moi@exemple.cd " })).toEqual({
      telephone: null,
      email: "moi@exemple.cd",
    });
  });

  it("canal e-mail sans aucune adresse : erreur", () => {
    expect(() => destinationsActivation(telReel, { canal: "email" })).toThrow(/adresse e-mail/);
  });

  it("canal e-mail avec adresse invalide : erreur", () => {
    expect(() => destinationsActivation(telReel, { canal: "email", email: "pas-un-mail" })).toThrow(/invalide/);
  });

  it("canal SMS sans numéro réel : erreur qui propose l'e-mail", () => {
    expect(() => destinationsActivation(googleSansTel, { canal: "sms" })).toThrow(/e-mail/);
  });

  it("canal SMS n'envoie pas d'e-mail", () => {
    expect(destinationsActivation({ ...telReel, email: "a@b.cd" }, { canal: "sms" })).toEqual({
      telephone: "+243810000111",
      email: null,
    });
  });

  it("ni numéro ni e-mail : erreur", () => {
    expect(() => destinationsActivation({ telephone: null, googleId: null, email: null })).toThrow();
  });
});

describe("emailValide", () => {
  it("valide les adresses courantes et refuse le reste", () => {
    expect(emailValide("support@reserva.cd")).toBe(true);
    expect(emailValide("sans-arobase")).toBe(false);
    expect(emailValide("a@b")).toBe(false);
    expect(emailValide(null)).toBe(false);
  });
});
