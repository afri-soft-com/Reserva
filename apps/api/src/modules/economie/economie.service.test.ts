import { describe, it, expect } from "vitest";
import { calculerTarificationReservation } from "@reserva/shared";

describe("calculerTarificationReservation", () => {
  it("applique 5% de commission sans frais sous le seuil", () => {
    const tarif = calculerTarificationReservation({
      prixService: 15000,
      devise: "CDF",
      tauxCommissionPourcent: 5,
    });
    expect(tarif.montantCommission).toBe(750);
    expect(tarif.montantFraisService).toBe(0);
    expect(tarif.montantNetPrestataire).toBe(14250);
    expect(tarif.montantTotalClient).toBe(15000);
  });

  it("ajoute un frais de service au-delà de 50 USD", () => {
    const tarif = calculerTarificationReservation({
      prixService: 60,
      devise: "USD",
      tauxCommissionPourcent: 3.5,
    });
    expect(tarif.montantCommission).toBe(2.1);
    expect(tarif.montantFraisService).toBe(2);
    expect(tarif.montantTotalClient).toBe(62);
    expect(tarif.montantNetPrestataire).toBe(57.9);
  });

  it("normalise une commission stockée en décimal", () => {
    const tarif = calculerTarificationReservation({
      prixService: 100,
      devise: "USD",
      tauxCommissionPourcent: 0.02,
      fraisServiceSeuilUsd: 200,
    });
    expect(tarif.tauxCommission).toBe(2);
    expect(tarif.montantCommission).toBe(2);
  });
});
