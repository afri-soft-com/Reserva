import { describe, expect, it } from "vitest";
import { telephoneActivationReel } from "./activation.service";
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
