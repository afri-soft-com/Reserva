import { describe, expect, it } from "vitest";
import { VILLES_RDC } from "@reserva/shared";
import { fusionnerVillesReferentiel } from "./admin.service";

describe("fusionnerVillesReferentiel", () => {
  it("liste toutes les villes du référentiel RDC, pas seulement celles déjà utilisées", () => {
    const villes = fusionnerVillesReferentiel(["Kinshasa", "Lubumbashi"]);
    expect(villes.length).toBeGreaterThan(20);
    expect(villes).toEqual(expect.arrayContaining([...VILLES_RDC]));
    expect(villes).toContain("Goma");
    expect(villes).toContain("Kisangani");
  });

  it("conserve une ville saisie qui n'est pas dans le référentiel", () => {
    const villes = fusionnerVillesReferentiel(["  Kinshasa ", "Cité sur mesure"]);
    expect(villes).toContain("Kinshasa");
    expect(villes).toContain("Cité sur mesure");
    expect(villes.filter((v) => v === "Kinshasa")).toHaveLength(1);
  });
});
