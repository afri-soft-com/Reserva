import { describe, expect, it } from "vitest";
import { motifRefusGarantie } from "./garantie";

const debut = new Date("2026-06-01T10:00:00.000Z");

function etat(partiel: Partial<Parameters<typeof motifRefusGarantie>[0]> = {}) {
  return {
    garantieActive: true,
    garantieUtilisee: false,
    statut: "CONFIRMEE",
    statutPaiement: "PAYE",
    montantPaye: 15000,
    creneauDebut: debut,
    ...partiel,
  };
}

describe("motifRefusGarantie", () => {
  it("refuse avant les 2 heures suivant le créneau", () => {
    const maintenant = new Date(debut.getTime() + 60 * 60 * 1000);
    expect(motifRefusGarantie(etat(), maintenant)).toMatch(/2 heures/);
  });

  it("accepte une réservation confirmée payée après 2 heures", () => {
    const maintenant = new Date(debut.getTime() + 3 * 60 * 60 * 1000);
    expect(motifRefusGarantie(etat(), maintenant)).toBeNull();
  });

  it("refuse un no-show client, une prestation entamée ou déjà terminée", () => {
    const maintenant = new Date(debut.getTime() + 5 * 60 * 60 * 1000);
    expect(motifRefusGarantie(etat({ statut: "ABSENCE" }), maintenant)).toMatch(/statut/);
    expect(motifRefusGarantie(etat({ statut: "EN_COURS" }), maintenant)).toMatch(/statut/);
    expect(motifRefusGarantie(etat({ statut: "TERMINEE" }), maintenant)).toMatch(/statut/);
  });

  it("refuse sans paiement", () => {
    const maintenant = new Date(debut.getTime() + 3 * 60 * 60 * 1000);
    expect(motifRefusGarantie(etat({ statutPaiement: "EN_ATTENTE", montantPaye: 0 }), maintenant)).toMatch(/payées|payé/);
  });
});
