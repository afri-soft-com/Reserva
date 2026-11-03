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

  it("invariant minForce ≤ minSoft : à jour sur soft → none", () => {
    expect(
      decideModeMiseAJour({
        versionInstallee: "1.0.2",
        minSoft: "1.0.2",
        minForce: "1.0.1",
      })
    ).toBe("none");
    expect(
      decideModeMiseAJour({
        versionInstallee: "1.0.1",
        minSoft: "1.0.2",
        minForce: "1.0.1",
      })
    ).toBe("soft");
  });

  it("à version égale, une build plus ancienne que la dernière publiée voit la bannière", () => {
    const base = { versionInstallee: "1.0.10", minSoft: "1.0.10", minForce: "1.0.8" };
    expect(decideModeMiseAJour({ ...base, buildInstallee: "170", minSoftBuild: "171" })).toBe("soft");
    expect(decideModeMiseAJour({ ...base, buildInstallee: "171", minSoftBuild: "171" })).toBe("none");
    expect(decideModeMiseAJour({ ...base, buildInstallee: 172, minSoftBuild: "171" })).toBe("none");
  });

  it("ignore la build quand elle est inconnue ou que la version diffère", () => {
    const base = { versionInstallee: "1.0.10", minSoft: "1.0.10", minForce: "1.0.8" };
    expect(decideModeMiseAJour({ ...base, buildInstallee: "", minSoftBuild: "171" })).toBe("none");
    expect(decideModeMiseAJour({ ...base, buildInstallee: "170", minSoftBuild: "0" })).toBe("none");
    expect(decideModeMiseAJour({ ...base })).toBe("none");
    expect(
      decideModeMiseAJour({ versionInstallee: "1.0.11", minSoft: "1.0.10", minForce: "1.0.8", buildInstallee: "1", minSoftBuild: "171" }),
    ).toBe("none");
  });
});
