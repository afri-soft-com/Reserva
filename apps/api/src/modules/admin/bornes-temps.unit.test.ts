import { describe, expect, it } from "vitest";
import { bornesTemps, filtreCreeLe, pointsPeriode } from "../../utils/bornes-temps";

describe("bornesTemps", () => {
  const maintenant = new Date(2026, 10, 3, 15, 0, 0);

  it("ouvre le mois au 1er, sans borne haute", () => {
    const bornes = bornesTemps({ periode: "mois", maintenant });
    expect(bornes.debut?.getDate()).toBe(1);
    expect(bornes.debut?.getMonth()).toBe(10);
    expect(bornes.fin).toBeNull();
    expect(bornes.libelle).toBe("Ce mois-ci");
  });

  it("inclut la fin de journée d'une plage personnalisée", () => {
    const bornes = bornesTemps({
      periode: "personnalisee",
      debut: "2026-01-02",
      fin: "2026-01-05",
      maintenant,
    });
    expect(bornes.debut?.getDate()).toBe(2);
    expect(bornes.debut?.getHours()).toBe(0);
    expect(bornes.fin?.getDate()).toBe(5);
    expect(bornes.fin?.getHours()).toBe(23);
    expect(filtreCreeLe(bornes)?.lte?.getMinutes()).toBe(59);
    expect(bornes.libelle).toContain("2026");
  });

  it("remet les dates dans l'ordre et refuse un jour impossible", () => {
    const inverse = bornesTemps({
      periode: "personnalisee",
      debut: "2026-03-10",
      fin: "2026-03-01",
      maintenant,
    });
    expect(inverse.debut?.getDate()).toBe(1);
    expect(inverse.fin?.getDate()).toBe(10);

    const impossible = bornesTemps({
      periode: "personnalisee",
      debut: "2026-02-31",
      fin: "2026-03-01",
      maintenant,
    });
    expect(impossible.debut).toBeNull();
    expect(impossible.fin?.getDate()).toBe(1);
  });

  it("découpe une plage courte en jours", () => {
    const bornes = bornesTemps({
      periode: "personnalisee",
      debut: "2026-11-01",
      fin: "2026-11-03",
      maintenant,
    });
    const points = pointsPeriode(bornes, { personnalisee: true, mois: 6, maintenant });
    expect(points).toHaveLength(3);
    expect(points[0]?.debut.getDate()).toBe(1);
    expect(points[2]?.debut.getDate()).toBe(3);
  });

  it("remonte en mois quand seule la date de fin est fournie", () => {
    const bornes = bornesTemps({ periode: "personnalisee", fin: "2026-06-15", maintenant });
    const points = pointsPeriode(bornes, { personnalisee: true, mois: 6, maintenant });
    expect(points).toHaveLength(6);
    expect(points[0]?.debut.getMonth()).toBe(0);
    expect(points[5]?.debut.getMonth()).toBe(5);
  });
});
