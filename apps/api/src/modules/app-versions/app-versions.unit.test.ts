import { describe, expect, it } from "vitest";
import { comparerVersions, decideModeMiseAJour } from "@reserva/shared";

/**
 * Contrat bannières : une version publiée doit déclencher soft/force
 * pour les builds plus anciens (logique partagée web/mobile/API).
 */
describe("seuils de mise à jour (contrat bannières)", () => {
  it("soft dès qu'une nouvelle version est publiée", () => {
    expect(
      decideModeMiseAJour({
        versionInstallee: "1.0.0",
        minSoft: "1.0.1",
        minForce: "0.9.0",
      })
    ).toBe("soft");
  });

  it("none si déjà à jour", () => {
    expect(
      decideModeMiseAJour({
        versionInstallee: "1.0.1",
        minSoft: "1.0.1",
        minForce: "1.0.0",
      })
    ).toBe("none");
  });

  it("force prioritaire sur soft", () => {
    expect(
      decideModeMiseAJour({
        versionInstallee: "0.9.0",
        minSoft: "1.0.1",
        minForce: "1.0.0",
      })
    ).toBe("force");
  });

  it("comparerVersions détecte une hausse de seuil (réaffichage bannière)", () => {
    expect(comparerVersions("1.0.2", "1.0.1")).toBeGreaterThan(0);
  });
});
