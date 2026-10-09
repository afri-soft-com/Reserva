import { describe, it, expect } from "vitest";
import {
  calculerTarificationReservation,
  calculerPolitiqueAnnulation,
  calculerRemboursement,
  normaliserTelephone,
  genererNumeroReservation,
  schemaCreerReservation,
  schemaInitierPaiement,
  schemaAnnulerReservation,
  schemaConnexionPin,
} from "@reserva/shared";

describe("métier partagé — tarification & annulation", () => {
  it("tarifie une réservation CDF", () => {
    const t = calculerTarificationReservation({
      prixService: 20000,
      devise: "CDF",
      tauxCommissionPourcent: 5,
    });
    expect(t.montantCommission).toBe(1000);
    expect(t.montantTotalClient).toBeGreaterThanOrEqual(20000);
  });

  it("calcule politique annulation remboursable", () => {
    const p = calculerPolitiqueAnnulation({
      remboursable: true,
      delaiAnnulHeures: 48,
      arrivee: "2099-06-15",
      montantTotal: 100,
      devise: "USD",
      maintenant: new Date("2099-06-01T10:00:00"),
    });
    expect(p.remboursable).toBe(true);
    expect(p.frais).toBe(0);
    expect(p.montantRembourse).toBe(100);
  });

  it("calcule politique non remboursable", () => {
    const p = calculerPolitiqueAnnulation({
      remboursable: false,
      delaiAnnulHeures: 24,
      arrivee: "2099-06-15",
      montantTotal: 80,
      devise: "USD",
    });
    expect(p.montantRembourse).toBe(0);
    expect(p.frais).toBe(80);
  });

  it("calcule remboursement partiel / intégral", () => {
    const integral = calculerRemboursement({
      montantPaye: 10000,
      heuresAvantCreneau: 48,
      delaiAnnulationGratuiteHeures: 24,
      fraisAnnulationTardivePourcent: 50,
    });
    expect(integral).toBe(10000);

    const partiel = calculerRemboursement({
      montantPaye: 10000,
      heuresAvantCreneau: 2,
      delaiAnnulationGratuiteHeures: 24,
      fraisAnnulationTardivePourcent: 50,
    });
    expect(partiel).toBe(5000);
  });
});

describe("métier partagé — helpers & schémas", () => {
  it("normalise téléphone RDC", () => {
    expect(normaliserTelephone("0991234567")).toMatch(/243/);
  });

  it("génère un numéro de réservation", () => {
    const n = genererNumeroReservation();
    expect(n.length).toBeGreaterThan(5);
  });

  it("valide schemaCreerReservation", () => {
    const ok = schemaCreerReservation.safeParse({
      serviceId: "11111111-1111-1111-1111-111111111111",
      creneauId: "22222222-2222-2222-2222-222222222222",
    });
    expect(ok.success).toBe(true);

    const ko = schemaCreerReservation.safeParse({ serviceId: "x", creneauId: "y" });
    expect(ko.success).toBe(false);
  });

  it("valide schemaInitierPaiement & annulation", () => {
    expect(
      schemaInitierPaiement.safeParse({
        reservationId: "11111111-1111-1111-1111-111111111111",
        operateur: "MPESA",
        montant: 5000,
      }).success
    ).toBe(true);

    expect(
      schemaAnnulerReservation.safeParse({
        reservationId: "11111111-1111-1111-1111-111111111111",
        motif: "test",
      }).success
    ).toBe(true);
  });

  it("valide connexion PIN", () => {
    expect(schemaConnexionPin.safeParse({ telephone: "+243991234567", pin: "1234" }).success).toBe(true);
    expect(schemaConnexionPin.safeParse({ telephone: "+243991234567", pin: "12" }).success).toBe(false);
  });
});
